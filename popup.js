const contentEl = document.getElementById('content');
const urlEl = document.getElementById('page-url');
const refreshBtn = document.getElementById('refresh-btn');
const tabs = document.querySelectorAll('.tab');

let pageData = null;
let activeTab = 'previews';
let cacheBust = 0;
let allFilter = '';

function selectTab(t) {
  tabs.forEach(x => {
    const on = x === t;
    x.classList.toggle('active', on);
    x.setAttribute('aria-selected', on ? 'true' : 'false');
    x.tabIndex = on ? 0 : -1;
  });
  activeTab = t.dataset.tab;
  render();
}

tabs.forEach((t, i) => {
  t.addEventListener('click', () => selectTab(t));
  t.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    next.focus();
    selectTab(next);
  });
});

refreshBtn.addEventListener('click', async () => {
  cacheBust = Date.now();
  refreshBtn.disabled = true;
  refreshBtn.classList.add('refreshing');
  try {
    await init();
  } finally {
    refreshBtn.disabled = false;
    setTimeout(() => refreshBtn.classList.remove('refreshing'), 400);
  }
});

init();

async function init() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab');
    if (!/^https?:/.test(tab.url || '')) {
      urlEl.textContent = tab.url || '';
      contentEl.innerHTML = `<div class="error">This page can't be inspected. Only http:// and https:// pages are supported (not chrome://, file://, the Web Store, or other extensions).</div>`;
      return;
    }
    urlEl.textContent = tab.url;
    urlEl.title = tab.url;
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapePage
    });
    if (!result) throw new Error('The page returned no data. Try reloading it.');
    pageData = result;
    render();
  } catch (err) {
    const msg = /cannot access|cannot be scripted|extensions gallery/i.test(err.message || '')
      ? 'Chrome does not allow extensions to read this page.'
      : err.message;
    contentEl.innerHTML = `<div class="error">Failed to read page: ${escapeHtml(msg)}</div>`;
  }
}

// Runs in the page context.
function scrapePage() {
  const metas = [...document.querySelectorAll('meta')].map(m => {
    const attrs = {};
    for (const a of m.attributes) attrs[a.name] = a.value.trim();
    return attrs;
  });
  const links = [...document.querySelectorAll('link[rel]')].map(l => ({
    rel: l.getAttribute('rel'),
    href: l.href,
    type: l.getAttribute('type') || null,
    sizes: l.getAttribute('sizes') || null
  }));
  return {
    url: location.href,
    title: (document.title || '').trim(),
    lang: document.documentElement.lang || null,
    metas,
    links
  };
}

function render() {
  if (!pageData) return;
  const renderers = {
    previews: renderPreviews,
    og: renderOpenGraph,
    twitter: renderTwitter,
    seo: renderSEO,
    all: renderAll,
    fix: renderFix
  };
  contentEl.innerHTML = renderers[activeTab](pageData);
  attachCopyHandlers();
  attachImageHandlers();
  attachPromptCopyHandler();
  attachFilterHandler();
  loadImageMeta();
  updateTabBadges();
}

// --- Helpers ---

function getMeta(metas, predicate) {
  return metas.find(predicate) || null;
}

function metaByProperty(metas, prop) {
  return getMeta(metas, m => m.property === prop);
}

function metaByName(metas, name) {
  return getMeta(metas, m => m.name === name);
}

// Twitter tags can use either name or property in the wild.
function metaByTwitter(metas, key) {
  return getMeta(metas, m => m.name === key || m.property === key);
}

function countOg(metas, prop) {
  return metas.filter(m => m.property === prop).length;
}

function countTwitter(metas, key) {
  return metas.filter(m => m.name === key || m.property === key).length;
}

function findLink(links, relPattern) {
  return links.find(l => relPattern.test(l.rel || '')) || null;
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveUrl(maybeUrl, base) {
  if (!maybeUrl) return null;
  try { return new URL(maybeUrl, base).href; } catch { return maybeUrl; }
}

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.href.replace(/\/$/, '');
  } catch {
    return url || '';
  }
}

