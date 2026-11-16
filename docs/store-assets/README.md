# Store assets

Upload these from Play Console → Grow → Store presence → Main store listing.

| File | Spec | Use |
|------|------|-----|
| `play-icon-512.png` | 512×512, 32-bit PNG | App icon |
| `feature-graphic-1024x500.png` | 1024×500, 24-bit PNG | Feature graphic |
| `phone/phone-01.png` … `phone-08.png` | 1080×1920, 24-bit PNG | Phone screenshots (upload in this order) |

Launcher and splash art stay in `android/app/src/main/res/` (`mipmap-*/ic_launcher*.png`, `drawable/ic_launcher_foreground_marble.png`). The Play icon is the same marble mark.

Phone shots are a random set of eight from `showcase-screenshots/` (seed `16112026`):

| Listing file | Source |
|--------------|--------|
| `phone-01.png` | `07-this-week` (dark) |
| `phone-02.png` | `05-whats-broken` (paper) |
| `phone-03.png` | `02-shop` (paper) |
| `phone-04.png` | `03-the-agent` (light) |
| `phone-05.png` | `10-hours` (dark) |
| `phone-06.png` | `08-order` (paper) |
| `phone-07.png` | `04-dads-chicken` (dark) |
| `phone-08.png` | `09-the-window` (light) |
