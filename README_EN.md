# WaveWriter Alpha Delays

[Español](README.md) · **English**

## 👉 [Open the app: https://elb105.github.io/wavewriter-delay-app/](https://elb105.github.io/wavewriter-delay-app/)

<img src="icons/qr-app.png" alt="QR code that opens https://elb105.github.io/wavewriter-delay-app/" width="220">

Scan the QR code with your phone camera to open the app.

Installable web app (PWA) that shows how to program areas A–D of the Boston
Scientific WaveWriter Alpha to obtain a given delay between the first and the
last stimulus. It works on Windows, macOS, iOS and Android, and offline once
installed. The interface is available in Spanish and English (ES / EN buttons at
the top right). The first time it opens it shows a skippable tutorial; it can be
viewed again with the **?** button.

Edge cases worth testing on the stimulator (in Spanish): [CASOS_LIMITE.md](CASOS_LIMITE.md).

## What it does

The user enters:

* pulse width and amplitude of the first area (A) and of the last area;
* desired delay between the start of the pulse of A and that of the last area (µs);
* frequency (from the list of values the device offers);
* contact (1–32) connected to each area.

The app works out which areas are switched on, which one is the last (B, C or D)
and the pulse width of the intermediate areas, which are set to 0.1 mA (the
device minimum) only to add delay. Frequency and contacts do not change the
calculation: they are stored in the log, and the frequency triggers warnings if
the cycle does not fit in the period or if limitations were observed at that
frequency during the characterization.

## Model

Measured with the Power 1401 / Spike2 at 20 Hz (REWIRE report, 16-11-2026):

    start of next area = start of previous area + width of previous area + 3010 µs

The manufacturer states 3000 µs; the value can be changed in “Advanced settings”.

### Configurable delays

The delay cannot take any value. In 10 µs steps:

| Last area | With A = 250 µs | Changing the width of A (20–1000 µs) |
| --- | --- | --- |
| A → B | 3260 µs | 3030 – 4010 µs |
| A → C | 6290 – 7270 µs | 6060 – 8020 µs |
| A → D | 9320 – 11 280 µs | 9090 – 12 030 µs |

The app shows these ranges in the “Configurable delays” section. If the
requested delay is not configurable, it shows no programming at all: it says so
in red, offers the closest configurable delays and the width of A that would
make it possible.

The rule holds in every 20 Hz test with an error below 1 µs. At 150 Hz it did not
hold (Test 5), because the calculated cycle did not fit in the period; the app
warns about this. Device limits: width 20–1000 µs (10 µs steps), amplitude
0.1–25.5 mA (0.1 mA steps), frequency 2–1200 Hz.

## Test log

“Save test” stores the configuration, contacts, frequency, an identifier and
notes on the device itself. The log can be exported to CSV (for Excel, `;`
separator) and backed up as JSON to move it to another device (“Restore backup”
merges it without duplicates).

## Installation

**App address: https://elb105.github.io/wavewriter-delay-app/**

Nothing else needs to be installed (no Python, no libraries): a browser is
enough. From that address:

| System | Browser | How to install |
| --- | --- | --- |
| Windows | Edge or Chrome | The app's “Install” button, or the install icon in the address bar |
| macOS | Chrome or Edge | Same as on Windows |
| macOS | Safari 17+ | File → Add to Dock |
| iOS / iPadOS | Safari | Share → Add to Home Screen |
| Android | Chrome | “Install” button or ⋮ menu → Install app |

Without publishing, it can be used on a computer by double-clicking
`index.html` (everything works except installation and offline mode), or with a
local server:

    py -3.11 -m http.server 8765

and opening http://localhost:8765.

## Related project

The delay model comes from the analysis of the Power 1401 recordings, in the
repository [elb105/wavewriter-delay-analysis](https://github.com/elb105/wavewriter-delay-analysis)
(private). Both are part of the REWIRE / CONECTOMA project of the B105 Laboratory.

## Files

* `calc.js`: calculation model (no dependencies).
* `i18n.js`: Spanish and English texts.
* `app.js`, `index.html`, `styles.css`: user interface.
* `tour.js`: guided tutorial shown on the first visit.
* `manifest.webmanifest`, `sw.js`, `icons/`: installation and offline use.
  When publishing a new version, change `CACHE` in `sw.js` (e.g. `ww-delay-v6`).
* `tools/make_qr.py`: generates `icons/qr-app.png` and `icons/qr-app.svg`
  (`py -3.11 tools/make_qr.py`; only needs Pillow).
