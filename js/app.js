// Wiring. Routes, the two bars, and the handful of things that have to stay in
// step with state no matter which view is on screen.

import { BUSINESS, CHECKIN } from "./config.js";
import { MARK, WORDMARK } from "./brand.js";
import { $, $$ } from "./util.js";
import { icon } from "./icons.js";
import { route, startRouter } from "./router.js";
import { bagCount, subscribe } from "./store.js";
import * as presence from "./presence.js";
import { runBoot } from "./boot.js";
import { wireRows } from "./rows.js";

import home from "./views/home.js";
import menu from "./views/menu.js";
import checkin from "./views/checkin.js";
import account from "./views/account.js";
import bagView from "./views/bag.js";
import orderView from "./views/order.js";

/* ----------------------------------------------------------------- routes */
route("/", home);
route("/menu", menu);
route("/checkin", checkin);
route("/account", account);
route("/bag", bagView);
route("/order/:id", orderView);
// A shared link to one drink lands on the card with that line lit up. It used
// to open a sheet; the card itself is a better answer, and it is one screen.
route("/item/:id", ({ id }) => menu({ focus: id }));

/* ------------------------------------------------------------------- bars */
const bar = $("#bar");
const tabs = $("#tabs");
const ink = $("#tabs-ink");
const chip = $("#ci-chip");

$("#bar-mark").innerHTML = MARK;
$("#bar-word").innerHTML = WORDMARK;
tabs.querySelectorAll(".tab").forEach((tab) => {
  tab.querySelector(".tab-ico").innerHTML = icon(tab.dataset.tab);
});

const TAB_FOR = { "/": "home", "/menu": "menu", "/bag": "bag", "/account": "account",
                  "/item": "menu", "/order": "bag", "/checkin": null };

function paintTabs(path) {
  const key = TAB_FOR[path] ?? TAB_FOR["/" + path.split("/")[1]] ?? null;
  let active = null;
  tabs.querySelectorAll(".tab").forEach((tab) => {
    const on = tab.dataset.tab === key;
    tab.setAttribute("aria-current", on ? "page" : "false");
    if (on) active = tab;
  });
  if (!active) { ink.style.opacity = "0"; return; }
  ink.style.removeProperty("opacity");
  const box = active.getBoundingClientRect();
  const host = tabs.getBoundingClientRect();
  const inset = 5;
  ink.style.width = `${box.width - inset * 2}px`;
  ink.style.transform = `translateX(${box.left - host.left + inset}px)`;
  tabs.dataset.ready = "1";
}

/* ---------------------------------------------------------------- the bag */
function paintBag() {
  const n = bagCount();
  const badge = $("#bag-count");
  badge.textContent = n > 9 ? "9+" : n;
  badge.classList.toggle("on", n > 0);
}
subscribe(paintBag);

/* ----------------------------------------------------------- the check-in */
// The chip is the whole feature's front door, so it says where the seat stands
// without anyone opening the page.
function paintChip() {
  const mine = presence.me();
  chip.dataset.in = mine ? "1" : "0";
  const label = $("#ci-chip-label");
  if (!mine) {
    const n = presence.list().length;
    label.textContent = n ? `${n} here` : "Check in";
    chip.setAttribute("aria-label", n ? `${n} people in the room — check in` : "Check in");
    return;
  }
  const left = Math.max(0, Math.ceil((mine.until - Date.now()) / 60000));
  label.textContent = `You're in · ${left}m`;
  chip.setAttribute("aria-label", `Checked in, ${left} minutes left`);
}
presence.subscribe(paintChip);
setInterval(paintChip, 30000);

/* ------------------------------------------------------- scroll and tone */
// Which band is behind the top bar right now. Code Concept flips its bar over
// white; NORM's one light band is cream, and the bar flips over that.
let tones = [];
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    bar.classList.toggle("solid", scrollY > 30);
    const probe = bar.offsetHeight * 0.72;
    let cream = false;
    for (const el of tones) {
      const r = el.getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) cream = el.dataset.tone === "cream";
    }
    bar.classList.toggle("on-cream", cream);
  });
}
addEventListener("scroll", onScroll, { passive: true });

/* ---------------------------------------------------------------- reveals */
let revealObs = null;
function observeReveals() {
  revealObs?.disconnect();
  const items = $$(".rv");
  if (!("IntersectionObserver" in window) ||
      matchMedia("(prefers-reduced-motion: reduce)").matches) {
    items.forEach((el) => el.classList.add("in"));
    return;
  }
  revealObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); revealObs.unobserve(e.target); }
    });
  }, { rootMargin: "0px 0px -6% 0px", threshold: 0.04 });
  items.forEach((el) => revealObs.observe(el));
}

function wireImages() {
  $$("img.imgload").forEach((im) => {
    if (im.complete && im.naturalWidth) { im.classList.add("ready"); return; }
    im.addEventListener("load", () => im.classList.add("ready"), { once: true });
    im.addEventListener("error", () => im.classList.add("ready"), { once: true });
  });
}

/* ------------------------------------------------------------ after render */
const TITLES = { "/": "", "/menu": "The card", "/checkin": "Check-in",
                 "/account": "You", "/bag": "Your bag" };

document.addEventListener("view:rendered", (e) => {
  paintTabs(e.detail.path);
  paintBag();
  paintChip();
  tones = $$("[data-tone]");
  observeReveals();
  wireImages();
  onScroll();
  const label = TITLES[e.detail.path] ?? "";
  document.title = label ? `${label} · ${BUSINESS.name}` : `${BUSINESS.name} — ${BUSINESS.city}`;
});
addEventListener("resize", () => paintTabs(location.hash.replace(/^#/, "") || "/"));

/* -------------------------------------------------------------------- go */
wireRows();
if (CHECKIN.demo) presence.startDemo();
startRouter();
runBoot();

if ("serviceWorker" in navigator) {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
