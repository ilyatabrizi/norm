# NORM — Tabriz, Valiasr

A dark, installable web app for NORM Unity: the card, ordering ahead, and a
one-tap check-in that shows who is in the room. No accounts, no points, no
loyalty scheme — the client asked for none, and there is none.

**The app is in Persian, right to left.** Set in IRANYekanX; the drink names are
the one thing left in Latin, because that is how they are written on the board.

v2 rebuilds the layout on Code Concept's structure — full-bleed bands of tone,
numbered section heads, a marquee, editorial photography — and takes a step out
of every interaction it could.

**Live:** https://ilyatabrizi.github.io/norm/
**Instagram:** [@norm_unity](https://instagram.com/norm_unity)

---

## Run it

```bash
python3 serve.py          # http://localhost:8101
python3 e2e.py            # 158 checks against the running preview
```

Static files, no build step, no dependencies at runtime. Only the asset
pipeline needs Python (Pillow) and the system Chrome.

---

## Persian

`<html lang="fa" dir="rtl">`, and the layout mirrors itself because it was
written in logical properties. What had to be done by hand is in one block at
the bottom of `css/app.css`, and it is short: the arrows and chevrons flip, the
bag badge swaps sides, the marquee keeps its own direction because it is a
one-way belt, and the Latin islands are isolated so the Persian around them
cannot drag their punctuation to the wrong end.

**Numbers are never converted in code.** IRANYekanX**FaNum** draws Latin digit
keystrokes as ۰–۹ itself, so `68000` is written once and is right everywhere. The
only thing `money()` changes is the separator — `٬`, which the font does not
touch and which is the Persian one.

**A price is not a Latin island.** «۶۸٬۰۰۰ تومان» is a Persian phrase: the number
is read first, so it sits on the right. Pinning it to `direction: ltr` moves the
number to the left of تومان, which is the one thing it must not do. The test
suite measures the glyph positions rather than trusting the markup.

**What stays in Latin:** the logo, the brand name, the `@handle`, and every drink
name — `Espresso`, `Flat White`, `Matcha Latte`. They keep Instrument Serif,
which is now the only job that face has, and the pairing of a Latin serif against
Persian sans is the design read the other way round. The description under each
one is Persian.

Persian sets differently and the type scale follows: lighter weights, more
leading (1.85 against Latin's 1.6), no tracked-out uppercase labels — Persian has
no capitals — and the display face is weight and size rather than a serif.

## The chrome, and why it moves on a phone

`position: fixed` is fixed to the *layout* viewport, which on a phone is not what
you are looking at. Two things moved the tab bar and both read as bugs: Safari's
toolbar grows back the moment a page stops being scrollable, so walking from the
card to an almost-empty bag changed the visible height under a bar that had not
moved; and the keyboard put the bar on top of the note field in the bag.

`js/chrome.js` publishes `--vv-bottom` from `visualViewport`, the bar is offset
by it, and when the lost height is keyboard-sized the bar leaves the screen
entirely — which is what an iOS app does.

Three smaller ones went with it: the pill under the active tab used to stay where
it was on a screen that owns no tab (check-in, a sent order), so returning flew
it across an empty bar — it is now parked without animating; it escaped the bar's
own rounded corner on the end tabs; and every screen was padded twice at the
bottom, once by its last band and once by `#view`.

**The tab bar restores where you were. A link into a screen starts at the top.**

## The design

Laid out the way Code Concept is, in NORM's own colours. The page does not sit
in a stack of cards any more — it **falls through full-bleed bands of tone**,
each opened by a numbered head (`THE ROOM · 01 / 04`), each one a subject:

| | |
|---|---|
| Hero | The photograph, full bleed, fading into the page. The lockup, the line, whether the door is open, and two buttons. |
| 01 | **The room** — who is in, the seat count, the hour a check-in holds |
| 02 | **The card** — four drinks, each one tap from the bag |
| 03 | **Matcha** — the one cream band on the page |
| 04 | **Find us** — address, today's hours, Instagram |

A marquee runs under the hero. Photographs sit in `.frame` blocks at a fixed
ratio with a caption burnt into the bottom. Everything below the fold arrives
on an IntersectionObserver, 22px up and faded.

**Cream is the light band.** Code Concept alternates black and white; NORM is a
dark room, so the light band is the cream that already carries every action.
The top bar flips to dark ink over it, the way Code Concept's flips over white.

**The green is an accent, not a system.** The dot that says the door is open,
the dot on the room count, the hour meter while you are checked in, the check-in
chip in the top bar, and the pupils of the mark when the app is holding your
seat. That is the whole list — if a sixth use creeps in, take it out.

| | |
|---|---|
| Page | `#12100E` — black, but roasted, not blue |
| Deep | `#090807` — the band under it |
| Cream | `#F4F0E9` — the light band, and every filled control |
| Ink | `#F4F0E9` on dark, `#12100E` on cream |
| Green | `#2E6C54` · `#8FC3AB` where it has to be read on black |
| Interface | IRANYekanXFaNum — body, prices, buttons, labels, every Persian word |
| Display | IRANYekanXFaNum Light, large — page titles and section headlines |
| Latin | Instrument Serif — the drink names, and nothing else |

Four weights of IRANYekanXFaNum plus the serif, self-hosted, 136KB for the set.
The Persian faces come from `templates/fonts/`; `scripts/fetch_fonts.py` still
rebuilds the Latin one.

There is **no monospace anywhere** — it makes a café read like a dashboard, and
the test suite fails the build if any appears. Code Concept sets its eyebrows in
Michroma and greys its photographs; NORM does neither. The labels are Jakarta at
600 with wide tracking, and the photographs keep their own colour.

## What a customer actually does

Every screen is one level deep. Nothing opens in front of anything.

- **Adding a drink is one tap.** The plus puts it in the bag as it comes, the
  button flashes cream, a toast says so. There is no sheet, no size question, no
  confirm step. The bottom sheet that used to stand between the card and the bag
  is gone from the codebase.
- **The choices moved to the bag.** Milk, strength, serve, size and sweetness
  fold out of the line under *Change*, on the screen where you were already
  reviewing the order. Change one and, if the line becomes identical to another,
  the two fold together.
- **The chips on the card filter.** Pressing *Matcha* shows the matcha and hides
  the rest, rather than scroll-spying a strip against the page. Search runs
  across the whole card regardless of which chip is pressed.
- **Four tabs: Home, Menu, Bag, You.** The bag is a place, not a floating dock —
  the dock, the header bag button and the badge were three ways to the same
  screen, and now there is one.
- **Check-in is a chip in the top bar, on every screen.** It reads `4 here`
  before you are in and turns green — `You're in · 47m` — once you are. That is
  more present than the tab it replaced, and it costs no room at the bottom.
- **Your name is two fields on the page**, saved as you type. No sheet, no Save.

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

Tap the mark when you sit down. **That is the whole interaction** — no name, no
reason, no account, nothing in the way. It holds your seat for **60 minutes** on
a meter that empties as the hour goes, and then retires itself so the room list
can never go stale. *Another hour* extends it; tapping the mark again is how you
leave early.

The chip in the top bar is the front door, on every screen: `4 here` before you
are in, green and counting — `You're in · 47m` — once you are.

What is shared: the arrival time, and a first name only if one was typed into
the You tab. Anyone who has not bothered shows up as *You* to themselves and
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
| Bag | `localStorage` | sending an order, or You → clear |
| First name, optional phone | `localStorage` | You → clear |
| Last 20 orders | `localStorage` | You → clear |
| Check-in | `localStorage` (or the shared endpoint) | checking out, or the hour running out |

Nothing is uploaded, there is no sign-up, and there is no loyalty or points
system anywhere in the app.

---

## Installing

`manifest.webmanifest` ships 14 icons including a maskable pair and a
monochrome silhouette. On the home screen it is called **NORM**. iOS is handled
too — `apple-touch-icon`, standalone capability, black translucent status bar,
and a viewport that covers the notch. You → *Add NORM to your home screen*
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
| The four bands on the home page | `js/views/home.js` |
| The marquee lines | `js/views/home.js` → `SAID` |
| Hours, address, Instagram, phone, seat count | `js/config.js` |
| Check-in length, demo roster | `js/config.js` → `CHECKIN` |
| Tables, pickup slots, prep time | `js/config.js` → `ORDER` |
| Colours, type, spacing | `css/app.css` → `:root` |
| Anything written in Persian | the view it appears in, and `js/data.js` |

---

## Still placeholder

- The **card**: real names, real prices, real descriptions. The 27 items in
  `js/data.js` are examples in the right shape.
- **Hours** — currently 08:00–23:30, midnight on Friday and Saturday.
- **Phone number** — `BUSINESS.phone` is empty, so the row is hidden.
- **Exact address and pin** — currently the Valiasr district centre.
- **Photography** — the client sent two frames. The hero is the largest clean
  rectangle in the matcha one (734×1240, cropped past the burnt-in type), and
  the matcha band reuses the same shoot, so the two read as one photograph twice.
  **Ask for three or four more frames** — the room, the bar, a pour — and the
  bands stop repeating. Anything new drops into `scripts/` and is picked up by
  `build_assets.py`; the test suite fails any frame drawn past 1.7× its own
  pixels.

---

## Tests

`e2e.py` drives a real mobile Chrome through the whole app — boot, the four
bands and their numbers, the tone flip under the top bar, the card, search, chip
filtering, one-tap adding, the choices in the bag, the order code, check-in,
extend, leave, you, clearing data, deep links, four viewport widths, the manifest
and every icon. 158 checks. It fails on any console error, on any monospace
creeping back into the interface, on a photograph drawn past its own pixels, and
on a second tap producing two drinks — the delegated listener on a reused
`#view` is the bug that catches.

```bash
python3 e2e.py                                       # local
python3 e2e.py https://ilyatabrizi.github.io/norm/   # the deployed build
```

Screenshots land in `scripts/shots/`.

---

Built by Alpha Agency.
