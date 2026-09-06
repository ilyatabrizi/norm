#!/usr/bin/env python3
"""End-to-end checks for the NORM PWA.

    python3 serve.py &                                # or run it in another shell
    python3 e2e.py                                    # local preview
    python3 e2e.py https://ilyatabrizi.github.io/norm/   # the deployed build

Drives a real mobile browser through every screen and every action a customer
would take — boot, the bands on the home page, the card, one-tap adding, the
bag and its choices, the order code, check-in, you — and fails loudly on
anything broken.  Uses the system Chrome through Playwright.

Screenshots land in scripts/shots/.
"""
from __future__ import annotations

import json
import pathlib
import re
import sys
import urllib.error
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8101/").rstrip("/") + "/"
SHOTS = pathlib.Path(__file__).resolve().parent / "scripts" / "shots"

PASS: list[str] = []
FAIL: list[str] = []


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name if cond else f"{name}  →  {detail}")


def settle(page, ms=340):
    page.wait_for_timeout(ms)


def goto(page, hash_path, ms=520):
    page.evaluate("h => { location.hash = h; }", hash_path)
    settle(page, ms)


def shot(page, name):
    SHOTS.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(SHOTS / f"{name}.png"))


def head_ok(url):
    try:
        req = urllib.request.Request(url, method="HEAD")
        with urllib.request.urlopen(req, timeout=8) as r:
            return r.status == 200
    except Exception:
        return False