function bustCache(url) {
  if (!url || !cacheBust) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('_cb', String(cacheBust));
    return u.href;
  } catch {
    return url + (url.includes('?') ? '&' : '?') + '_cb=' + cacheBust;
  }
}

function truncate(s, n) {
  s = String(s);
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

// --- Validation ---

const OK = { level: 'ok', text: 'present' };
const MISSING = { level: 'bad', text: 'missing' };
const TWITTER_CARD_TYPES = ['summary', 'summary_large_image', 'app', 'player'];
const OG_TYPE_RE = /^(website|article|book|profile|music\.(song|album|playlist|radio_station)|video\.(movie|episode|tv_show|other))$/i;

function validateLength(value, min, max) {
  if (!value) return MISSING;
  const len = value.length;
  if (len < min) return { level: 'warn', text: `${len} chars (min ~${min})` };
  if (len > max) return { level: 'warn', text: `${len} chars (max ~${max})` };
  return { level: 'ok', text: `${len} chars` };
}

function validatePresent(value) {
  return value ? OK : MISSING;
}

function hasImageExtension(url) {
  try {
    return /\.(jpe?g|png|gif|webp|svg|avif)$/i.test(new URL(url).pathname);
  } catch {
    return /\.(jpe?g|png|gif|webp|svg|avif)(?:[?#]|$)/i.test(url || '');
  }
}

function isAbsoluteHttpUrl(value) {
  try { return /^https?:$/.test(new URL(value).protocol); } catch { return false; }
}

function validateAbsoluteUrl(value) {
  if (!value) return MISSING;
  if (!isAbsoluteHttpUrl(value)) return { level: 'warn', text: 'should be an absolute http(s) URL' };
  return OK;
}

function validateImageUrl(value) {
  if (!value) return MISSING;
  if (!isAbsoluteHttpUrl(value)) return { level: 'warn', text: 'should be an absolute http(s) URL (scrapers ignore relative paths)' };
  if (value.startsWith('http:')) return { level: 'warn', text: 'served over http; use https so it is not blocked' };
  if (/\.svg$/i.test(new URL(value).pathname)) return { level: 'warn', text: 'SVG is not supported by most social scrapers; use .jpg/.png/.webp' };
  if (!hasImageExtension(value)) return { level: 'warn', text: 'no file extension (use .jpg/.png/.webp)' };
  return OK;
}

function validateRobots(value) {
  if (!value) return { level: 'ok', text: 'default (index, follow)' };
  if (/\b(noindex|none)\b/i.test(value)) return { level: 'warn', text: `${value} — page will not be indexed` };
  return { level: 'ok', text: value };
}

function validateOneOf(value, allowed) {
  if (!value) return MISSING;
  return allowed.includes(value.toLowerCase())
    ? OK
    : { level: 'warn', text: `unknown value (expected ${allowed.join(', ')})` };
}

function validateOgType(value) {
  if (!value) return MISSING;
  return OG_TYPE_RE.test(value) ? OK : { level: 'warn', text: 'non-standard type (website or article is safest)' };
}

function validateLocale(value) {
  if (!value) return MISSING;
  return /^[a-z]{2,3}_[A-Z]{2}$/.test(value) ? OK : { level: 'warn', text: 'expected format like en_US' };
}

function validateHandle(value) {
  if (!value) return MISSING;
  return /^@[A-Za-z0-9_]{1,15}$/.test(value) ? OK : { level: 'warn', text: 'should be an @handle' };
}

function validateInteger(value) {
  if (!value) return MISSING;
  return /^\d+$/.test(value) ? OK : { level: 'warn', text: 'should be a whole number of pixels' };
}

function validateCanonical(value, pageUrl) {
  if (!value) return MISSING;
  if (!isAbsoluteHttpUrl(value)) return { level: 'warn', text: 'should be an absolute http(s) URL' };
  if (normalizeUrl(value) !== normalizeUrl(pageUrl)) return { level: 'warn', text: 'differs from the current URL — make sure that is intentional' };
  return { level: 'ok', text: 'matches page URL' };
}

function validateFavicon(value) {
  return value ? OK : { level: 'warn', text: 'none declared (browsers fall back to /favicon.ico)' };
}

// --- Tab: Open Graph ---

function ogFields() {
  return [
    { key: 'og:title', required: true, validate: v => validateLength(v, 30, 90) },
    { key: 'og:type', required: true, validate: validateOgType, note: 'e.g. website, article' },
    { key: 'og:image', required: true, validate: validateImageUrl, note: '1200×630 recommended' },
    { key: 'og:url', required: true, validate: validateAbsoluteUrl },
    { key: 'og:description', required: false, validate: v => validateLength(v, 50, 200) },
    { key: 'og:site_name', required: false, validate: validatePresent },
    { key: 'og:locale', required: false, validate: validateLocale },
    { key: 'og:image:alt', required: false, validate: validatePresent },
    { key: 'og:image:width', required: false, validate: validateInteger },
    { key: 'og:image:height', required: false, validate: validateInteger },
    { key: 'og:logo', required: false, validate: validateImageUrl, note: 'site logo URL' }
  ];
}

function renderOpenGraph(data) {
  return renderFieldList('Open Graph', ogFields(),
    k => metaByProperty(data.metas, k)?.content,
    k => countOg(data.metas, k));
}

// --- Tab: Twitter ---

function twitterFields() {
  return [
    { key: 'twitter:card', required: true, validate: v => validateOneOf(v, TWITTER_CARD_TYPES), note: 'summary, summary_large_image, app, player' },
    { key: 'twitter:title', required: false, validate: v => validateLength(v, 30, 70), note: 'falls back to og:title' },
    { key: 'twitter:description', required: false, validate: v => validateLength(v, 50, 200), note: 'falls back to og:description' },
    { key: 'twitter:image', required: false, validate: validateImageUrl, note: 'falls back to og:image' },
    { key: 'twitter:image:alt', required: false, validate: validatePresent },
    { key: 'twitter:site', required: false, validate: validateHandle, note: '@username of website' },
    { key: 'twitter:creator', required: false, validate: validateHandle, note: '@username of author' }
  ];
}

function renderTwitter(data) {
  return renderFieldList('Twitter Card', twitterFields(),
    k => metaByTwitter(data.metas, k)?.content,
    k => countTwitter(data.metas, k));
}

// --- Tab: SEO ---

function seoChecks(data) {
  const charset = data.metas.find(m => m.charset)?.charset
    || data.metas.find(m => (m['http-equiv'] || '').toLowerCase() === 'content-type')?.content;
  const favicon = findLink(data.links, /(^|\s)(icon|shortcut icon|apple-touch-icon)(\s|$)/i)?.href;
  return [
    { field: '<title>', label: 'title', value: data.title, validate: v => validateLength(v, 10, 60), note: '10–60 chars recommended' },
    { field: 'meta description', label: 'description', value: metaByName(data.metas, 'description')?.content, validate: v => validateLength(v, 50, 160), note: '50–160 chars recommended' },
    { field: 'link[rel=canonical]', label: 'canonical', value: data.links.find(l => l.rel === 'canonical')?.href, validate: v => validateCanonical(v, data.url) },
    { field: 'meta robots', label: 'robots', value: metaByName(data.metas, 'robots')?.content, validate: validateRobots },
    { field: 'meta viewport', label: 'viewport', value: metaByName(data.metas, 'viewport')?.content, validate: validatePresent },
    { field: 'charset', label: 'charset', value: charset, validate: validatePresent },
    { field: 'html[lang]', label: 'lang', value: data.lang, validate: validatePresent, note: 'on <html> element' },
    { field: 'link[rel=icon]', label: 'favicon', value: favicon, validate: validateFavicon }
  ];
}

function renderSEO(data) {
  const rows = seoChecks(data).map(c => renderFieldRow(c.label, c.value, c.validate(c.value), c.note));
  return `<div class="section">
    <div class="section-title">SEO Essentials</div>
    ${rows.join('')}
  </div>`;
}

// --- Tab: All ---

function renderAll(data) {
  const entries = [];

  entries.push(['title', data.title]);
  if (data.lang) entries.push(['html[lang]', data.lang]);

  for (const m of data.metas) {
    const key = m.property || m.name || m['http-equiv'] || (m.charset ? 'charset' : '(meta)');
    const value = m.content || m.charset || '';
    entries.push([key, value]);
  }

  for (const l of data.links) {
    const sub = [l.type, l.sizes].filter(Boolean).join(' · ');
    const key = sub ? `link[${l.rel}] ${sub}` : `link[${l.rel}]`;
    entries.push([key, l.href]);
  }

  const q = allFilter.trim().toLowerCase();
  const shown = q
    ? entries.filter(([k, v]) => k.toLowerCase().includes(q) || String(v || '').toLowerCase().includes(q))
    : entries;
  const rows = shown.map(([k, v]) => tagRow(k, v));
  const count = q ? `${shown.length} of ${entries.length}` : String(entries.length);

  return `<div class="section">
    <div class="section-title">All Tags <span class="count">${escapeHtml(count)}</span></div>
    <input class="filter-input" id="all-filter" type="search" placeholder="Filter by name or value…" value="${escapeHtml(allFilter)}" aria-label="Filter tags" autocomplete="off">
    <div class="tag-list">${rows.join('') || '<div class="empty">No tags match.</div>'}</div>
  </div>`;
}

function attachFilterHandler() {
  const input = contentEl.querySelector('#all-filter');
  if (!input) return;
  input.addEventListener('input', () => {
    allFilter = input.value;
    const pos = input.selectionStart;
    render();
    const next = contentEl.querySelector('#all-filter');
    if (next) {
      next.focus();
      next.setSelectionRange(pos, pos);
    }
  });
}

// --- Tab: Fix (LLM prompt) ---

function renderFix(data) {
  const { prompt, issueCount } = buildFixPrompt(data);
  const summary = issueCount === 0
    ? 'No issues detected — the prompt below still includes the current state if you want a second opinion.'
    : `${issueCount} issue${issueCount === 1 ? '' : 's'} detected. Copy the prompt below and paste it into any LLM (Claude, ChatGPT, etc.) to get drop-in replacement tags.`;

  return `<div class="section">
    <div class="section-title">LLM Fix Prompt</div>
    <p class="fix-summary">${escapeHtml(summary)}</p>
    <div class="fix-actions">
      <button class="copy-prompt-btn" data-copy-prompt>Copy prompt</button>
    </div>
    <textarea class="fix-prompt" id="fix-prompt" readonly spellcheck="false" aria-label="Generated prompt">${escapeHtml(prompt)}</textarea>
  </div>`;
}

function buildFixPrompt(data) {
  const issues = collectIssues(data);
  const currentTags = collectCurrentTags(data);

  const lines = [];
  lines.push('You are an SEO and social-sharing meta tag expert. Audit the page below and produce a complete, drop-in replacement set of <meta> and <link> tags that resolve every issue listed.');
  lines.push('');
  lines.push('## Page');
  lines.push(`- URL: ${data.url}`);
  lines.push(`- <title>: ${data.title || '(missing)'}`);
  lines.push(`- <html lang>: ${data.lang || '(missing)'}`);
  lines.push('');
  lines.push('## Current relevant tags');
  if (currentTags.length === 0) {
    lines.push('(none of the audited tags are present)');
  } else {
    for (const t of currentTags) lines.push(`- ${t}`);
  }
  lines.push('');
  lines.push('## Issues to resolve');
  if (issues.length === 0) {
    lines.push('(no issues detected — please still suggest any improvements you would make)');
  } else {
    for (const i of issues) {
      lines.push(`- [${i.severity}] ${i.field}: ${i.message}`);
    }
  }
  lines.push('');
  lines.push('## Output requirements');
  lines.push('1. Return a single fenced HTML block containing every <meta>/<link>/<title> tag that should appear in <head>, in the order they should appear.');
  lines.push('2. Fill in plausible, high-quality values inferred from the page URL and existing content. If you genuinely cannot infer a value, use a clearly-marked TODO placeholder like content="TODO: short description (50–160 chars)".');
  lines.push('3. Respect recommended length ranges: <title> 10–60 chars, meta description 50–160, og:title 30–90, og:description 50–200, twitter:title ≤70.');
  lines.push('4. Always include: <title>, meta description, canonical, viewport, charset, og:title, og:type, og:image (1200×630 recommended), og:image:width, og:image:height, og:image:alt, og:url, og:description, og:site_name, og:locale, og:logo, twitter:card (summary_large_image when an image is present), twitter:title, twitter:description, twitter:image, twitter:image:alt.');
  lines.push('5. All image URLs (og:image, og:logo, twitter:image) MUST be absolute https URLs ending in an explicit file extension (.jpg, .jpeg, .png, .webp, .gif, or .avif). Some scrapers reject relative or extensionless URLs, and most do not render SVG.');
  lines.push('6. Emit each tag exactly once — remove duplicates, since scrapers only honour the first occurrence.');
  lines.push('7. After the HTML block, add a short bulleted "Notes" section explaining any non-obvious choices and listing every TODO the user still needs to fill in.');
  return { prompt: lines.join('\n'), issueCount: issues.length };
}

function collectCurrentTags(data) {
  const out = [];
  const wanted = [
    'description', 'robots', 'viewport',
    'og:title', 'og:type', 'og:image', 'og:url', 'og:description',
    'og:site_name', 'og:locale', 'og:image:alt', 'og:image:width', 'og:image:height', 'og:logo',
    'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image',
    'twitter:image:alt', 'twitter:site', 'twitter:creator'
  ];
  for (const key of wanted) {
    let value = null;
    if (key.startsWith('og:')) value = metaByProperty(data.metas, key)?.content;
    else if (key.startsWith('twitter:')) value = metaByTwitter(data.metas, key)?.content;
    else value = metaByName(data.metas, key)?.content;
    if (value) out.push(`${key} = ${value}`);
  }
  const canonical = data.links.find(l => l.rel === 'canonical')?.href;
  if (canonical) out.push(`link[rel=canonical] = ${canonical}`);
  return out;
}

// Returns [{ group, field, severity, message }]
function collectIssues(data) {
  const issues = [];

  for (const c of seoChecks(data)) {
    addIssue(issues, 'seo', c.field, c.value, c.validate(c.value), true);
  }
  for (const f of ogFields()) {
    const v = metaByProperty(data.metas, f.key)?.content;
    addIssue(issues, 'og', f.key, v, f.validate(v), f.required);
    addDuplicateIssue(issues, 'og', f.key, countOg(data.metas, f.key));
  }
  for (const f of twitterFields()) {
    const v = metaByTwitter(data.metas, f.key)?.content;
    addIssue(issues, 'twitter', f.key, v, f.validate(v), f.required);
    addDuplicateIssue(issues, 'twitter', f.key, countTwitter(data.metas, f.key));
  }
  return issues;
}

function addIssue(issues, group, field, value, result, required) {
  if (result.level === 'ok') return;
  if (result.level === 'bad' && !required && !value) return;
  const severity = result.level === 'bad' ? 'ERROR' : 'WARN';
  const message = value
    ? `${result.text} (current: ${truncate(value, 120)})`
    : result.text;
  issues.push({ group, field, severity, message });
}

function addDuplicateIssue(issues, group, field, count) {
  if (count > 1) issues.push({ group, field, severity: 'WARN', message: `declared ${count} times; scrapers only read the first` });
}

function updateTabBadges() {
  const issues = collectIssues(pageData);
  const totals = {};
  for (const i of issues) {
    totals[i.group] = totals[i.group] || { bad: 0, warn: 0 };
    totals[i.group][i.severity === 'ERROR' ? 'bad' : 'warn']++;
  }
  totals.fix = issues.reduce((acc, i) => {
    acc[i.severity === 'ERROR' ? 'bad' : 'warn']++;
    return acc;
  }, { bad: 0, warn: 0 });

  tabs.forEach(t => {
    const key = t.dataset.tab;
    t.querySelector('.tab-badge')?.remove();
    const tot = totals[key];
    if (!tot || (tot.bad === 0 && tot.warn === 0)) return;
    const badge = document.createElement('span');
    const n = tot.bad || tot.warn;
    badge.className = `tab-badge ${tot.bad ? 'bad' : 'warn'}`;
    badge.textContent = String(n);
    badge.title = `${tot.bad} error${tot.bad === 1 ? '' : 's'}, ${tot.warn} warning${tot.warn === 1 ? '' : 's'}`;
    t.appendChild(badge);
  });
}

function attachPromptCopyHandler() {
  const btn = contentEl.querySelector('[data-copy-prompt]');
  const ta = contentEl.querySelector('#fix-prompt');
  if (!btn || !ta) return;
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(ta.value);
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = orig;
        btn.classList.remove('copied');
      }, 1500);
    } catch {
      ta.select();
    }
  });
}

