# Meta & Open Graph Tester

A Chrome extension that inspects the current page's `<meta>`, Open Graph, Twitter Card, and SEO tags, renders Facebook / Twitter / Slack link previews from them, and — when something is broken or missing — generates a structured prompt you can paste into any LLM (Claude, ChatGPT, etc.) to get drop-in replacement tags.

Built by [En Dash](https://endash.us).

## What it does

- **Previews** — see exactly how the page will render when shared on Facebook/LinkedIn, Twitter/X, and Slack/Discord.
- **Open Graph, Twitter, SEO tabs** — per-tag validation with recommended length ranges and required-field checks.
- **All tags** — a flat, searchable view of every `<meta>` and `<link rel>` on the page, with one-click copy.
- **Fix tab** — auto-generated LLM prompt that lists the page's current tags, the specific issues detected, and asks for a complete corrected `<head>` block you can paste into your site.

## Install

### From the Chrome Web Store

Listing coming soon.

### From a GitHub Release (unpacked)

1. Download the latest `og-meta-analyzer-vX.Y.Z.zip` from the [Releases page](https://github.com/en-dash-consulting/og-meta-analyzer/releases).
2. Unzip it to a folder you'll keep around (Chrome loads the extension from this folder).
3. Open `chrome://extensions`, enable **Developer mode** (top right), click **Load unpacked**, and select the unzipped folder.

### From source

```bash
git clone git@github.com:en-dash-consulting/og-meta-analyzer.git
cd og-meta-analyzer
# Then in Chrome: chrome://extensions → Developer mode → Load unpacked → select this folder
```

## Usage

Click the extension icon on any `http://` or `https://` page. The popup opens with five tabs:

- **Previews** — social-card mockups.
- **Open Graph** / **Twitter** / **SEO** — per-tag status.
- **All** — every tag on the page.
- **Fix** — copy-paste LLM prompt.

## Development

This is a zero-build Manifest V3 extension — just HTML, CSS, and JS. To work on it:

1. Clone the repo.
2. `chrome://extensions` → **Load unpacked** → select the repo root.
3. Edit `popup.html`, `popup.css`, `popup.js`. Hit the refresh icon on the extension card in `chrome://extensions` to pick up changes.

### Releasing a new version

1. Bump `version` in `manifest.json`.
2. Commit and push.
3. Tag the commit: `git tag v0.2.0 && git push origin v0.2.0`.
4. GitHub Actions builds the zip and publishes a Release automatically.

## Publishing to the Chrome Web Store

See [`docs/PUBLISHING.md`](docs/PUBLISHING.md) for the submission checklist and [`docs/store-listing.md`](docs/store-listing.md) for ready-to-paste listing copy.

## License

MIT — see [`LICENSE`](LICENSE).
