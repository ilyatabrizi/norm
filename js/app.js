// Wiring. Routes, the two bars, and the handful of things that have to stay in
// step with state no matter which view is on screen.

import { BUSINESS } from "./config.js";
import { MARK, WORDMARK } from "./brand.js";
import { $, price } from "./util.js";
import { icon } from "./icons.js";
import { route, startRouter, go } from "./router.js";
import { bagCount, bagTotal, subscribe } from "./store.js";
import * as presence from "./presence.js";
import { runBoot } from "./boot.js";

import home from "./views/home.js";
import menu from "./views/menu.js";
import checkin from "./views/checkin.js";
import account from "./views/account.js";
import bagView from "./views/bag.js";
import orderView from "./views/order.js";
import { openItem } from "./views/item.js";

/* ----------------------------------------------------------------- routes */
route("/", home);
route("/menu", menu);
route("/checkin", checkin);
route("/account", account);
route("/bag", bagView);
route("/order/:id", orderView);
// A shared link to one drink lands on the card with its sheet already up.
route("/item/:id", ({ id }) => {
  const view = menu();
  return { html: view.html, mount(el) { view.mount(el); openItem(id); } };
});

/* ------------------------------------------------------------------- bars */
const shell = $("#shell");
const tabs = $("#tabs");
const ink = $("#tabs-ink");

$("#bar-mark").innerHTML = MARK;
$("#bar-word").innerHTML = WORDMARK;
$("#bag-btn-ico").innerHTML = icon("bag");
$("#bag-btn").addEventListener("click", () => go("#/bag"));

const TAB_FOR = { "/": "home", "/menu": "menu", "/checkin": "checkin", "/account": "account",
                  "/item": "menu", "/bag": "menu", "/order": "menu" };

function paintTabs(path) {
  const key = TAB_FOR[path] || TAB_FOR["/" + path.split("/")[1]] || null;
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
  const width = 32;
  ink.style.width = `${width}px`;
  ink.style.transform = `translateX(${box.left - host.left + box.width / 2 - width / 2}px)`;
  tabs.dataset.ready = "1";
}

tabs.querySelectorAll(".tab").forEach((tab) => {
  tab.querySelector(".tab-ico").innerHTML = icon(tab.dataset.tab);
});

/* ---------------------------------------------------------------- the bag */
const dock = $("#dock");
function paintBag() {
  const n = bagCount();
  const count = $("#bag-count");
  count.hidden = n === 0;
  count.textContent = n;
  const onBag = (location.hash || "").startsWith("#/bag");
  dock.hidden = n === 0 || onBag;
  shell.dataset.dock = dock.hidden ? "0" : "1";
  if (n) {
    $("#dock-n").textContent = n;
    $("#dock-total").textContent = price(bagTotal());
  }
}
subscribe(paintBag);

/* ------------------------------------------------------------- the header */
let ticking = false;
addEventListener("scroll", () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    shell.dataset.scrolled = scrollY > 24 ? "1" : "0";
    ticking = false;
  });
}, { passive: true });

document.addEventListener("view:rendered", (e) => {
  paintTabs(e.detail.path);
  paintBag();
  const names = { "/": "", "/menu": "The card", "/checkin": "Check-in",
                  "/account": "You", "/bag": "Your bag" };
  const label = names[e.detail.path] ?? "";
  document.title = label ? `${label} · ${BUSINESS.name}` : `${BUSINESS.name} — ${BUSINESS.city}`;
});
addEventListener("resize", () => paintTabs(location.hash.replace(/^#/, "") || "/"));

/* -------------------------------------------------------------------- go */
presence.startDemo();
startRouter();
runBoot();

if ("serviceWorker" in navigator) {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
