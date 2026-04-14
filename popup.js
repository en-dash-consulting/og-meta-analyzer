const contentEl = document.getElementById('content');
const urlEl = document.getElementById('page-url');
const tabs = document.querySelectorAll('.tab');

let pageData = null;
let activeTab = 'previews';

tabs.forEach(t => {
  t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.toggle('active', x === t));
    activeTab = t.dataset.tab;
    render();
  });
});

init();

async function init() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab');
    if (!/^https?:/.test(tab.url || '')) {
      urlEl.textContent = tab.url || '';
      contentEl.innerHTML = `<div class="error">This page can't be inspected (chrome:// or extension page).</div>`;
      return;
    }
    urlEl.textContent = tab.url;
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapePage
    });
    pageData = result;
    render();
  } catch (err) {
    contentEl.innerHTML = `<div class="error">Failed to read page: ${escapeHtml(err.message)}</div>`;
  }
}

// Runs in the page context.
function scrapePage() {
  const metas = [...document.querySelectorAll('meta')].map(m => {
    const attrs = {};
    for (const a of m.attributes) attrs[a.name] = a.value;
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
    title: document.title,
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
  loadImageMeta();
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

// --- Validation ---

function validateLength(value, min, max) {
  if (!value) return { level: 'bad', text: 'missing' };
  const len = value.length;
  if (len < min) return { level: 'warn', text: `${len} chars (min ~${min})` };
  if (len > max) return { level: 'warn', text: `${len} chars (max ~${max})` };
  return { level: 'ok', text: `${len} chars` };
}

function validatePresent(value) {
  return value
    ? { level: 'ok', text: 'present' }
    : { level: 'bad', text: 'missing' };
}

// --- Tab: Open Graph ---

function renderOpenGraph(data) {
  const fields = [
    { key: 'og:title', required: true, validate: v => validateLength(v, 30, 90) },
    { key: 'og:type', required: true, validate: validatePresent, note: 'e.g. website, article' },
    { key: 'og:image', required: true, validate: validatePresent },
    { key: 'og:url', required: true, validate: validatePresent },
    { key: 'og:description', required: false, validate: v => validateLength(v, 50, 200) },
    { key: 'og:site_name', required: false, validate: validatePresent },
    { key: 'og:locale', required: false, validate: validatePresent },
    { key: 'og:image:alt', required: false, validate: validatePresent },
    { key: 'og:image:width', required: false, validate: validatePresent },
    { key: 'og:image:height', required: false, validate: validatePresent }
  ];
  return renderFieldList('Open Graph', fields, k => metaByProperty(data.metas, k)?.content);
}

// --- Tab: Twitter ---

function renderTwitter(data) {
  const fields = [
    { key: 'twitter:card', required: true, validate: validatePresent, note: 'summary, summary_large_image, app, player' },
    { key: 'twitter:title', required: false, validate: v => validateLength(v, 30, 70), note: 'falls back to og:title' },
    { key: 'twitter:description', required: false, validate: v => validateLength(v, 50, 200), note: 'falls back to og:description' },
    { key: 'twitter:image', required: false, validate: validatePresent, note: 'falls back to og:image' },
    { key: 'twitter:image:alt', required: false, validate: validatePresent },
    { key: 'twitter:site', required: false, validate: validatePresent, note: '@username of website' },
    { key: 'twitter:creator', required: false, validate: validatePresent, note: '@username of author' }
  ];
  return renderFieldList('Twitter Card', fields, k => metaByTwitter(data.metas, k)?.content);
}

// --- Tab: SEO ---

function renderSEO(data) {
  const description = metaByName(data.metas, 'description')?.content;
  const robots = metaByName(data.metas, 'robots')?.content;
  const viewport = metaByName(data.metas, 'viewport')?.content;
  const canonical = data.links.find(l => l.rel === 'canonical')?.href;
  const charset = data.metas.find(m => m.charset)?.charset
    || data.metas.find(m => (m['http-equiv'] || '').toLowerCase() === 'content-type')?.content;

  const rows = [
    renderFieldRow('title', data.title, validateLength(data.title, 10, 60), '10–60 chars recommended'),
    renderFieldRow('description', description, validateLength(description, 50, 160), '50–160 chars recommended'),
    renderFieldRow('canonical', canonical, validatePresent(canonical)),
    renderFieldRow('robots', robots, robots ? { level: 'ok', text: robots } : { level: 'warn', text: 'default (index, follow)' }),
    renderFieldRow('viewport', viewport, validatePresent(viewport)),
    renderFieldRow('charset', charset, validatePresent(charset)),
    renderFieldRow('lang', data.lang, validatePresent(data.lang), 'on <html> element')
  ];

  return `<div class="section">
    <div class="section-title">SEO Essentials</div>
    ${rows.join('')}
  </div>`;
}

// --- Tab: All ---

function renderAll(data) {
  const rows = [];

  rows.push(tagRow('title', data.title));
  if (data.lang) rows.push(tagRow('html[lang]', data.lang));

  for (const m of data.metas) {
    const key = m.property || m.name || m['http-equiv'] || (m.charset ? 'charset' : '(meta)');
    const value = m.content || m.charset || '';
    rows.push(tagRow(key, value));
  }

  for (const l of data.links) {
    const sub = [l.type, l.sizes].filter(Boolean).join(' · ');
    const key = sub ? `link[${l.rel}] ${sub}` : `link[${l.rel}]`;
    rows.push(tagRow(key, l.href));
  }

  return `<div class="section">
    <div class="section-title">All Tags <span class="count">${rows.length}</span></div>
    <div class="tag-list">${rows.join('')}</div>
  </div>`;
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
    <textarea class="fix-prompt" id="fix-prompt" readonly spellcheck="false">${escapeHtml(prompt)}</textarea>
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
  lines.push('4. Always include: <title>, meta description, canonical, viewport, charset, og:title, og:type, og:image (1200×630 recommended), og:url, og:description, og:site_name, twitter:card (summary_large_image when an image is present), twitter:title, twitter:description, twitter:image.');
  lines.push('5. After the HTML block, add a short bulleted "Notes" section explaining any non-obvious choices and listing every TODO the user still needs to fill in.');
  return { prompt: lines.join('\n'), issueCount: issues.length };
}

function collectCurrentTags(data) {
  const out = [];
  const wanted = [
    'description', 'robots', 'viewport',
    'og:title', 'og:type', 'og:image', 'og:url', 'og:description',
    'og:site_name', 'og:locale', 'og:image:alt', 'og:image:width', 'og:image:height',
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

function collectIssues(data) {
  const issues = [];
  const seoChecks = [
    { field: '<title>', value: data.title, validate: v => validateLength(v, 10, 60) },
    { field: 'meta description', value: metaByName(data.metas, 'description')?.content, validate: v => validateLength(v, 50, 160) },
    { field: 'link[rel=canonical]', value: data.links.find(l => l.rel === 'canonical')?.href, validate: validatePresent },
    { field: 'meta viewport', value: metaByName(data.metas, 'viewport')?.content, validate: validatePresent },
    { field: 'html[lang]', value: data.lang, validate: validatePresent }
  ];
  const ogChecks = [
    { field: 'og:title', required: true, validate: v => validateLength(v, 30, 90) },
    { field: 'og:type', required: true, validate: validatePresent },
    { field: 'og:image', required: true, validate: validatePresent },
    { field: 'og:url', required: true, validate: validatePresent },
    { field: 'og:description', required: false, validate: v => validateLength(v, 50, 200) },
    { field: 'og:site_name', required: false, validate: validatePresent },
    { field: 'og:image:alt', required: false, validate: validatePresent }
  ];
  const twChecks = [
    { field: 'twitter:card', required: true, validate: validatePresent },
    { field: 'twitter:title', required: false, validate: v => validateLength(v, 30, 70) },
    { field: 'twitter:description', required: false, validate: v => validateLength(v, 50, 200) },
    { field: 'twitter:image', required: false, validate: validatePresent }
  ];

  for (const c of seoChecks) addIssue(issues, c.field, c.value, c.validate(c.value), true);
  for (const c of ogChecks) {
    const v = metaByProperty(data.metas, c.field)?.content;
    addIssue(issues, c.field, v, c.validate(v), c.required);
  }
  for (const c of twChecks) {
    const v = metaByTwitter(data.metas, c.field)?.content;
    addIssue(issues, c.field, v, c.validate(v), c.required);
  }
  return issues;
}

function addIssue(issues, field, value, result, required) {
  if (result.level === 'ok') return;
  if (result.level === 'bad' && !required && !value) return;
  const severity = result.level === 'bad' ? 'ERROR' : 'WARN';
  const message = value
    ? `${result.text} (current: ${truncate(value, 120)})`
    : result.text;
  issues.push({ field, severity, message });
}

function truncate(s, n) {
  s = String(s);
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
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

  const twTitle = tw('twitter:title') || title;
  const twDesc = tw('twitter:description') || description;
  const twImage = resolveUrl(tw('twitter:image'), data.url) || image;
  const twCard = tw('twitter:card') || 'summary';

  return `
    ${cardBlock('Facebook / LinkedIn', '', { title, description, image, siteName, url })}
    ${cardBlock('Twitter / X', twCard === 'summary' ? 'summary' : 'twitter', { title: twTitle, description: twDesc, image: twImage, siteName, url })}
    ${cardBlock('Slack / Discord', 'slack', { title, description, image, siteName, url })}
  `;
}

function cardBlock(label, variant, c) {
  const imgHtml = c.image
    ? `<img src="${escapeHtml(c.image)}" alt="" data-card-img>`
    : `<span>no og:image</span>`;
  const placeholderClass = c.image ? '' : ' placeholder';
  return `<div class="preview-section">
    <div class="preview-label">${escapeHtml(label)}</div>
    <div class="card ${variant}">
      <div class="card-image${placeholderClass}">${imgHtml}</div>
      <div class="card-body">
        <div class="card-domain">${escapeHtml(getDomain(c.url) || c.siteName || '')}</div>
        <div class="card-title">${escapeHtml(c.title || 'No title')}</div>
        <p class="card-desc">${escapeHtml(c.description || 'No description')}</p>
        ${c.image ? `<div class="image-meta" data-image-meta="${escapeHtml(c.image)}">checking image…</div>` : ''}
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

function renderFieldList(label, fields, getter) {
  const rows = fields.map(f => {
    const value = getter(f.key);
    const result = f.validate(value);
    return renderFieldRow(f.key, value, result, f.note);
  });
  return `<div class="section">
    <div class="section-title">${escapeHtml(label)}</div>
    ${rows.join('')}
  </div>`;
}

function renderFieldRow(name, value, status, note) {
  const icon = status.level === 'ok' ? '●' : status.level === 'warn' ? '●' : '○';
  const valHtml = value
    ? `<span>${escapeHtml(value)}</span>`
    : `<span class="missing">missing</span>`;
  const noteHtml = note ? `<div class="field-note">${escapeHtml(note)}</div>` : '';
  return `<div class="field-row">
    <div class="field-status ${status.level}" title="${escapeHtml(status.text)}">${icon}</div>
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
      <button class="copy-btn" data-copy="${escapeHtml(display)}">copy</button>
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
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      let advice = '';
      if (w < 200 || h < 200) advice = ' · too small for FB (min 200×200)';
      else if (w < 1200 || h < 630) advice = ' · below recommended 1200×630';
      el.textContent = `${w} × ${h}${advice}`;
    };
    img.onerror = () => { el.textContent = 'image failed to load'; };
    img.src = url;
  });
}
