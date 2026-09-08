#!/usr/bin/env node
/*
 * Smoke-test a packaged build before uploading it to the Chrome Web Store.
 *
 * Unpacks the zip, loads it into a throwaway browser profile, opens a real
 * page, and drives every tab of the popup — catching anything that only shows
 * up in the packaged artifact (a file missing from the zip, a bad path, a
 * runtime error) rather than in the working tree.
 *
 * Usage:
 *   npm i --no-save puppeteer-core
 *   node scripts/verify-release.js                     # downloads the latest GitHub release (needs gh)
 *   node scripts/verify-release.js --zip=dist/foo.zip  # verifies a local zip
 *   node scripts/verify-release.js --tag=v0.1.0
 *
 * Google Chrome 137+ dropped --load-extension, so this defaults to Brave.
 * Pass --browser=/path/to/Chromium to use something else.
 * Exits non-zero if anything fails, so CI or a release script can gate on it.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

let puppeteer;
try {
  puppeteer = require('puppeteer-core');
} catch {
  console.error('puppeteer-core is not installed. Run: npm i --no-save puppeteer-core');
  process.exit(1);
}

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)=(.*)$/);
  return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
}));

const ROOT = path.resolve(__dirname, '..');
const TARGET = args.target || 'https://github.blog/';
const BROWSER = args.browser
  || process.env.BROWSER_PATH
  || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
const TABS = ['previews', 'og', 'twitter', 'seo', 'all', 'fix'];
const sleep = ms => new Promise(r => setTimeout(r, ms));

function resolveZip(workDir) {
  if (args.zip) {
    const p = path.resolve(ROOT, args.zip);
    if (!fs.existsSync(p)) throw new Error(`No such zip: ${p}`);
    return p;
  }
  const tag = args.tag || '';
  console.log(`Downloading ${tag || 'latest'} release via gh…`);
  execFileSync('gh', ['release', 'download', ...(tag ? [tag] : []), '-D', workDir, '-p', '*.zip'], { stdio: 'inherit' });
  const found = fs.readdirSync(workDir).find(f => f.endsWith('.zip'));
  if (!found) throw new Error('Release contained no zip asset.');
  return path.join(workDir, found);
}

/*
 * A scripted browser has no user-clicked "active tab", and the popup reads
 * exactly that. So the unpacked copy is shimmed to query the target URL and
 * granted the permissions that query needs. The shipped manifest is captured
 * first and asserted below, so these test-only edits cannot mask a bad build.
 */
function shimForAutomation(dir) {
  const m = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  const shipped = {
    version: m.version,
    manifest_version: m.manifest_version,
    permissions: [...(m.permissions || [])],
    minimum_chrome_version: m.minimum_chrome_version,
    icons: Object.keys(m.icons || {})
  };
  m.permissions = [...new Set([...(m.permissions || []), 'tabs'])];
  m.host_permissions = [new URL(TARGET).origin + '/*'];
  m.background = { service_worker: 'bg.js' };
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(m, null, 2));
  fs.writeFileSync(path.join(dir, 'bg.js'), '// test-only worker\n');

  const needle = 'chrome.tabs.query({ active: true, currentWindow: true })';
  let js = fs.readFileSync(path.join(dir, 'popup.js'), 'utf8');
  if (!js.includes(needle)) throw new Error('popup.js no longer matches the expected tabs.query call; update this script.');
  js = js.replace(needle, `chrome.tabs.query({ url: ${JSON.stringify(TARGET + '*')} })`);
  fs.writeFileSync(path.join(dir, 'popup.js'), js);
  return shipped;
}

