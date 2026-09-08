---
id: "79c9b2ea-4416-43cd-801f-f61369d204ab"
level: "task"
title: "Push main, tag v0.1.0, confirm Release zip"
status: "pending"
priority: "high"
source: "ndx-plan"
acceptanceCriteria:
  - "Release v0.1.0 exists on GitHub with the zip attached"
  - "Workflow run is green"
description: "git push origin main; git tag v0.1.0 && git push origin v0.1.0; verify the 'build' workflow attaches og-meta-analyzer-v0.1.0.zip to the GitHub Release."
lastModified: "2026-09-08T03:56:43.233Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