// --- Tab: Previews ---

function renderPreviews(data) {
  const og = key => metaByProperty(data.metas, key)?.content;
  const tw = key => metaByTwitter(data.metas, key)?.content;

  const title = og('og:title') || data.title || '';
  const description = og('og:description') || metaByName(data.metas, 'description')?.content || '';
  const image = resolveUrl(og('og:image'), data.url);
  const siteName = og('og:site_name') || getDomain(data.url);
  const url = og('og:url') || data.url;
  const declared = {
    w: parseInt(og('og:image:width'), 10) || null,
    h: parseInt(og('og:image:height'), 10) || null
  };

  const twTitle = tw('twitter:title') || title;
  const twDesc = tw('twitter:description') || description;
  const twImage = resolveUrl(tw('twitter:image') || tw('twitter:image:src'), data.url) || image;
  const twCard = (tw('twitter:card') || (twImage ? 'summary_large_image' : 'summary')).toLowerCase();
  const twVariant = twCard === 'summary' ? 'x-summary' : 'x-large';
  const twLabel = `X / Twitter · ${twCard}${tw('twitter:card') ? '' : ' (no twitter:card, inferred)'}`;

  return `
    ${cardBlock('Facebook / LinkedIn', 'facebook', { title, description, image, siteName, url, declared })}
    ${cardBlock(twLabel, twVariant, { title: twTitle, description: twDesc, image: twImage, siteName, url })}
    ${cardBlock('Slack / Discord', 'slack', { title, description, image, siteName, url })}
  `;
}

