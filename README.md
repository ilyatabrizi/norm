# NORM — Tabriz, Valiasr

A dark, installable web app for NORM Unity: the card, ordering ahead, and a
one-tap check-in that shows who is in the room. No accounts, no points, no
loyalty scheme — the client asked for none, and there is none.

**Live:** https://ilyatabrizi.github.io/norm/
**Instagram:** [@norm_unity](https://instagram.com/norm_unity)

---

## Run it

```bash
python3 serve.py          # http://localhost:8101
python3 e2e.py            # 118 checks against the running preview
```

Static files, no build step, no dependencies at runtime. Only the asset
pipeline needs Python (Pillow) and the system Chrome.

---

## The design

A dark room: warm black page, cards lifted just off it, and the green out of the
logo doing the work that black does in a light app — the button you press, the
tab you are on, the option you picked, the seat you are holding. Photographs
keep their own colour, and gain from the dark around them.

| | |
|---|---|
| Page | `#12100E` — black, but roasted, not blue |
| Card | `#1C1917` with a hairline edge |
| Ink | `#F4F0E9` — type |
| Green | `#2E6C54` actions · `rgba(46,108,84,.26)` soft fills · `#8FC3AB` green as type |
| Interface | Plus Jakarta Sans — body, prices, buttons, labels |
| Display | Instrument Serif — page titles and drink names |

Two faces, self-hosted and subset to the characters the app can actually render
(27KB for the pair). `scripts/fetch_fonts.py` rebuilds them.

Every screen opens with a serif page title, then stacks cards on the page:
rounded 24px, a hairline edge, a soft shadow under it. Rows inside a card are
separated by hairlines, each one starting with a round tinted icon. Chips and buttons are
full pills. There is no monospace anywhere — it makes a café read like a
dashboard — and the test suite fails the build if any appears.

## The logo

The only master available was a phone-sized JPEG. `scripts/trace_logo.py`
thresholds it, walks every ink boundary as a crack path, simplifies with
Douglas-Peucker, rounds the corners back into curves and writes vector:

- `assets/brand/mark.svg` — the symbol, with the two pupils as their own paths
  so the opening animation can dilate them separately
- `assets/brand/wordmark.svg` — NORM UNITY, one path per letter
- `assets/brand/lockup.svg` — both, for the icon and the share card

The dot above the mark is emitted as a true circle: the source JPEG has a gloss
highlight on it that traces as a notch.

`scripts/build_assets.py` runs the tracer, inlines the mark and wordmark into
`index.html` and `js/brand.js` (so the opening animation runs on the first
frame with nothing left to fetch), converts the photographs, and renders every
icon size, the maskable pair and the OG card through headless Chrome.

```bash
python3 scripts/build_assets.py
```

---

## The opening

The mark's eyes open from a closed line, the pupils dilate, the dot drops, the
word arrives, then the whole thing blinks once and steps aside. About
two seconds on a cold start, 900ms on a warm one. It respects
`prefers-reduced-motion` and skips entirely.

---

## Check-in

Tap the dial when you sit down. **That is the whole interaction** — no name, no
reason, no account, no sheet in the way. It holds your seat for **60 minutes** on
a ring that empties as the hour goes, and then retires itself so the room list
can never go stale. *Another hour* extends it; tapping the dial again is how you
leave early.

What is shared: the arrival time, and a first name only if one was typed into
Account. Anyone who has not bothered shows up as *You* to themselves and
*Someone* to the room.

Presence is **device-local by default** — it uses `localStorage` plus a
`BroadcastChannel`, so two tabs on one phone agree. To make the room shared
across everybody's phones, point `CHECKIN.endpoint` in `js/config.js` at a REST
endpoint and swap the four calls in `js/presence.js` (`list`, `checkIn`,
`extend`, `checkOut`) for fetches. No view changes.

`CHECKIN.demo = true` seeds plausible regulars so the feature can be judged on
one phone, and the room breathes — someone arrives or leaves about every 45
seconds. **Turn it off the moment a real endpoint is live.**

---

## Ordering

The bag builds an order, and sending it produces a four-digit code and a status
screen. There is no till integration and no payment: the order is a slip on the
customer's phone that the cashier reads back, which is how the room actually
works today. Everything is stored on the device.

To wire it to a real bar: `placeOrder()` in `js/store.js` is the single place an
order is created — POST from there and give `js/views/order.js` a status to
poll.

---

## Data

| What | Where | Cleared by |
|---|---|---|
| Bag | `localStorage` | sending an order, or Account → clear |
| First name, optional phone | `localStorage` | Account → clear |
| Last 20 orders | `localStorage` | Account → clear |
| Check-in | `localStorage` (or the shared endpoint) | checking out, or the hour running out |

Nothing is uploaded, there is no sign-up, and there is no loyalty or points
system anywhere in the app.

---

## Installing

`manifest.webmanifest` ships 14 icons including a maskable pair and a
monochrome silhouette. On the home screen it is called **NORM**. iOS is handled
too — `apple-touch-icon`, standalone capability, black translucent status bar,
and a viewport that covers the notch. Account → *Add NORM to your home screen*
fires the native prompt on Android/Chrome and explains the two taps on iOS.

On the home screen the icon matches the app — the mark in cream on black, green
pupils. `sw.js` precaches the shell, the fonts, the logo and the photographs, so
it opens offline. HTML is network-first, so a redeploy is picked up on the next
open. On `localhost` the worker goes network-first for everything, so editing a
file and reloading always shows the edit. **Bump `VERSION` in `sw.js` when
deploying a change to the cached files.**

---

## Editing

| Change | File |
|---|---|
| Menu, prices, options | `js/data.js` |
| Hours, address, Instagram, phone, seat count | `js/config.js` |
| Check-in length, demo roster | `js/config.js` → `CHECKIN` |
| Tables, pickup slots, prep time | `js/config.js` → `ORDER` |
| Colours, type, spacing | `css/app.css` → `:root` |

---

## Still placeholder

- The **card**: real names, real prices, real descriptions. The 27 items in
  `js/data.js` are examples in the right shape.
- **Hours** — currently 08:00–23:30, midnight on Friday and Saturday.
- **Phone number** — `BUSINESS.phone` is empty, so the row is hidden.
- **Exact address and pin** — currently the Valiasr district centre.
- **Photography** — the two frames the client sent, at 659px and 1179px wide, so
  the layout never displays them larger than that. Anything new drops into
  `scripts/` and gets picked up by `build_assets.py`.

---

## Tests

`e2e.py` drives a real mobile Chrome through the whole app — boot, card, search,
item sheet, bag, order code, one-tap check-in, extend, leave, account, clearing
data, deep links, four viewport widths, the manifest and every icon. It fails on
any console error, and on any monospace creeping back into the interface.

```bash
python3 e2e.py                                       # local
python3 e2e.py https://ilyatabrizi.github.io/norm/   # the deployed build
```

Screenshots land in `scripts/shots/`.

---

Built by Alpha Agency.
