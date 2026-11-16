# Android release guide — Texta (`com.hanno.texta`)

Operational runbook for shipping Texta to Google Play. Follow phases in order. Phase checklists match the release plan.

**Defaults:** free app · no ads/IAP · Play App Signing · AAB only · store title **Texta** · package `com.hanno.texta` (immutable after first upload).

**Related docs**

- [play-store-listing.md](play-store-listing.md) — copy + graphic specs
- [privacy-policy.md](privacy-policy.md) / `[public/privacy.html](../public/privacy.html)`
- [tester-recruitment.md](tester-recruitment.md)
- [play-console-checklists.md](play-console-checklists.md) — Phases 3–8 Console steps

---



## Technical baseline (already in repo)


| Item                            | Value                                                      |
| ------------------------------- | ---------------------------------------------------------- |
| minSdk / compileSdk / targetSdk | 24 / 36 / 36                                               |
| versionCode / versionName       | `1` / `1.0.0` in `android/app/build.gradle`                |
| AGP                             | 8.13.0 (16 KB page-size tooling OK)                        |
| Release AAB output              | `android/app/build/outputs/bundle/release/app-release.aab` |


Bump rule: **every Play upload increments** `versionCode`. Keep `versionName` semver in sync with npm `package.json` when practical.

---



## Phase 0 — Product / legal prep

See listing + privacy docs. Host `public/privacy.html` at a stable HTTPS URL before Data safety.

### Checklist — Phase 0

- [x] Play Console account active and verified
- [x] Confirmed package ID `com.hanno.texta` will never need to change
- [ ] Store title/subtitle/descriptions drafted ([play-store-listing.md](play-store-listing.md))
- [ ] Support email + developer website ready
- [ ] Privacy policy published at a stable HTTPS URL
- [ ] Content rating questionnaire answers prepared
- [ ] Tester shortlist of 14–16 people ready ([tester-recruitment.md](tester-recruitment.md))
- [ ] Feedback channel chosen (email / form / chat)

---



## Phase 1 — Engineering (repo)



### Build a release AAB

```powershell
# One-time: create upload keystore (writes gitignored files under android/)
npm run android:keystore

# Build web, sync Capacitor, produce signed AAB
npm run android:release
```

Without `android/keystore.properties`, `bundleRelease` still builds but is **unsigned** (fine for local install via Android Studio; Play requires the signed upload key).

### Manual QA before upload

- [x] Display name is Texta on launcher and system recents
- [x] Create notebook / note, edit, kill app, reopen — data persists
- [x] Keyboard resize does not obscure the editor
- [x] System back / predictive back behaves (`AndroidBackButton`)
- [x] Haptics fire on expected actions
- [x] No unexpected dangerous permissions in merged manifest
- [x] APK Analyzer / Play Bundle Explorer: **supports 16 KB page sizes**



### Checklist — Phase 1

- [x] Display name is Texta everywhere users see it
- [x] `versionCode` / `versionName` set for first upload
- [x] Upload keystore created and backed up offline
- [x] `signingConfigs.release` works; `bundleRelease` produces signed AAB
- [x] Keystore / `keystore.properties` not committed
- [x] Branded adaptive icon + splash shipped
- [x] `npm run android:release` syncs and builds cleanly
- [x] App installs from release AAB/APK on a physical device
- [x] Core flows QA’d
- [x] 16 KB page-size check passed
- [x] No unexpected dangerous permissions
- [x] Instrumented test package is `com.hanno.texta`

---



## Phase 2 — Signing & Play App Signing

1. Run `npm run android:keystore` if you have not already.
2. Back up `android/upload-keystore.jks` + `android/keystore.properties` in **two** secure places.
3. Record SHA-256 of the upload cert (script prints it; or `keytool -list -v -keystore android/upload-keystore.jks`).
4. Create the app in Play Console with application ID `com.hanno.texta`.
5. On first AAB upload, enroll in **Play App Signing** (Play holds the app signing key; you keep the upload key).



### Checklist — Phase 2

- [ ] Upload keystore generated (RSA 2048, long validity)
- [ ] Upload key backed up in at least two secure locations
- [ ] Play App Signing enrolled on first AAB upload
- [ ] Upload certificate fingerprint recorded
- [ ] Owner knows how to request upload-key reset (last resort)

---



## Phases 3–8 — Play Console

Follow [play-console-checklists.md](play-console-checklists.md).

**Personal accounts after 13 Nov 2023:** closed test with **≥12 opted-in testers for 14 continuous days**, then **Apply for production** on the Dashboard before a public production rollout.

---



## Version bump cheat sheet

1. Edit `versionCode` (+1) and `versionName` in `android/app/build.gradle`.
2. Optionally mirror `version` in `package.json`.
3. `npm run android:release`
4. Upload new AAB to the target track.

