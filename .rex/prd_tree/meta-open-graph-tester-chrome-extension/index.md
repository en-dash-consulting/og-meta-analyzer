---
id: "fdbe77b1-b371-4de6-ab16-28a54e2f388e"
level: "epic"
title: "Meta & Open Graph Tester Chrome extension"
status: "completed"
priority: "high"
tags:
  - "extension"
  - "retroactive"
source: "ndx-plan"
startedAt: "2026-09-08T03:57:02.902Z"
completedAt: "2026-09-08T03:57:02.902Z"
endedAt: "2026-09-08T03:57:02.902Z"
acceptanceCriteria:
  - "Clicking the action icon on any http(s) page opens a popup showing that page's tags within one round-trip"
  - "Popup has Previews, Open Graph, Twitter, SEO, All, and Fix tabs"
  - "No data leaves the browser; permissions are limited to activeTab and scripting"
description: "Zero-build Manifest V3 Chrome/Brave extension that inspects the current page's title, meta, Open Graph, Twitter Card, and link tags; renders Facebook/LinkedIn, X/Twitter, and Slack/Discord link previews; validates each tag; and generates an LLM prompt that produces corrected head tags. Retroactively documented from the shipped code in popup.js, popup.html, popup.css, and manifest.json."
lastModified: "2026-09-08T03:57:02.913Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

## Children

| Title | Status |
|-------|--------|
| [All-tags view with filter and copy](./all-tags-view-with-filter-and-copy.md) | completed |
| [LLM fix prompt generator](./llm-fix-prompt-generator.md) | completed |
| [Open Graph tag validation](./open-graph-tag-validation.md) | completed |
| [Popup shell: page scraping, tabs, refresh](./popup-shell-page-scraping-tabs-refresh.md) | completed |
| [SEO essentials validation](./seo-essentials-validation.md) | completed |
| [Social link previews (Facebook/LinkedIn, X, Slack/Discord)](./social-link-previews-facebook-linkedin.md) | completed |
| [Twitter Card tag validation](./twitter-card-tag-validation.md) | completed |