(async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'og-verify-'));
  const ext = path.join(work, 'ext');
  const profile = path.join(work, 'profile');
  fs.mkdirSync(ext);
  fs.mkdirSync(profile);

  const zip = resolveZip(work);
  execFileSync('unzip', ['-q', zip, '-d', ext]);
  console.log('Verifying', path.basename(zip));

  const problems = [];

  // Static checks on the packaged bytes, before any browser is involved.
  const entries = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).split('\n').filter(Boolean);
  const stray = entries.filter(e => /\.DS_Store|__MACOSX|node_modules|\.git|\.rex/.test(e));
  if (stray.length) problems.push('zip contains stray files: ' + stray.join(', '));
  for (const required of ['manifest.json', 'popup.html', 'popup.css', 'popup.js']) {
    if (!entries.includes(required)) problems.push(`zip is missing ${required}`);
  }

  const shipped = shimForAutomation(ext);
  console.log('Shipped manifest:', JSON.stringify(shipped));
  if (shipped.manifest_version !== 3) problems.push('manifest_version is not 3');
  if (!/^\d+\.\d+\.\d+$/.test(shipped.version || '')) problems.push(`version "${shipped.version}" is not X.Y.Z`);
  const extraPerms = shipped.permissions.filter(p => !['activeTab', 'scripting'].includes(p));
  if (extraPerms.length) problems.push('unexpected permissions in shipped manifest: ' + extraPerms.join(', '));
  for (const size of ['16', '32', '48', '128']) {
    if (!shipped.icons.includes(size)) problems.push(`manifest declares no ${size}px icon`);
  }

  const browser = await puppeteer.launch({
    executablePath: BROWSER,
    headless: false, // headed: extensions and screenshots of foreground pages need a real window
    userDataDir: profile,
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, '--no-first-run', '--no-default-browser-check']
  });

  try {
    const sw = await browser.waitForTarget(
      t => t.type() === 'service_worker' && t.url().startsWith('chrome-extension://'),
      { timeout: 15000 }
    ).catch(() => { throw new Error(`Extension did not load. Is ${BROWSER} a Chromium build that still supports --load-extension?`); });
    const extId = new URL(sw.url()).host;

    const site = await browser.newPage();
    await site.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 45000 });

    const popup = await browser.newPage();
    await popup.setViewport({ width: 600, height: 600 });
    const consoleErrors = [];
    popup.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    popup.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));

    await popup.goto(`chrome-extension://${extId}/popup.html`, { waitUntil: 'load' });
    await popup.bringToFront();
    await popup.waitForSelector('.card, .error', { timeout: 15000 });
    if (await popup.$('.error')) {
      problems.push('popup showed an error state: ' + await popup.$eval('.error', e => e.textContent.trim()));
    }

    for (const tab of TABS) {
      await popup.click(`.tab[data-tab="${tab}"]`);
      await sleep(300);
      const info = await popup.evaluate(() => {
        const c = document.getElementById('content');
        return {
          blocks: c.querySelectorAll('.field-row, .tag-row, .preview-section, .fix-prompt').length,
          length: c.innerHTML.length,
          leak: /undefined|NaN|\[object Object\]/.test(c.textContent)
        };
      });
      if (info.blocks === 0 || info.length < 100) problems.push(`${tab} tab rendered nothing`);
      if (info.leak) problems.push(`${tab} tab leaked undefined/NaN/[object Object] into the UI`);
      if (tab === 'fix') {
        const len = await popup.$eval('#fix-prompt', e => e.value.length).catch(() => 0);
        if (len < 400) problems.push(`fix prompt is suspiciously short (${len} chars)`);
        console.log(`  fix prompt: ${len} chars`);
      }
      console.log(`  ${tab.padEnd(9)} ${String(info.blocks).padStart(3)} blocks`);
    }

    await popup.click('.tab[data-tab="all"]');
    await sleep(250);
    const before = await popup.$$eval('.tag-row', e => e.length);
    await popup.type('#all-filter', 'og:');
    await sleep(350);
    const after = await popup.$$eval('.tag-row', e => e.length);
    if (!(after > 0 && after < before)) problems.push(`All-tab filter did not narrow rows (${before} -> ${after})`);
    console.log(`  filter:    ${before} -> ${after} rows`);

    if (consoleErrors.length) problems.push('console errors: ' + consoleErrors.slice(0, 3).join(' | '));
  } finally {
    await browser.close();
    fs.rmSync(work, { recursive: true, force: true });
  }

  if (problems.length) {
    console.error('\nFAILED:\n- ' + problems.join('\n- '));
    process.exit(1);
  }
  console.log('\nOK — packaged build loads and every tab works.');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
