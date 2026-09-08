#!/usr/bin/env node
/*
 * Capture Chrome Web Store screenshots (1280×800) of the extension popup.
 *
 * Usage:
 *   npm i --no-save puppeteer-core
 *   node scripts/store-screenshots.js [--target=https://github.blog/] [--browser=/path/to/Chromium]
 *
 * Google Chrome 137+ no longer honours --load-extension, so this defaults to
 * Brave (or pass --browser pointing at Chromium / Chrome for Testing).
 *
 * How it works: the popup normally reads the active tab, which a scripted
 * browser cannot "click" into. So this builds a throwaway copy of the
 * extension in a temp dir that (a) queries the target URL instead of the
 * active tab and (b) declares the tabs + host permissions that query needs.
 * The real extension is never modified. Output goes to docs/store-assets/.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

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
const OUT = path.join(ROOT, 'docs', 'store-assets');
const TARGET = args.target || 'https://github.blog/';
const BROWSER = args.browser
  || process.env.BROWSER_PATH
  || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
const HEADLESS = args.headless ? 'new' : false;

const sleep = ms => new Promise(r => setTimeout(r, ms));

function buildTestExtension() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'og-tester-ext-'));
  for (const f of ['manifest.json', 'popup.html', 'popup.css', 'popup.js']) {
    fs.copyFileSync(path.join(ROOT, f), path.join(dir, f));
  }
  fs.cpSync(path.join(ROOT, 'icons'), path.join(dir, 'icons'), { recursive: true });

  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  manifest.permissions = [...new Set([...(manifest.permissions || []), 'tabs'])];
  manifest.host_permissions = [new URL(TARGET).origin + '/*'];
  manifest.background = { service_worker: 'bg.js' }; // gives us a target that reveals the extension id
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(dir, 'bg.js'), '// test-only worker\n');

  const needle = 'chrome.tabs.query({ active: true, currentWindow: true })';
  let js = fs.readFileSync(path.join(dir, 'popup.js'), 'utf8');
  if (!js.includes(needle)) throw new Error('popup.js no longer matches the expected tabs.query call; update this script.');
  js = js.replace(needle, `chrome.tabs.query({ url: ${JSON.stringify(TARGET + '*')} })`);
  fs.writeFileSync(path.join(dir, 'popup.js'), js);
  return dir;
}

function frameHtml(pngPath, caption) {
  const b64 = fs.readFileSync(pngPath).toString('base64');
  return `<!doctype html><html><head><style>
    html,body{margin:0;width:1280px;height:800px;overflow:hidden}
    body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;
      background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 60%,#1877f2 100%);
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
    .frame{max-height:660px;border-radius:12px;box-shadow:0 24px 60px rgba(0,0,0,.45);overflow:hidden;background:#fff}
    .frame img{display:block;width:600px;height:auto;max-height:660px;object-fit:cover;object-position:top}
    .cap{color:#fff;font-size:22px;font-weight:600;letter-spacing:.2px;text-shadow:0 1px 2px rgba(0,0,0,.3)}
  </style></head><body>
    <div class="frame"><img src="data:image/png;base64,${b64}"></div>
    <div class="cap">${caption.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</div>
  </body></html>`;
}

(async () => {
  const ext = buildTestExtension();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'og-tester-profile-'));
  const raw = fs.mkdtempSync(path.join(os.tmpdir(), 'og-tester-raw-'));
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: BROWSER,
    headless: HEADLESS,
    userDataDir: profile,
    args: [
      `--disable-extensions-except=${ext}`,
      `--load-extension=${ext}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--window-size=1400,900'
    ]
  });

  try {
    const sw = await browser.waitForTarget(
      t => t.type() === 'service_worker' && t.url().startsWith('chrome-extension://'),
      { timeout: 15000 }
    ).catch(() => { throw new Error(`Extension did not load. Is ${BROWSER} a Chromium build that still supports --load-extension?`); });
    const extId = new URL(sw.url()).host;

    const site = await browser.newPage();
    await site.setViewport({ width: 1280, height: 800 });
    await site.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 45000 });
    console.log('Target loaded:', await site.title());

    const popup = await browser.newPage();
    await popup.setViewport({ width: 600, height: 600, deviceScaleFactor: 2 });
    await popup.goto(`chrome-extension://${extId}/popup.html`, { waitUntil: 'load' });
    await popup.waitForSelector('.card, .error', { timeout: 15000 });
    const err = await popup.$('.error');
    if (err) throw new Error('Popup error: ' + await popup.evaluate(e => e.textContent, err));
    await popup.waitForFunction(
      () => [...document.querySelectorAll('.image-meta')].every(e => !/checking/.test(e.textContent)),
      { timeout: 20000 }
    ).catch(() => {});

    const shots = [
      { tab: 'previews', file: '01-previews.png', caption: 'See exactly how the page unfurls on Facebook, X, and Slack' },
      { tab: 'previews', file: '02-x-card.png', caption: 'X and Slack cards rendered from the real tags and image', scrollTo: '.card.x-large, .card.x-summary' },
      { tab: 'og', file: '03-open-graph.png', caption: 'Per-tag validation with a clear reason for every warning' },
      { tab: 'fix', file: '04-fix-prompt.png', caption: 'One click: an AI-ready prompt that returns corrected <head> tags' }
    ];

    const composer = await browser.newPage();
    await composer.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });

    for (const s of shots) {
      // Headed Chromium will not screenshot a background tab, so foreground each page before capturing.
      await popup.bringToFront();
      await popup.click(`.tab[data-tab="${s.tab}"]`);
      await sleep(400);
      if (s.scrollTo) {
        await popup.evaluate(sel => {
          const el = document.querySelector(sel);
          const section = el && el.closest('.preview-section');
          if (section) document.querySelector('main').scrollTop = section.offsetTop - 12;
        }, s.scrollTo);
        await sleep(200);
      }
      const h = await popup.evaluate(() => Math.ceil(document.body.getBoundingClientRect().height));
      await popup.setViewport({ width: 600, height: Math.min(600, h), deviceScaleFactor: 2 });
      await sleep(150);
      const rawPath = path.join(raw, s.file);
      await popup.screenshot({ path: rawPath });

      await composer.bringToFront();
      await composer.setContent(frameHtml(rawPath, s.caption), { waitUntil: 'load' });
      await sleep(200);
      const outPath = path.join(OUT, s.file);
      await composer.screenshot({ path: outPath, clip: { x: 0, y: 0, width: 1280, height: 800 } });
      console.log('Wrote', path.relative(ROOT, outPath));
    }
  } finally {
    await browser.close();
    fs.rmSync(ext, { recursive: true, force: true });
    fs.rmSync(profile, { recursive: true, force: true });
    fs.rmSync(raw, { recursive: true, force: true });
  }
})().catch(e => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
