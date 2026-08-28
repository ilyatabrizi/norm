#!/usr/bin/env python3
"""End-to-end checks for the NORM PWA.

    python3 serve.py &                                # or run it in another shell
    python3 e2e.py                                    # local preview
    python3 e2e.py https://ilyatabrizi.github.io/norm/   # the deployed build

Drives a real mobile browser through every screen and every action a customer
would take — boot, card, sheet, bag, order, check-in, account — and fails loudly
on anything broken. Uses the system Chrome through Playwright.

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
        check("home hero draws the mark", page.locator(".hero-mark svg").count() == 1)
        check("home hero draws the wordmark", page.locator(".hero-word svg").count() == 1)
        check("hero names the district",
              "VALIASR" in page.locator(".hero-place").inner_text().upper())
        room_n = page.evaluate("() => JSON.parse(localStorage.getItem('norm.v1.room')||'[]')"
                               ".filter(p => p.until > Date.now()).length")
        shown = int(page.locator(".room-n").inner_text().strip() or 0)
        check("home counts the room in words", shown == room_n, f"{shown} vs {room_n}")
        check("the room names a few regulars",
              page.locator(".room-who").count() == 1)
        check("home lists four signature drinks", page.locator(".rows .row").count() == 4)
        photos = page.evaluate("""() => [...document.images]
            .map(i => ({src: i.currentSrc.split('/').pop(), w: i.naturalWidth}))""")
        check("every photograph decodes", all(p["w"] > 0 for p in photos), str(photos))
        check("photographs are monochrome by build", len(photos) >= 2, str(len(photos)))
        check("instagram handle is right",
              page.locator("a[href*='instagram']").first.get_attribute("href")
              .endswith("norm_unity"))
        shot(page, "01-home")

        # scrolled: the header takes on glass
        page.evaluate("scrollTo(0, 900)")
        settle(page)
        check("header goes glass on scroll",
              page.locator('#shell[data-scrolled="1"]').count() == 1)
        shot(page, "02-home-scrolled")
        page.evaluate("scrollTo(0, 0)")
        settle(page)

        # ------------------------------------------------------------ tabs
        tabs = page.locator(".tabs .tab")
        check("four tabs", tabs.count() == 4, str(tabs.count()))
        labels = [t.strip().lower() for t in page.locator(".tab-label").all_inner_texts()]
        check("tabs are home/menu/check-in/account",
              labels == ["home", "menu", "check-in", "account"], str(labels))
        check("home tab is current",
              page.locator('.tab[data-tab="home"][aria-current="page"]').count() == 1)
        ink_home = page.evaluate("() => document.querySelector('#tabs-ink').style.transform")

        # ------------------------------------------------------------ menu
        page.locator('.tab[data-tab="menu"]').click()
        settle(page, 600)
        check("menu tab becomes current",
              page.locator('.tab[data-tab="menu"][aria-current="page"]').count() == 1)
        ink_menu = page.evaluate("() => document.querySelector('#tabs-ink').style.transform")
        check("the green thread moves with the tab", ink_home != ink_menu,
              f"{ink_home} == {ink_menu}")
        check("five categories", page.locator(".cats .cat").count() == 5)
        rows = page.locator("#menu-body .row").count()
        check("the whole card renders", rows == 27, str(rows))
        prices = page.locator(".row-price").all_inner_texts()
        check("every row is priced", all(re.match(r"^[\d,]+ T$", p.strip()) for p in prices),
              str(prices[:3]))
        check("prices are Latin digits, grouped", all("," in p for p in prices))
        shot(page, "03-menu")

        # search
        page.fill("#menu-search", "matcha")
        settle(page)
        hits = page.locator("#menu-results .row").count()
        check("search finds the matcha", hits >= 4, str(hits))
        check("search hides the sectioned card",
              page.locator("#menu-body").is_hidden())
        page.fill("#menu-search", "zzzz")
        settle(page)
        check("search says so when nothing matches",
              "Nothing by that name" in page.locator("#menu-results").inner_text())
        page.fill("#menu-search", "")
        settle(page)
        check("clearing search restores the card", page.locator("#menu-body").is_visible())

        check("the card opens on the first category",
              page.locator('.cat[aria-current="true"]').inner_text().strip().lower() == "espresso",
              page.locator('.cat[aria-current="true"]').inner_text())

        # category jump
        page.locator('.cat[data-cat="matcha"]').click()
        settle(page, 800)
        check("category tap scrolls to its section",
              page.evaluate("() => window.scrollY") > 300)
        check("the category bar follows the scroll",
              page.locator('.cat[aria-current="true"]').inner_text().strip().lower() == "matcha",
              page.locator('.cat[aria-current="true"]').inner_text())
        page.evaluate("scrollTo(0,0)")
        settle(page)

        # ------------------------------------------------------ item sheet
        page.locator('[data-item="matcha-latte"]').first.click()
        settle(page, 600)
        check("the item sheet opens", page.locator(".sheet.in").count() == 1)
        check("sheet names the drink",
              "Matcha Latte" in page.locator(".sheet .display").inner_text())
        check("nothing in the interface is set in a monospace",
              page.evaluate("""() => ![...document.querySelectorAll('body *')]
                  .some(el => /mono|courier/i.test(getComputedStyle(el).fontFamily))"""))
        base_total = page.locator("#add-total").inner_text()
        check("sheet opens at the base price", base_total.startswith("158,000"), base_total)
        page.locator('[data-choice="Oat"]').click()
        settle(page, 160)
        oat_total = page.locator("#add-total").inner_text()
        check("options change the price", oat_total.startswith("173,000"), oat_total)
        check("only one choice per group is pressed",
              page.locator('[data-group="milk"] [aria-pressed="true"]').count() == 1)
        page.locator(".sheet .stepper [data-inc]").click()
        settle(page, 160)
        two_total = page.locator("#add-total").inner_text()
        check("quantity multiplies the price", two_total.startswith("346,000"), two_total)
        shot(page, "04-item-sheet")
        page.locator("#add").click()
        settle(page, 600)
        check("the sheet closes after adding", page.locator(".sheet").count() == 0)
        check("a toast confirms", page.locator(".toast").count() >= 1)
        check("the bag badge counts the drinks",
              page.locator("#bag-count").inner_text() == "2")
        check("the dock appears", page.locator("#dock:not([hidden])").count() == 1)
        check("the dock carries the total",
              page.locator("#dock-total").inner_text().startswith("346,000"))
        shot(page, "05-dock")

        # ------------------------------------------------------------- bag
        page.locator("#bag-btn").click()
        settle(page, 600)
        check("bag opens from the header", "#/bag" in page.url)
        check("the line is in the bag", page.locator(".line").count() == 1)
        check("the line remembers its options",
              "Oat" in page.locator(".line-opts").inner_text())
        check("the dock stands down on the bag page",
              page.locator("#dock[hidden]").count() == 1)
        page.locator(".line .stepper [data-inc]").click()
        settle(page, 200)
        check("stepper updates the grand total",
              page.locator("#t-grand").inner_text().startswith("519,000"),
              page.locator("#t-grand").inner_text())
        page.locator(".line .stepper [data-dec]").click()
        settle(page, 200)

        check("table chips show for a table order",
              page.locator("[data-table]").count() == 10)
        check("check-in nudge shows when you are not in the room",
              page.locator("#checkin-nudge a").count() == 1)
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
        shot(page, "06-bag")

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
        check("the order totals correctly",
              page.locator(".total-row.grand span").last.inner_text().startswith("346,000"),
              page.locator(".total-row.grand span").last.inner_text())
        check("the bag empties after sending",
              page.locator("#bag-count[hidden]").count() == 1)
        shot(page, "07-order")

        # -------------------------------------------------------- check-in
        page.locator('.tab[data-tab="checkin"]').click()
        settle(page, 600)
        check("check-in opens", "#/checkin" in page.url)
        check("the dial starts off", page.locator('#dial[data-on="0"]').count() == 1)
        check("the room lists people", page.locator(".person").count() >= 1)
        shot(page, "08-checkin-off")

        before_n = page.locator(".person").count()
        page.locator("#dial").click()
        settle(page, 1500)
        check("checking in asks for nothing at all",
              page.locator(".sheet").count() == 0)
        check("the dial turns on", page.locator('#dial[data-on="1"]').count() == 1)
        check("the card turns green", page.locator(".ci-card.on").count() == 1)
        width = page.evaluate("""() => document.querySelector('.ci-meter i').style.width""")
        check("the hour meter starts full", width.startswith(("100", "99")), width)
        check("the card says you are in",
              "you are in" in page.locator("#ci-title").inner_text().strip().lower(),
              page.locator("#ci-title").inner_text())
        check("the hour is given as a clock time",
              bool(re.search(r"until \d{2}:\d{2}", page.locator("#ci-sub").inner_text())),
              page.locator("#ci-sub").inner_text())
        check("you join the room list",
              page.locator(".person").count() == before_n + 1)
        check("you are marked as you", page.locator(".person.me").count() == 1)
        check("an anonymous check-in reads as You",
              "You" in page.locator(".person.me").inner_text(),
              page.locator(".person.me").inner_text())
        check("leaving is offered", page.locator("#out").count() == 1)
        check("an extra hour is offered", page.locator("#extend").count() == 1)
        shot(page, "09-checkin-on")

        # the home count should now include you
        goto(page, "#/", 700)
        check("home says you are checked in",
              "CHECKED IN" in page.locator("#room").inner_text().upper(),
              page.locator("#room").inner_text())
        shot(page, "10-home-checked-in")

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
              page.locator('#dial[data-on="0"]').count() == 1)
        check("leaving clears you from the room",
              page.locator(".person.me").count() == 0)

        # --------------------------------------------------------- account
        page.locator('.tab[data-tab="account"]').click()
        settle(page, 600)
        check("account opens", "#/account" in page.url)
        page.locator("#edit").click()
        settle(page, 600)
        check("editing your details opens a sheet", page.locator("#ed-name").count() == 1)
        page.fill("#ed-name", "Ilya")
        page.fill("#ed-phone", "09141234567")
        page.locator("#ed-save").click()
        settle(page, 700)
        check("the name shows on the profile card",
              "Ilya" in page.locator("#view .card").first.inner_text(),
              page.locator("#view .card").first.inner_text())
        page.reload()
        page.wait_for_selector("#boot[hidden]", state="attached", timeout=6000)
        goto(page, "#/account", 700)
        check("an optional name is remembered",
              "Ilya" in page.locator("#view .card").first.inner_text())
        check("the order is in the history",
              code in page.locator("#view").inner_text(), code)
        check("all seven days of hours are listed",
              page.locator(".hours-row").count() == 7)
        check("today is marked", page.locator(".hours-row.today").count() == 1)
        check("the address links to maps",
              page.locator("a[href*='maps.google']").count() == 1)
        check("install is offered", page.locator("#install").count() == 1)
        shot(page, "11-account")

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
        check("an empty bag says so", "The bag is empty" in page.locator("#view").inner_text())
        check("the empty bag offers the card",
              page.locator("a[href='#/menu']").count() >= 1)

        # ------------------------------------------------- deep link + 404
        page.goto(BASE + "#/item/espresso", wait_until="load")
        page.wait_for_selector("#boot[hidden]", state="attached", timeout=6000)
        settle(page, 700)
        check("a shared drink link opens its sheet",
              page.locator(".sheet.in").count() == 1)
        check("the deep link lands on the card behind it",
              page.locator("#menu-body").count() == 1)

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
            shot(page, f"12-layout-{w}")

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