# ---------------------------------------------------------------- the run
def main():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        sys.exit("pip3 install playwright")

    try:
        urllib.request.urlopen(BASE, timeout=5)
    except (urllib.error.URLError, OSError) as e:
        sys.exit(f"cannot reach {BASE} — run `python3 serve.py` first ({e})")

    errors: list[str] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome")
        ctx = browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=2, is_mobile=True, has_touch=True,
            user_agent=("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                        "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile Safari/604.1"),
        )
        page = ctx.new_page()
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))

        # ------------------------------------------------------------ boot
        page.goto(BASE, wait_until="load")
        check("boot screen is in the first paint", page.locator("#boot").count() == 1)
        check("boot mark is inlined, not fetched",
              page.locator("#boot-mark svg").count() == 1)
        check("boot wordmark is inlined",
              page.locator("#boot-word svg").count() == 1)
        check("boot draws the green pupils",
              page.locator("#boot-mark .pupil").count() == 2)
        settle(page, 700)
        shot(page, "00-boot")
        page.wait_for_selector("#boot[hidden]", state="attached", timeout=6000)
        check("boot clears itself", page.locator("#boot[hidden]").count() == 1)

        # ----------------------------------------------------------- fonts
        fonts = page.evaluate("""() => {
            const want = ['Jakarta','Instrument'];
            return want.map(f => document.fonts.check(`16px "${f}"`));
        }""")
        check("both faces load", all(fonts), str(fonts))

        # --------------------------------------------------------- manifest
        man = json.loads(urllib.request.urlopen(BASE + "manifest.webmanifest", timeout=8).read())
        check("manifest name is NORM Unity", man["name"] == "NORM Unity", man["name"])
        check("home-screen name is NORM", man["short_name"] == "NORM", man["short_name"])
        check("manifest is standalone", man["display"] == "standalone")
        check("manifest theme is the room", man["theme_color"] == "#12100E",
              man["theme_color"])
        check("manifest ships 14 icons", len(man["icons"]) == 14, str(len(man["icons"])))
        missing = [i["src"] for i in man["icons"] if not head_ok(BASE + i["src"])]
        check("every manifest icon exists", not missing, str(missing))
        check("a maskable icon is declared",
              any("maskable" in i.get("purpose", "") for i in man["icons"]))
        check("apple touch icon exists", head_ok(BASE + "assets/icons/apple-touch-icon.png"))
        check("manifest has shortcuts", len(man.get("shortcuts", [])) == 2)

        meta = page.evaluate("""() => ({
            theme: document.querySelector('meta[name=theme-color]')?.content,
            title: document.querySelector('meta[name="apple-mobile-web-app-title"]')?.content,
            cap: document.querySelector('meta[name="apple-mobile-web-app-capable"]')?.content,
            viewport: document.querySelector('meta[name=viewport]')?.content,
            manifest: !!document.querySelector('link[rel=manifest]'),
        })""")
        check("theme-color meta matches", meta["theme"] == "#12100E", str(meta["theme"]))
        check("iOS home-screen title is NORM", meta["title"] == "NORM", str(meta["title"]))
        check("iOS standalone capable", meta["cap"] == "yes")
        check("viewport covers the notch", "viewport-fit=cover" in (meta["viewport"] or ""))
        check("manifest is linked", meta["manifest"])

        # ------------------------------------------------------------ home
        goto(page, "#/")
        check("the hero fills the first screen",
              abs(page.locator(".hero").bounding_box()["height"]
                  - page.evaluate("() => innerHeight")) < 2,
              str(page.locator(".hero").bounding_box()))
        check("the hero photograph decodes",
              page.evaluate("""() => {
                  const i = document.querySelector('.hero__media img');
                  return !!i && i.naturalWidth > 0;
              }"""))
        check("the photograph sits under the gradient, not past it",
              page.evaluate("""() => {
                  const m = document.querySelector('.hero__media');
                  const i = m.querySelector('img');
                  return Math.abs(i.getBoundingClientRect().height
                                  - m.getBoundingClientRect().height) < 2;
              }"""))
        check("home hero draws the mark", page.locator(".hero__mark svg").count() == 1)
        check("home hero draws the wordmark", page.locator(".hero__word svg").count() == 1)
        check("hero names the district",
              "VALIASR" in page.locator(".hero__meta .label").inner_text().upper())
        check("the hero offers the card and the check-in",
              page.locator(".hero__cta a").count() == 2)
        check("a marquee runs under the hero", page.locator(".marquee__item").count() >= 12)

        # the page falls through four numbered bands
        heads = [h.strip().lower() for h in page.locator(".sechead .label").all_inner_texts()]
        check("home is four numbered sections",
              heads == ["the room", "the card", "matcha", "find us"], str(heads))
        idx = [i.strip() for i in page.locator(".sechead .idx").all_inner_texts()]
        check("each section carries its number",
              idx == ["01 / 04", "02 / 04", "03 / 04", "04 / 04"], str(idx))
        tones = page.evaluate("""() => [...document.querySelectorAll('#view [data-tone]')]
            .map(e => e.dataset.tone)""")
        check("the bands alternate tone, cream included",
              tones == ["paper", "paper", "deep", "paper", "cream", "paper"], str(tones))

        room_n = page.evaluate("() => JSON.parse(localStorage.getItem('norm.v1.room')||'[]')"
                               ".filter(p => p.until > Date.now()).length")
        shown = int(page.locator(".room-n").inner_text().strip() or 0)
        check("home counts the room in words", shown == room_n, f"{shown} vs {room_n}")
        check("the room names a few regulars", page.locator(".room-who").count() == 1)
        check("home lists four signature drinks",
              page.locator(".mlist .mitem").count() == 4,
              str(page.locator(".mlist .mitem").count()))
        # walk the whole page once so the lazy frames actually fetch
        page.evaluate("""async () => {
            for (let y = 0; y < document.body.scrollHeight; y += innerHeight * 0.8) {
                scrollTo(0, y);
                await new Promise(r => setTimeout(r, 90));
            }
            scrollTo(0, 0);
        }""")
        settle(page, 900)
        photos = page.evaluate("""() => [...document.images]
            .map(i => ({src: i.currentSrc.split('/').pop(), w: i.naturalWidth,
                        drawn: Math.round(i.getBoundingClientRect().width * devicePixelRatio)}))""")
        check("every photograph decodes", all(p["w"] > 0 for p in photos), str(photos))
        check("the client's frames are never drawn past their own pixels",
              all(p["drawn"] <= p["w"] * 1.7 for p in photos if p["w"]),
              str([(p["src"], p["drawn"], p["w"]) for p in photos]))
        check("instagram handle is right",
              page.locator("a[href*='instagram']").first.get_attribute("href")
              .endswith("norm_unity"))
        shot(page, "01-home")

        # scrolled: the header takes on glass, and flips over the cream band
        page.evaluate("scrollTo(0, 900)")
        settle(page)
        check("header goes glass on scroll", page.locator("#bar.solid").count() == 1)
        shot(page, "02-home-scrolled")
        cream_top = page.evaluate("""() => {
            const b = [...document.querySelectorAll('[data-tone=cream]')][0];
            return b.getBoundingClientRect().top + scrollY;
        }""")
        page.evaluate("y => scrollTo(0, y + 200)", cream_top)
        settle(page, 450)
        check("the bar flips over the cream band",
              page.locator("#bar.on-cream").count() == 1)
        shot(page, "03-home-cream")
        page.evaluate("scrollTo(0, 0)")
        settle(page)

        # ------------------------------------------------------------ tabs
        tabs = page.locator(".tabs .tab")
        check("four tabs", tabs.count() == 4, str(tabs.count()))
        labels = [t.strip().lower() for t in page.locator(".tab-label").all_inner_texts()]
        check("tabs are home/menu/bag/you",
              labels == ["home", "menu", "bag", "you"], str(labels))
        check("home tab is current",
              page.locator('.tab[data-tab="home"][aria-current="page"]').count() == 1)
        ink_home = page.evaluate("() => document.querySelector('#tabs-ink').style.transform")

        # the check-in chip rides the top bar on every screen
        check("the check-in chip is in the bar", page.locator("#ci-chip").count() == 1)
        check("the chip counts the room when you are not in it",
              bool(re.match(r"^\d+ here$|^Check in$",
                            page.locator("#ci-chip-label").inner_text().strip())),
              page.locator("#ci-chip-label").inner_text())

        # ------------------------------------------------------------ menu
        page.locator('.tab[data-tab="menu"]').click()
        settle(page, 600)
        check("menu tab becomes current",
              page.locator('.tab[data-tab="menu"][aria-current="page"]').count() == 1)
        ink_menu = page.evaluate("() => document.querySelector('#tabs-ink').style.transform")
        check("the cream capsule moves with the tab", ink_home != ink_menu,
              f"{ink_home} == {ink_menu}")
        check("all plus five categories", page.locator(".catbar .chip").count() == 6)
        check("the chip strip keeps its gutter on the first paint",
              page.evaluate("() => document.querySelector('.catbar').scrollLeft") == 0)
        rows = page.locator(".msec .mitem").count()
        check("the whole card renders", rows == 27, str(rows))
        prices = page.locator(".mitem__p").all_inner_texts()
        check("every row is priced", all(re.match(r"^[\d,]+ T$", p.strip()) for p in prices),
              str(prices[:3]))
        check("prices are Latin digits, grouped", all("," in p for p in prices))
        check("nothing in the interface is set in a monospace",
              page.evaluate("""() => ![...document.querySelectorAll('body *')]
                  .some(el => /mono|courier/i.test(getComputedStyle(el).fontFamily))"""))
        shot(page, "04-menu")

        # search runs across the whole card, not just the chosen chip
        page.fill("#q", "matcha")
        settle(page)
        hits = page.locator(".mitem:not(.is-hidden)").count()
        check("search finds the matcha", hits >= 4, str(hits))
        page.fill("#q", "zzzz")
        settle(page)
        check("search says so when nothing matches",
              page.locator("#empty").is_visible())
        page.fill("#q", "")
        settle(page)
        check("clearing search restores the card",
              page.locator(".mitem:not(.is-hidden)").count() == 27)

        check("the card opens on All",
              page.locator('.catbar .chip[aria-pressed="true"]').inner_text().strip() == "All")

        # a chip narrows the card to one section
        page.locator('.catbar .chip[data-cat="matcha"]').click()
        settle(page, 800)
        shown_secs = page.evaluate("""() => [...document.querySelectorAll('.msec')]
            .filter(s => !s.hidden).map(s => s.dataset.sec)""")
        check("a chip filters the card down to its section",
              shown_secs == ["matcha"], str(shown_secs))
        check("the pressed chip is the one you tapped",
              page.locator('.catbar .chip[aria-pressed="true"]').inner_text().strip() == "Matcha")
        page.locator('.catbar .chip[data-cat="all"]').click()
        settle(page, 700)
        check("All puts the whole card back",
              page.evaluate("""() => [...document.querySelectorAll('.msec')]
                  .filter(s => !s.hidden).length""") == 5)
        page.evaluate("scrollTo(0,0)")
        settle(page)

        # ------------------------------------------------------ one tap add
        check("nothing stands between the card and the bag — no sheet exists",
              page.locator(".sheet").count() == 0)
        page.locator('.mitem[data-item="matcha-latte"] .add').click()
        settle(page, 500)
        check("adding opens nothing", page.locator(".sheet, .scrim").count() == 0)
        check("a toast confirms", page.locator(".toast").count() >= 1)
        check("the button flashes",
              page.locator('.mitem[data-item="matcha-latte"] .add.done').count() == 1)
        check("the bag badge counts the drink",
              page.locator("#bag-count").inner_text() == "1",
              page.locator("#bag-count").inner_text())
        check("the badge is shown", page.locator("#bag-count.on").count() == 1)
        page.locator('.mitem[data-item="matcha-latte"] .add').click()
        settle(page, 250)
        page.locator('.mitem[data-item="espresso"] .add').click()
        settle(page, 500)
        check("the same drink stacks rather than repeating",
              page.locator("#bag-count").inner_text() == "3",
              page.locator("#bag-count").inner_text())
        shot(page, "05-added")

        # ------------------------------------------------------------- bag
        page.locator('.tab[data-tab="bag"]').click()
        settle(page, 600)
        check("bag opens from its tab", "#/bag" in page.url)
        check("both lines are in the bag", page.locator(".line").count() == 2)
        check("a line opens at the drink as it comes",
              page.locator(".line").first.locator(".line-sum").inner_text()
              .startswith("Whole"),
              page.locator(".line").first.locator(".line-sum").inner_text())
        check("the choices are folded away until asked for",
              page.locator(".line-opts").first.is_hidden())
        check("the grand total adds up",
              page.locator("#t-grand").inner_text().startswith("384,000"),
              page.locator("#t-grand").inner_text())

        page.locator(".line").first.locator("[data-more]").click()
        settle(page, 400)
        check("Change opens the choices on the line",
              page.locator(".line-opts").first.is_visible())
        check("every group of that drink is offered",
              page.locator(".line").first.locator(".opt-group").count() == 4,
              str(page.locator(".line").first.locator(".opt-group").count()))
        shot(page, "06-bag-options")
        page.locator('.line [data-group="milk"] [data-choice="Oat"]').click()
        settle(page, 400)
        check("the choice reprices the line",
              page.locator(".line").first.locator(".line-price").inner_text()
              .startswith("346,000"),
              page.locator(".line").first.locator(".line-price").inner_text())
        check("the summary follows the choice",
              page.locator(".line").first.locator(".line-sum").inner_text().startswith("Oat"))
        check("only one choice per group is pressed",
              page.locator('.line [data-group="milk"] [aria-pressed="true"]').count() == 1)
        check("the total follows too",
              page.locator("#t-grand").inner_text().startswith("414,000"),
              page.locator("#t-grand").inner_text())

        page.locator(".line").first.locator(".qty [data-inc]").click()
        settle(page, 250)
        check("the stepper updates the grand total",
              page.locator("#t-grand").inner_text().startswith("587,000"),
              page.locator("#t-grand").inner_text())
        page.locator(".line").first.locator(".qty [data-dec]").click()
        settle(page, 250)

        check("table chips show for a table order",
              page.locator("[data-table]").count() == 10)
        check("check-in nudge shows when you are not in the room",
              page.locator("#nudge a").count() == 1)
        page.locator('[data-where="out"]').click()
        settle(page, 250)
        check("takeaway swaps tables for pickup times",
              page.locator("[data-slot]").count() == 8 and page.locator("[data-table]").count() == 0)
        slot_text = page.locator("[data-slot]").first.inner_text()
        check("pickup slots are clock times", bool(re.match(r"^\d{2}:\d{2}$", slot_text)), slot_text)
        page.locator('[data-where="in"]').click()
        settle(page, 250)
        page.locator('[data-table="4"]').click()
        page.fill("#note", "Less ice")
        settle(page, 150)
        shot(page, "07-bag")

        # ----------------------------------------------------------- order
        page.locator("#send").click()
        settle(page, 700)
        check("sending lands on the order", "#/order/" in page.url, page.url)
        code = page.locator("#code").inner_text().strip()
        check("the order has a four-digit code", bool(re.match(r"^\d{4}$", code)), code)
        check("the order says when it will be ready",
              "Ready in about" in page.locator("#eta").inner_text(),
              page.locator("#eta").inner_text())
        check("the table came through", "4" in page.locator(".list-value").first.inner_text())
        check("the note came through", "Less ice" in page.locator("#view").inner_text())
        check("the options came through", "Oat" in page.locator("#view").inner_text())
        check("the order totals correctly",
              page.locator(".total-row.grand span").last.inner_text().startswith("414,000"),
              page.locator(".total-row.grand span").last.inner_text())
        check("the bag empties after sending",
              page.locator("#bag-count.on").count() == 0)
        shot(page, "08-order")

        # -------------------------------------------------------- check-in
        page.locator("#ci-chip").click()
        settle(page, 700)
        check("the bar chip opens check-in", "#/checkin" in page.url)
        check("no tab is claimed by check-in",
              page.locator('.tab[aria-current="page"]').count() == 0)
        check("the dial starts off",
              page.locator('#dial[aria-pressed="false"]').count() == 1)
        check("the room lists people", page.locator(".person").count() >= 1)
        shot(page, "09-checkin-off")

        before_n = page.locator(".person").count()
        page.locator("#dial").click()
        settle(page, 1500)
        check("checking in asks for nothing at all", page.locator(".sheet").count() == 0)
        check("the dial turns on", page.locator('#dial[aria-pressed="true"]').count() == 1)
        check("the mark opens its eyes", page.locator(".ci.on").count() == 1)
        width = page.evaluate("""() => document.querySelector('.ci-meter i').style.width""")
        check("the hour meter starts full", width.startswith(("100", "99")), width)
        check("the card says you are in",
              "you are in" in page.locator("#ci-title").inner_text().strip().lower(),
              page.locator("#ci-title").inner_text())
        check("the hour is given as a clock time",
              bool(re.search(r"until \d{2}:\d{2}", page.locator("#ci-sub").inner_text())),
              page.locator("#ci-sub").inner_text())
        check("you join the room list", page.locator(".person").count() == before_n + 1)
        check("you are marked as you", page.locator(".person.me").count() == 1)
        check("an anonymous check-in reads as You",
              "You" in page.locator(".person.me").inner_text(),
              page.locator(".person.me").inner_text())
        check("leaving is offered", page.locator("#out").count() == 1)
        check("an extra hour is offered", page.locator("#extend").count() == 1)
        check("the bar chip goes green and starts counting",
              page.locator('#ci-chip[data-in="1"]').count() == 1)
        check("the chip says how long is left",
              bool(re.search(r"\d+m$", page.locator("#ci-chip-label").inner_text().strip())),
              page.locator("#ci-chip-label").inner_text())
        shot(page, "10-checkin-on")

        # the home count should now include you
        goto(page, "#/", 700)
        check("home says you are holding a seat",
              "HOLDING A SEAT" in page.locator("#room").inner_text().upper(),
              page.locator("#room").inner_text())
        shot(page, "11-home-checked-in")

        # extend, then leave
        goto(page, "#/checkin", 700)
        before = page.evaluate("""() => JSON.parse(localStorage.getItem('norm.v1.room'))
            .find(p => p.id === localStorage.getItem('norm.v1.meid')).until""")
        page.locator("#extend").click()
        settle(page, 500)
        after = page.evaluate("""() => JSON.parse(localStorage.getItem('norm.v1.room'))
            .find(p => p.id === localStorage.getItem('norm.v1.meid')).until""")
        check("extending pushes the hour back", after > before, f"{after} <= {before}")
        page.locator("#out").click()
        settle(page, 600)
        check("leaving turns the dial off",
              page.locator('#dial[aria-pressed="false"]').count() == 1)
        check("leaving clears you from the room",
              page.locator(".person.me").count() == 0)

        # --------------------------------------------------------- account
        page.locator('.tab[data-tab="account"]').click()
        settle(page, 600)
        check("you opens", "#/account" in page.url)
        check("the name is a field on the page, not behind a sheet",
              page.locator("#ac-name").count() == 1 and page.locator(".sheet").count() == 0)
        page.fill("#ac-name", "Ilya")
        page.fill("#ac-phone", "09141234567")
        settle(page, 800)
        check("typing saves it without a button",
              page.evaluate("""() => JSON.parse(
                  localStorage.getItem('norm.v1.profile')).name""") == "Ilya")
        page.reload()
        page.wait_for_selector("#boot[hidden]", state="attached", timeout=6000)
        goto(page, "#/account", 700)
        check("an optional name is remembered",
              page.input_value("#ac-name") == "Ilya", page.input_value("#ac-name"))
        check("the order is in the history",
              code in page.locator("#view").inner_text(), code)
        check("all seven days of hours are listed", page.locator(".hours-row").count() == 7)
        check("today is marked", page.locator(".hours-row.today").count() == 1)
        check("the address links to maps", page.locator("a[href*='maps.google']").count() == 1)
        check("install is offered", page.locator("#install").count() == 1)
        shot(page, "12-account")

        page.locator("a[href^='#/order/']").first.click()
        settle(page, 600)
        check("history opens the order again", "#/order/" in page.url)
        check("the code is the same", page.locator("#code").inner_text().strip() == code)

        # wipe
        goto(page, "#/account", 600)
        page.locator("#wipe").click()
        settle(page, 250)
        check("clearing arms before it fires",
              "Tap again" in page.locator("#wipe").inner_text())
        page.locator("#wipe").click()
        settle(page, 700)
        left = page.evaluate("""() => Object.keys(localStorage)
            .filter(k => k.startsWith('norm.v1.') && k !== 'norm.v1.meid'
                      && k !== 'norm.v1.room' && k !== 'norm.v1.booted')""")
        check("clearing really clears", left == [], str(left))

        # ------------------------------------------------------ empty bag
        goto(page, "#/bag", 600)
        check("an empty bag says so", "Nothing in it yet" in page.locator("#view").inner_text())
        check("the empty bag offers the card",
              page.locator("a[href='#/menu']").count() >= 1)

        # ------------------------------------------------------- deep link
        page.goto(BASE + "#/item/espresso", wait_until="load")
        page.wait_for_selector("#boot[hidden]", state="attached", timeout=6000)
        settle(page, 900)
        check("a shared drink link lands on the card, not in a modal",
              page.locator(".msec .mitem").count() == 27 and page.locator(".sheet").count() == 0)
        check("the shared drink is lit up",
              page.locator("#row-espresso.hit").count() == 1)
        check("the shared drink is on screen",
              page.evaluate("""() => {
                  const r = document.querySelector('#row-espresso').getBoundingClientRect();
                  return r.top > 0 && r.bottom < innerHeight;
              }"""))

        # ------------------------------------------- adding twice is stable
        # #view is reused between renders, so a listener bound there survives the
        # render that replaced its rows. Walk two views and count.
        page.evaluate("() => localStorage.removeItem('norm.v1.bag')")
        goto(page, "#/", 700)
        goto(page, "#/menu", 700)
        goto(page, "#/", 700)
        goto(page, "#/menu", 700)
        page.locator('.mitem[data-item="espresso"] .add').click()
        settle(page, 400)
        check("one tap is one drink, however many views were walked first",
              page.locator("#bag-count").inner_text() == "1",
              page.locator("#bag-count").inner_text())

        # ---------------------------------------------------------- layout
        for w, h, label in ((320, 700, "small"), (390, 844, "phone"),
                            (430, 932, "large"), (1280, 900, "desktop")):
            page.set_viewport_size({"width": w, "height": h})
            page.goto(BASE, wait_until="load")
            page.wait_for_selector("#boot[hidden]", state="attached", timeout=6000)
            settle(page, 400)
            over = page.evaluate("""() => {
                const d = document.documentElement;
                return d.scrollWidth - d.clientWidth;
            }""")
            check(f"no sideways scroll at {w}px ({label})", over <= 1, f"{over}px")
            tab_box = page.locator(".tabs").bounding_box()
            check(f"tab bar sits on screen at {w}px",
                  tab_box and tab_box["y"] + tab_box["height"] <= h + 1,
                  str(tab_box))
            if w >= 1280:
                shell = page.locator("#shell").bounding_box()
                check("desktop keeps the app in a phone-width column",
                      shell["width"] <= 460, str(shell["width"]))
            shot(page, f"13-layout-{w}")

        # ------------------------------------------------------------- pwa
        page.set_viewport_size({"width": 390, "height": 844})
        page.goto(BASE, wait_until="load")
        page.wait_for_selector("#boot[hidden]", state="attached", timeout=6000)
        sw = page.evaluate("""async () => {
            const r = await navigator.serviceWorker.getRegistration();
            return !!r;
        }""")
        check("the service worker registers", sw)

        # ------------------------------------------------------- accessible
        unnamed = page.evaluate("""() => [...document.querySelectorAll('button, a')]
            .filter(el => !el.textContent.trim() && !el.getAttribute('aria-label'))
            .map(el => el.className || el.tagName)""")
        check("every control has a name", not unnamed, str(unnamed))
        check("the page declares its language",
              page.evaluate("() => document.documentElement.lang") == "en")
        check("no control is smaller than a fingertip",
              page.evaluate("""() => [...document.querySelectorAll('.add, .qty button, .tab, .btn')]
                  .every(el => {
                      const r = el.getBoundingClientRect();
                      return r.width === 0 || (r.width >= 30 && r.height >= 30);
                  })"""))

        check("no console errors anywhere in the run", not errors, "; ".join(errors[:3]))

        browser.close()

    print(f"\n  {len(PASS)} passed, {len(FAIL)} failed\n")
    for f in FAIL:
        print(f"  ✗ {f}")
    if not FAIL:
        print("  all good")
    print()
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main()
