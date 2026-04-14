# Chrome Web Store — Listing Copy

Ready-to-paste content for the Chrome Web Store submission form. Update the version number and screenshot captions as needed.

---

## Name

**Meta & Open Graph Tester**

## Short description (132 chars max)

> See exactly how any page looks when shared on Facebook, X, and Slack — with instant AI-ready fixes for missing or broken tags.

*(124 characters — safe.)*

## Category

Developer Tools

## Language

English (US)

---

## Detailed description

> Paste this verbatim into the "Detailed description" field.

**Meta & Open Graph Tester** shows you, in one click, exactly how the page you're on will appear when someone shares it on Facebook, LinkedIn, X (Twitter), Slack, Discord, or any other tool that reads Open Graph and Twitter Card tags.

No signup. No tracking. No servers. Everything runs locally in your browser.

### What you get

**Live previews.** See faithful mockups of Facebook/LinkedIn cards, Twitter summary and large-image cards, and Slack/Discord unfurls — rendered from the page's actual tags, with the actual image, at the actual dimensions.

**Per-tag validation.** Dedicated tabs for Open Graph, Twitter Card, and SEO essentials (title, meta description, canonical, viewport, charset, `<html lang>`, robots). Each field is checked against recommended length ranges and required-field rules.

**Every tag at a glance.** The "All" tab shows every `<meta>` and `<link rel>` on the page in a compact, searchable list — with one-click copy on every value.

**Image checks.** Preview cards flag images smaller than Facebook's 200×200 minimum or below the recommended 1200×630 size, so you catch resolution issues before a post goes out.

**AI fix prompt.** The "Fix" tab generates a structured, ready-to-paste prompt that summarizes the page's current tags and every issue detected, and asks any LLM (Claude, ChatGPT, Gemini, etc.) for a complete drop-in replacement `<head>` block. Paste it into your chatbot of choice, get working HTML back, ship it.

### Who it's for

- **Marketers and content ops** verifying that a new blog post will unfurl cleanly before promoting it.
- **Developers** debugging why Slack shows a broken image or X shows the wrong title.
- **SEOs** auditing title/description lengths, canonical tags, and structured metadata.
- **Agencies** running quick audits on client sites.

### Privacy

This extension reads meta tags from the page you're currently viewing when you open the popup. That's it. No data is sent anywhere. No analytics, no cookies, no tracking. Your AI prompt is only copied to your clipboard when you press the copy button.

### Open source

Source code: https://github.com/en-dash-consulting/og-meta-analyzer

---

Built by **En Dash** — https://endash.us

---

## Permission justifications

> Paste these in the "Permission justification" fields.

**`activeTab`**
> Needed to read the `<meta>`, `<link>`, `<title>`, and `<html lang>` attributes of the page the user is currently viewing when they open the popup. Access is scoped to the active tab and only occurs on user action (clicking the extension icon).

**`scripting`**
> Used to run a single, read-only DOM query on the active tab that collects the page's `<meta>` and `<link>` tags and returns them to the popup for display. No script state persists on the page.

**Single purpose statement**
> Inspect and validate social-sharing (Open Graph, Twitter Card), SEO, and general meta tags on the user's current tab, and help the user fix issues.

**Data usage disclosures (check all that apply)**
- [ ] Personally identifiable information — **No**
- [ ] Health information — **No**
- [ ] Financial and payment information — **No**
- [ ] Authentication information — **No**
- [ ] Personal communications — **No**
- [ ] Location — **No**
- [ ] Web history — **No**
- [ ] User activity — **No**
- [ ] Website content — **Yes** (read-only, on user action, not transmitted off-device)

**Certification statements (check all three)**
- [x] I do not sell or transfer user data to third parties outside of approved use cases.
- [x] I do not use or transfer user data for purposes unrelated to my item's single purpose.
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes.

---

## Privacy policy (host on endash.us)

> Suggested URL: `https://endash.us/og-meta-analyzer/privacy`

```
Meta & Open Graph Tester — Privacy Policy
Last updated: <YYYY-MM-DD>

Meta & Open Graph Tester is a browser extension published by En Dash
(https://endash.us). It helps users inspect and validate the HTML meta
tags on the web page they are currently viewing.

What the extension reads
When you click the extension's toolbar icon, it reads the following from
the page in the active tab:
  - The <title> element
  - The lang attribute on the <html> element
  - All <meta> elements and their attributes
  - All <link rel="…"> elements

It does this only when you open the popup. It does not run on any other
tabs, it does not run in the background, and it does not read page
content other than the elements listed above.

What the extension does with that data
The data is displayed to you inside the extension popup. It is never
transmitted to any server. It is never written to disk. It is never
shared with any third party.

If you press a "Copy" button in the popup, the corresponding value is
copied to your system clipboard. That is a deliberate, user-initiated
action.

Analytics and tracking
The extension does not use analytics, cookies, fingerprinting, or any
other form of tracking.

Third parties
No data is shared with any third party. The extension makes no network
requests.

Contact
Questions: hello@endash.us
```

---

## Screenshot captions

Use these as alt text / captions when uploading screenshots.

1. **"See how your page will look on every social platform."** — Previews tab showing Facebook, Twitter, and Slack card mockups.
2. **"Validate every Open Graph and Twitter tag at a glance."** — Open Graph tab with fields in green/yellow/red states.
3. **"Instant SEO audit of title, description, canonical, and more."** — SEO tab with validation badges.
4. **"Fix everything at once — paste the generated prompt into your AI of choice."** — Fix tab with the prompt preview and Copy button.
5. **"Every meta and link tag on the page, one click to copy."** — All tab.

---

## Small promo tile copy (440×280)

Headline: **"See how your page shares."**
Sub: Preview + audit Open Graph, Twitter, and SEO tags — then get an AI-ready fix prompt in one click.
Logo: En Dash wordmark, bottom-right.

## Marquee promo tile copy (1400×560)

Headline: **"Every meta tag, inspected. Every issue, fixable."**
Sub: Open Graph, Twitter Card, and SEO validation + live social previews + a copy-paste AI fix prompt. Built by En Dash.
Visual: screenshot of the Previews tab on the left, screenshot of the Fix tab on the right.

---

## Search keywords / tags (where the store allows free text)

open graph, og tags, twitter card, meta tags, seo audit, link preview, social sharing, facebook preview, x preview, slack unfurl, developer tools, en dash
