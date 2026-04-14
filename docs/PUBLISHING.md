# Publishing to the Chrome Web Store

End-to-end checklist for getting Meta & Open Graph Tester listed in the Chrome Web Store. Follow once for the initial listing, then use the "Update" section for subsequent releases.

## One-time setup

1. **Create a Chrome Web Store developer account.** Go to <https://chrome.google.com/webstore/devconsole>. Sign in with the Google account that will own the listing (recommended: a dedicated En Dash Google Workspace account, not a personal one).
2. **Pay the one-time $5 registration fee.** Required by Google.
3. **Verify the publisher identity.** Google will ask for contact email and may require domain verification if you want "by En Dash" to appear as the publisher. Add `endash.us` as a verified domain via Google Search Console if you want publisher badging.
4. **(Optional) Add the repo to a Google Group** or service-account-owned account so the listing survives personnel changes.

## Assets you need before submitting

All assets live in `docs/store-listing.md` (text) and should be added to a `docs/store-assets/` folder (images — not yet created).

### Required text

- [x] **Name** — "Meta & Open Graph Tester"
- [x] **Short description** (≤132 chars) — in `store-listing.md`
- [x] **Detailed description** (≤16,000 chars) — in `store-listing.md`
- [x] **Category** — "Developer Tools"
- [x] **Language** — English (US)

### Required images

| Asset                          | Dimensions              | Required | Notes                                           |
| ------------------------------ | ----------------------- | -------- | ----------------------------------------------- |
| Store icon                     | 128×128 PNG             | Yes      | Already in `icons/icon-128.png`                 |
| Screenshot(s)                  | 1280×800 or 640×400 PNG | Yes (≥1) | Up to 5. Show the Previews tab and the Fix tab. |
| Small promo tile               | 440×280 PNG             | Optional | Needed for featured placement                   |
| Marquee promo tile             | 1400×560 PNG            | Optional | Needed for marquee placement                    |

Capture screenshots by opening the extension on a well-tagged public site (e.g., a Stripe or GitHub blog post), resizing your browser, and using macOS screenshot tool (Cmd-Shift-4, then Space, click the popup). Scale or letterbox to 1280×800.

### Privacy

- [ ] **Privacy policy URL** — required if the extension "handles user data". This one only reads tags from the current tab and sends them to the clipboard (user-initiated). You still need a privacy policy page. Host at `https://endash.us/og-meta-analyzer/privacy` or similar, linking to a page that says:
  > This extension reads `<meta>` and `<link>` tags from the page you are currently viewing when you open the popup. It does not transmit any data to any server, does not use analytics, and does not use cookies. Content is only copied to your clipboard when you click a copy button.
- [ ] **Permission justifications** — you'll be asked to justify each permission in `manifest.json`:
  - `activeTab` — "Needed to read `<meta>` and `<link>` tags from the page the user is currently viewing when they open the popup."
  - `scripting` — "Needed to execute a one-shot DOM read on the active tab to collect `<meta>` and `<link>` tags for display in the popup."
  - Single purpose: "Inspect and validate social-sharing, Open Graph, Twitter Card, and SEO meta tags on the current page."

## Submission steps

1. Build a release: push a `v*` tag; GitHub Actions produces `og-meta-analyzer-vX.Y.Z.zip` on the Release page.
2. Go to <https://chrome.google.com/webstore/devconsole> and click **Add new item**.
3. Upload the zip.
4. Fill in the text fields from `docs/store-listing.md`.
5. Upload the store icon (already 128×128 in `icons/icon-128.png`) and screenshots.
6. Paste the privacy policy URL and the permission justifications above.
7. Under **Distribution**, choose public and select target regions (typically all).
8. Click **Submit for review**. Initial review usually takes 1–3 business days; sometimes longer for new publishers.

## Updating an existing listing

1. Bump `version` in `manifest.json` (Chrome requires a strictly increasing version on each update).
2. Push a new tag (e.g., `v0.2.0`). The workflow produces a new zip.
3. In the Chrome Web Store dev console, open the item and click **Package** → upload the new zip.
4. Update the listing text/screenshots if the UX changed.
5. Submit for review. Updates usually review faster than initial submissions.

## Automating store uploads (future)

Google exposes a [publish API](https://developer.chrome.com/docs/webstore/using-api). To wire it into CI:

1. Create an OAuth 2.0 client under the Google Cloud project linked to the publishing account.
2. Run the one-time consent flow to obtain a refresh token for the `chromewebstore` scope.
3. Add `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`, and `CWS_EXTENSION_ID` as repo secrets.
4. Add a `publish` job to `.github/workflows/release.yml` that runs after the release job and uses [`PlasmoHQ/bpp`](https://github.com/PlasmoHQ/bpp) or [`Klemensas/chrome-extension-upload-action`](https://github.com/Klemensas/chrome-extension-upload-action) to upload + publish.

Deferred until after the first manual publish is approved.
