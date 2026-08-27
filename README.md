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

Black room, white type, one green. `#2C6650` is lifted straight out of the
pupils in the logo, and in the interface it is spent only on the things that
are alive: the door being open, the tab you are on, the option you picked, the
hour you are holding a seat for. Everything else is ink and hairlines.

| | |
|---|---|
| Void | `#08090A` — the page |
| Paper | `#F2F4F1` — type |
| Green | `#2C6650` brand · `#7FC0A2` where green has to be read on black |
| Display | Bodoni Moda — drink names, statements |
| Interface | Jost — body, buttons |
| Numbers | IBM Plex Mono — prices, clocks, labels, counters |

All three faces are self-hosted and subset to the characters the app can
actually render (57KB for the set). `scripts/fetch_fonts.py` rebuilds them.

Shape language is deliberately sharp — 3 to 12px radii, hairline rules, an
editorial grid — with the one soft object being the glass tab bar and the
check-in dial. Photography is monochrome by build, not by CSS filter, so the
client's warm Instagram frames sit inside the palette instead of fighting it.

---

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
word arrives, then the whole thing blinks once and steps aside. About two
seconds on a cold start, 900ms on a warm one. It respects
`prefers-reduced-motion` and skips entirely.

---

## Check-in

Tap the dial when you sit down. It holds your seat for **60 minutes**, counting
down on the ring, and then retires itself so the room list can never go stale.
`+ 60 min` extends; the dial taps off on the way out.

What is shared: a first name, what you are here for, and the arrival time.
Nothing else, and it clears itself when the hour is up.

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

`sw.js` precaches the shell, the fonts, the logo and the photographs, so it
opens offline. HTML is network-first, so a redeploy is picked up on the next
open. On `localhost` the worker goes network-first for everything, so editing a
file and reloading always shows the edit. **Bump `VERSION` in `sw.js` when
deploying a change to the cached files.**

---

## Editing

| Change | File |
|---|---|
| Menu, prices, options | `js/data.js` |
| Hours, address, Instagram, phone, seat count | `js/config.js` |
| Check-in length, moods, demo | `js/config.js` → `CHECKIN` |
| Tables, pickup slots, prep time | `js/config.js` → `ORDER` |
| Colours, type, spacing | `css/app.css` → `:root` |

---

## Still placeholder

- The **card**: real names, real prices, real descriptions. The 27 items in
  `js/data.js` are examples in the right shape.
- **Hours** — currently 08:00–23:30, midnight on Friday and Saturday.
- **Phone number** — `BUSINESS.phone` is empty, so the row is hidden.
- **Exact address and pin** — currently the Valiasr district centre.
- **Photography** — the two frames the client sent. Anything new drops into
  `scripts/` and gets picked up by `build_assets.py`.

---

## Tests

`e2e.py` drives a real mobile Chrome through the whole app — boot, card,
search, item sheet, bag, order code, check-in, the hour ticking, extend, check
out, account, clearing data, deep links, four viewport widths, the manifest and
every icon, and fails on any console error.

```bash
python3 e2e.py                                       # local
python3 e2e.py https://ilyatabrizi.github.io/norm/   # the deployed build
```

Screenshots land in `scripts/shots/`.

---

Built by Alpha Agency.
