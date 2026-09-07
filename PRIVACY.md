# Privacy Policy — Meta & Open Graph Tester

_Last updated: 2026-09-07_

Meta & Open Graph Tester is a browser extension published by En Dash (https://endash.us).

## What the extension does with your data

- When you click the extension icon, it reads the `<title>`, `<meta>`, and `<link>` tags from the page in the active tab and displays them in the popup.
- Preview images referenced by `og:image` / `twitter:image` tags are loaded directly from the page's own image URLs so the popup can show them and report their dimensions.
- Text is copied to your clipboard only when you click a copy button.

## What the extension does not do

- It does not transmit any data to En Dash or any third party.
- It does not use analytics, telemetry, cookies, or any form of tracking.
- It does not store anything. Nothing persists after the popup closes.
- It does not read pages in the background. It only runs when you open the popup, on the tab you opened it from.

## Permissions

- `activeTab` — grants temporary access to the current tab when you click the icon, so the popup can read its tags.
- `scripting` — used to run a one-shot script on that tab to collect the tags.

## Contact

Questions about this policy: https://github.com/en-dash-consulting/og-meta-analyzer/issues
