# Privacy policy (source)

Canonical HTML for hosting: [`public/privacy.html`](../public/privacy.html).

## Publish the URL

Google Play requires a **public HTTPS privacy policy URL** for the Data safety form, even when the app does not collect data.

Suggested options:

1. **GitHub Pages** — enable Pages for this repo (or a `docs` site) and point to `/privacy.html` from the built site, or copy `public/privacy.html` into a Pages branch.
2. **Any static host** — Netlify, Cloudflare Pages, your own domain.

Before going live:

- [ ] Replace the Contact placeholder with a real support email
- [ ] Confirm the URL loads without login
- [ ] Paste the same URL into Play Console → App content → Privacy policy and Store listing

## Data safety form guidance (current app)

Based on current code (local `@capacitor/filesystem` `Directory.Data`, no analytics/ads/accounts):

| Question | Suggested answer |
|----------|------------------|
| Does your app collect or share user data? | **No** (notes stay on device; nothing sent to Texta servers) |
| Privacy policy URL | Your hosted `privacy.html` |
| Encryption in transit | N/A if no data collected/shared |
| Account deletion | N/A (no accounts) |
| Independent security review | No (unless you obtain one) |

If you later add analytics, crash reporting, accounts, or cloud sync, update both this policy and the Data safety form before shipping that build.
