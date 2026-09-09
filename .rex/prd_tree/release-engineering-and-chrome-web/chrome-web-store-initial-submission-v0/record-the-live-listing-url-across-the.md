---
id: "1cfe8dc0-d628-4519-af87-a17a76a49508"
level: "task"
title: "Record the live listing URL across the repo once approved"
status: "pending"
priority: "medium"
tags:
  - "store"
  - "docs"
blockedBy:
  - "75e69fce-c3fc-4462-8a7c-0e9c84ee5fdc"
source: "ndx-plan"
acceptanceCriteria:
  - "README links to the live Chrome Web Store listing"
  - "Store item ID and listing URL are recorded in docs/PUBLISHING.md"
  - "The release workflow's notes template no longer says the listing is coming soon"
  - "Changes land via a pull request, not a direct push to main"
description: "Three places still say the listing is coming soon and become wrong the moment it goes live. Update them in one pull request, since main is protected by preference and changes land through PRs.\n\n1. README.md, \"From the Chrome Web Store\" section: replace \"Listing coming soon.\" with the install link.\n2. docs/PUBLISHING.md: record the store item ID and the public listing URL near the top so future updates have it.\n3. .github/workflows/release.yml: the release body template ends with \"Listing coming soon — until then, use the unpacked install above.\" Replace that with the store link so future releases are correct.\n\nOptionally edit the existing v0.1.0 GitHub Release notes, which contain the same stale sentence."
lastModified: "2026-09-09T03:50:42.309Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
