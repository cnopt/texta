# Play Console checklists — Phases 3–8

Complete after a signed AAB exists (`npm run android:release`). Package ID: `com.hanno.texta`. App name: **Texta**.

---

## Phase 3 — App setup (store listing + App content)

Finish setup before closed testing can start.

### Store listing

- [x] App created with application ID `com.hanno.texta`
- [x] App name: Texta
- [ ] Short + full description from [play-store-listing.md](play-store-listing.md)
- [ ] App icon 512×512 — use `[store-assets/play-icon-512.png](store-assets/play-icon-512.png)` (or a refined export)
- [ ] Feature graphic 1024×500 uploaded
- [ ] Phone screenshots (min 2; prefer 4–8)
- [x] Privacy policy URL (hosted `privacy.html`) saved
- [x] Category: Productivity
- [x] Contact email set



### App content declarations

- [x] Privacy policy declaration complete
- [ ] **Data safety** submitted (see [privacy-policy.md](privacy-policy.md) guidance)
- [x] Ads: **No**
- [x] App access: all features without login
- [ ] Content ratings (IARC) completed and applied
- [x] Target audience & content completed (not “designed for children” unless true)
- [x] News app: No
- [x] COVID-19 apps: No
- [x] Financial features: No
- [x] Health: No
- [x] Government apps: No
- [x] Permissions declaration: only if Play prompts (current app: INTERNET + VIBRATE)
- [ ] Countries/regions selected
- [x] Pricing: Free
- [x] Dashboard setup tasks clear enough to create a closed test



### Data safety suggested path (local-only notes)

1. Declare whether the app collects/shares user data → **No** for current build (no server collection; no analytics/ads SDKs).
2. If Play’s questionnaire forces categories for on-device files, match the privacy policy and state data is not shared / not collected off-device.
3. Security practices: answer honestly; no independent review unless obtained.

---



## Phase 4 — Internal testing (recommended)

- [x] Create Internal testing release
- [x] Upload signed `app-release.aab`
- [x] Release name e.g. `1.0.0 (1)`
- [ ] Add 1–10 trusted testers; share opt-in link
- [ ] Testers install from Play (not sideload only)
- [ ] Review **pre-launch report** (stability / compatibility / accessibility)
- [ ] Fix crashes/ANRs; re-upload with higher `versionCode` if needed
- [ ] No unresolved policy warnings

---



## Phase 5 — Closed testing (required for new personal accounts)

- [x] Create Closed testing track (email list or Google Group)
- [x] Upload AAB (`versionCode` ≥ previous uploads)
- [ ] Share **Play opt-in link**
- [ ] ≥12 testers show as opted-in
- [ ] Day-0 opted-in count recorded ([tester-recruitment.md](tester-recruitment.md))
- [ ] Daily check count stays ≥12 for **14 continuous days**
- [ ] Testers use create/edit/persist flows
- [ ] Feedback log maintained
- [ ] Critical bugs fixed on closed track before production apply
- [ ] Pre-launch report acceptable for production

---



## Phase 6 — Production access application (personal accounts after 13 Nov 2023)

When Dashboard shows **Apply for production**:

- [ ] Still ≥12 continuously opted-in for the last 14 days
- [ ] Written answers ready:
  - Closed test engagement + feedback summary
  - Audience + value of Texta
  - Changes made from testing + why ready
- [ ] Application submitted
- [ ] Watch account-owner email (often ≤7 days)

Organization / legacy-exempt accounts: skip this application; Production may already be available.

---



## Phase 7 — Production rollout

- [ ] Production track unlocked
- [ ] Promote or upload production AAB
- [ ] User-facing release notes written
- [ ] Staged rollout chosen (recommend 20% → 50% → 100%)
- [ ] Countries confirmed
- [ ] Store listing / Data safety / ratings still complete
- [ ] Start rollout to Production
- [ ] Public listing URL opens correctly
- [ ] Clean-account install smoke test passed

---



## Phase 8 — Post-launch

- [ ] Play Vitals watched for 48–72h (crash-free, ANR)
- [ ] Review reply process defined
- [ ] Next `versionCode` bump process documented (see [android-release.md](android-release.md))
- [ ] Upload keystore recovery understood
- [ ] Privacy policy / Data safety updated if plugins/analytics added later
- [ ] Calendar reminder for yearly Play target-API deadline (typically late August)

---



## Suggested timeline (new personal account)


| Week | Focus                                          |
| ---- | ---------------------------------------------- |
| 0    | Phases 0–1: policy host, keystore, AAB, QA     |
| 1    | Phases 2–4: Console setup, internal test       |
| 1–3  | Phase 5: closed testing (14 days ≥12 opt-ins)  |
| 3–4  | Phases 6–7: production access → staged rollout |
| 4+   | Phase 8: vitals + hotfixes                     |