function cardBlock(label, variant, c) {
  const imgSrc = bustCache(c.image);
  const domain = getDomain(c.url) || c.siteName || '';
  const imgHtml = c.image
    ? `<img src="${escapeHtml(imgSrc)}" alt="" data-card-img>`
    : `<span>no ${variant === 'x-large' || variant === 'x-summary' ? 'twitter:image or og:image' : 'og:image'}</span>`;
  const placeholderClass = c.image ? '' : ' placeholder';
  const declaredAttr = c.declared?.w && c.declared?.h ? ` data-declared="${c.declared.w}x${c.declared.h}"` : '';
  const metaHtml = c.image
    ? `<div class="image-meta" data-image-meta="${escapeHtml(imgSrc)}"${declaredAttr}>checking image…</div>`
    : '';

  // X's large-image card shows only the image with the domain overlaid; no title or description.
  if (variant === 'x-large' && c.image) {
    return `<div class="preview-section">
      <div class="preview-label">${escapeHtml(label)}</div>
      <div class="card x-large">
        <div class="card-image">${imgHtml}<div class="card-overlay">${escapeHtml(domain)}</div></div>
        <div class="card-body compact">${metaHtml}<div class="card-hint">X shows only the image and domain for summary_large_image; title and description are not displayed.</div></div>
      </div>
    </div>`;
  }

  return `<div class="preview-section">
    <div class="preview-label">${escapeHtml(label)}</div>
    <div class="card ${variant}">
      <div class="card-image${placeholderClass}">${imgHtml}</div>
      <div class="card-body">
        <div class="card-domain">${escapeHtml(domain)}</div>
        <div class="card-title">${escapeHtml(c.title || 'No title')}</div>
        <p class="card-desc">${escapeHtml(c.description || 'No description')}</p>
        ${metaHtml}
      </div>
    </div>
  </div>`;
}

