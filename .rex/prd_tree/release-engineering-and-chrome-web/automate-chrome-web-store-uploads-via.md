---
id: "58275c9d-9fc7-4e5e-9a45-2033ed2eaa52"
level: "feature"
title: "Automate Chrome Web Store uploads via the publish API"
status: "pending"
priority: "low"
tags:
  - "release"
  - "future"
source: "ndx-plan"
acceptanceCriteria:
  - "Pushing a v* tag uploads the package to the Chrome Web Store without manual steps"
  - "The publish job runs only after scripts/verify-release.js passes"
  - "Credentials live in repo secrets, never in the workflow file"
description: "Deliberately deferred until the first manual publish is approved, because the API needs an extension ID that does not exist until then. Documented in the \"Automating store uploads (future)\" section of docs/PUBLISHING.md.\n\nWire the Chrome Web Store publish API into the release workflow so a v* tag ships to the store as well as to GitHub Releases: create an OAuth client in the Google Cloud project linked to the publishing account, run the one-time consent flow for a refresh token, add CWS_CLIENT_ID / CWS_CLIENT_SECRET / CWS_REFRESH_TOKEN / CWS_EXTENSION_ID as repo secrets, and add a publish job that runs after the release job.\n\nGate the publish job on scripts/verify-release.js so a broken package cannot reach the store."
lastModified: "2026-09-09T03:49:41.300Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
