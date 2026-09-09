---
id: "3ffa13e7-a61f-4c45-be51-4882aad8576a"
level: "task"
title: "Upload the v0.1.0 package and fill in the listing content"
status: "pending"
priority: "high"
tags:
  - "store"
blockedBy:
  - "99840331-b8d9-451e-a148-9f0e7fdb51f6"
source: "ndx-plan"
acceptanceCriteria:
  - "scripts/verify-release.js passes against the v0.1.0 asset before upload"
  - "Package uploaded and accepted by the console with no manifest warnings"
  - "Listing text matches docs/store-listing.md exactly"
  - "All four screenshots from docs/store-assets/ are uploaded in numeric order"
  - "Distribution is set to public in all regions"
description: "Console data entry only. Everything to paste already exists in the repo, so copy it rather than writing new copy.\n\n1. Before uploading, verify the artifact: `npm i --no-save puppeteer-core` then `node scripts/verify-release.js --tag=v0.1.0`. It must print \"OK\" and exit zero. This needs Brave or Chromium, because Chrome 137+ dropped --load-extension.\n2. Download og-meta-analyzer-v0.1.0.zip from https://github.com/en-dash-consulting/og-meta-analyzer/releases/tag/v0.1.0\n3. In the console, click \"Add new item\" and upload that zip.\n4. Fill the text fields verbatim from docs/store-listing.md: name, short description, detailed description, category \"Developer Tools\", language English (US).\n5. Upload icons/icon-128.png as the store icon, then the four screenshots from docs/store-assets/ in numeric order (01-previews, 02-x-card, 03-open-graph, 04-fix-prompt).\n6. Under Distribution choose public, and select all regions.\n\nLeave the promo tiles empty; they are optional and only matter for featured placement."
lastModified: "2026-09-09T03:50:12.706Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