function attachImageHandlers() {
  contentEl.querySelectorAll('img[data-card-img]').forEach(img => {
    img.addEventListener('error', () => {
      const wrap = img.parentElement;
      wrap.classList.add('placeholder');
      wrap.innerHTML = '<span>image failed to load</span>';
    });
  });
}

// --- Field rendering ---

function renderFieldList(label, fields, getter, counter) {
  const rows = fields.map(f => {
    const value = getter(f.key);
    let result = f.validate(value);
    if (!value && !f.required) result = { level: 'warn', text: 'missing (optional)' };
    const dupes = counter ? counter(f.key) : 0;
    if (dupes > 1 && result.level === 'ok') {
      result = { level: 'warn', text: `declared ${dupes} times; scrapers read the first` };
    }
    return renderFieldRow(f.key, value, result, f.note);
  });
  return `<div class="section">
    <div class="section-title">${escapeHtml(label)}</div>
    ${rows.join('')}
  </div>`;
}

function renderFieldRow(name, value, status, note) {
  const icon = status.level === 'bad' ? '○' : '●';
  const labelText = status.level === 'ok' ? 'OK' : status.level === 'warn' ? 'Warning' : 'Error';
  const valHtml = value
    ? `<span>${escapeHtml(value)}</span>`
    : `<span class="missing">missing</span>`;
  const noteHtml = note ? `<div class="field-note">${escapeHtml(note)}</div>` : '';
  return `<div class="field-row">
    <div class="field-status ${status.level}" title="${escapeHtml(labelText + ': ' + status.text)}" aria-label="${escapeHtml(labelText)}">${icon}</div>
    <div class="field-name">${escapeHtml(name)}<div class="field-note">${escapeHtml(status.text)}</div></div>
    <div class="field-content${value ? '' : ' missing'}">${valHtml}${noteHtml}</div>
  </div>`;
}

