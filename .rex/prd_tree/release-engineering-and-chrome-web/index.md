---
id: "11b40d9d-3f74-4726-8575-014fca9225d5"
level: "epic"
title: "Release engineering and Chrome Web Store distribution"
status: "pending"
priority: "high"
tags:
  - "release"
  - "retroactive"
source: "ndx-plan"
acceptanceCriteria:
  - "Pushing a v* tag produces a downloadable zip on a GitHub Release"
  - "Extension is publicly listed on the Chrome Web Store"
  - "Listing links to a privacy policy and passes review"
description: "Everything needed to package the extension reproducibly and get it listed on the Chrome Web Store (which Brave also installs from): CI packaging, GitHub Releases, manifest hardening, privacy policy, listing copy, and the manual submission steps. Retroactively documented from .github/workflows/release.yml, docs/PUBLISHING.md, docs/store-listing.md, and PRIVACY.md."
lastModified: "2026-09-08T03:55:44.717Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

## Children

| Title | Status |
|-------|--------|
| [Chrome Web Store initial submission (v0.1.0)](./chrome-web-store-initial-submission-v0/index.md) | pending |
| [CI packaging and GitHub Releases](./ci-packaging-and-github-releases.md) | completed |
| [Store readiness: manifest hardening, privacy policy, listing copy](./store-readiness-manifest-hardening.md) | completed |
