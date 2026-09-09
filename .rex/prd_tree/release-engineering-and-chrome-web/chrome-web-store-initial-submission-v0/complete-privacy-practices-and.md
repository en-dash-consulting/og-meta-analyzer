---
id: "c74424f5-ea0c-4ba8-83d8-cae7258b4de8"
level: "task"
title: "Complete privacy practices and permission justifications"
status: "pending"
priority: "high"
tags:
  - "store"
blockedBy:
  - "99840331-b8d9-451e-a148-9f0e7fdb51f6"
source: "ndx-plan"
acceptanceCriteria:
  - "Privacy policy URL is the GitHub PRIVACY.md link and resolves"
  - "Single purpose and both permission justifications are entered as written in docs/PUBLISHING.md"
  - "Data usage certification declares no collection, no sale, and no unrelated use"
  - "The console reports no outstanding privacy warnings"
description: "The Privacy tab of the listing. Getting this wrong is the most common cause of rejection, and the answers are already written in docs/PUBLISHING.md.\n\nPrivacy policy URL, which must resolve or review fails:\nhttps://github.com/en-dash-consulting/og-meta-analyzer/blob/main/PRIVACY.md\nDo NOT use https://endash.us/og-meta-analyzer/privacy — it currently 404s.\n\nSingle purpose: \"Inspect and validate social-sharing, Open Graph, Twitter Card, and SEO meta tags on the current page.\"\n\nPermission justifications:\n- activeTab: \"Needed to read <meta> and <link> tags from the page the user is currently viewing when they open the popup.\"\n- scripting: \"Needed to execute a one-shot DOM read on the active tab to collect <meta> and <link> tags for display in the popup.\"\n\nData usage certification: the extension collects no user data at all. Certify that it does not collect or use user data, does not sell data, does not transfer data to third parties, and does not use data for purposes unrelated to its single purpose. This is accurate: the popup reads tags from the active tab, holds them in memory, and never makes a network request other than loading preview images from the page's own URLs."
lastModified: "2026-09-09T03:50:21.047Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