function tagRow(key, value) {
  const display = value || '';
  return `<div class="tag-row">
    <div class="tag-key">${escapeHtml(key)}</div>
    <div class="tag-value${display ? '' : ' empty'}">${display ? escapeHtml(display) : '(empty)'}</div>
    <div class="tag-actions">
      <button class="copy-btn" data-copy="${escapeHtml(display)}" aria-label="Copy value of ${escapeHtml(key)}">copy</button>
    </div>
  </div>`;
}

// --- Copy buttons ---

function attachCopyHandlers() {
  contentEl.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy || '');
        const orig = btn.textContent;
        btn.textContent = 'copied';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = orig;
          btn.classList.remove('copied');
        }, 1200);
      } catch {}
    });
  });
}

// --- Image dimension check (for preview tab) ---

function loadImageMeta() {
  contentEl.querySelectorAll('[data-image-meta]').forEach(el => {
    const url = el.dataset.imageMeta;
    const declared = el.dataset.declared;
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const ratio = h ? (w / h).toFixed(2) : '?';
      const notes = [];
      if (w < 200 || h < 200) notes.push('too small for Facebook (min 200×200)');
      else if (w < 1200 || h < 630) notes.push('below recommended 1200×630');
      if (declared && declared !== `${w}x${h}`) notes.push(`og:image:width/height say ${declared.replace('x', '×')}`);
      el.textContent = `${w} × ${h} (${ratio}:1)${notes.length ? ' · ' + notes.join(' · ') : ''}`;
      el.classList.toggle('warn', notes.length > 0);
    };
    img.onerror = () => {
      el.textContent = 'image failed to load';
      el.classList.add('warn');
    };
    img.src = url;
  });
}
