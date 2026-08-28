// The card. Category pills across the top, then one card per category.

import { CATEGORIES, ITEMS, inCat } from "../data.js";
import { esc, price } from "../util.js";
import { icon } from "../icons.js";
import { openItem } from "./item.js";

const rowHTML = (item) => `
  <div class="row">
    <span class="row-body">
      <span class="row-name">${esc(item.name)}${item.tag
        ? `<span class="row-tag">${esc(item.tag)}</span>` : ""}</span>
      <span class="row-desc">${esc(item.desc)}</span>
    </span>
    <span class="row-side">
      <span class="row-price money">${price(item.price)}</span>
      <button class="add-btn" type="button" data-item="${item.id}"
        aria-label="Add ${esc(item.name)}">${icon("plus")}</button>
    </span>
  </div>`;

export default function menu() {
  const wanted = new URLSearchParams(location.hash.split("?")[1] || "").get("cat");

  const sections = CATEGORIES.map((cat) => `
    <section class="section wrap" data-cat="${cat.id}" id="cat-${cat.id}">
      <div class="head">
        <span class="label">${esc(cat.name)}</span>
        <span class="tiny">${esc(cat.note)}</span>
      </div>
      <div class="card"><div class="rows">${inCat(cat.id).map(rowHTML).join("")}</div></div>
    </section>`).join("");

  const html = `
    <div class="wrap">
      <h1 class="title">Menu</h1>
      <label class="search" style="margin-top:18px">
        ${icon("search")}
        <input type="search" id="menu-search" placeholder="Search the card"
               aria-label="Search the card" autocomplete="off" enterkeyhint="search">
      </label>
    </div>
    <div class="wrap" style="padding-inline:0">
      <nav class="cats" id="cats" aria-label="Categories" style="padding-inline:var(--gutter)">
        ${CATEGORIES.map((c, i) => `<a class="cat" href="#cat-${c.id}" data-cat="${c.id}"
           aria-current="${i === 0}">${esc(c.name)}</a>`).join("")}
      </nav>
    </div>
    <div id="menu-body">${sections}</div>
    <div class="wrap" id="menu-results" hidden></div>`;

  return {
    html,
    mount(view) {
      const body = view.querySelector("#menu-body");
      const results = view.querySelector("#menu-results");
      const cats = [...view.querySelectorAll(".cat")];

      view.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-item]");
        if (btn) openItem(btn.dataset.item);
      });

      cats.forEach((a) => a.addEventListener("click", (e) => {
        e.preventDefault();
        const target = view.querySelector(`#cat-${a.dataset.cat}`);
        scrollTo({ top: target.getBoundingClientRect().top + scrollY - 130, behavior: "smooth" });
      }));

      // Scroll-spy: whichever section owns the line under the pills. The active
      // pill is kept in view by moving the strip itself — scrollIntoView() would
      // drag the whole page back to where the sticky bar sits in normal flow.
      const strip = view.querySelector("#cats");
      let shown = null;
      const spy = () => {
        if (!cats[0]?.isConnected) { removeEventListener("scroll", spy); return; }
        let active = cats[0].dataset.cat;
        view.querySelectorAll("section[data-cat]").forEach((sec) => {
          if (sec.getBoundingClientRect().top <= 160) active = sec.dataset.cat;
        });
        cats.forEach((a) => a.setAttribute("aria-current", String(a.dataset.cat === active)));
        if (active !== shown) {
          shown = active;
          const pill = cats.find((a) => a.dataset.cat === active);
          strip.scrollTo({ left: Math.max(0, pill.offsetLeft - 20), behavior: "smooth" });
        }
      };
      addEventListener("scroll", spy, { passive: true });
      document.addEventListener("view:leaving", function once() {
        removeEventListener("scroll", spy);
        document.removeEventListener("view:leaving", once);
      });

      const input = view.querySelector("#menu-search");
      input.addEventListener("input", () => {
        const q = input.value.trim().toLowerCase();
        if (!q) {
          body.hidden = false; results.hidden = true; results.innerHTML = "";
          return;
        }
        const hits = ITEMS.filter((i) =>
          (i.name + " " + i.desc + " " + i.cat).toLowerCase().includes(q));
        body.hidden = true; results.hidden = false;
        results.innerHTML = hits.length
          ? `<div class="head" style="margin-top:20px"><span class="label">
               ${hits.length} result${hits.length > 1 ? "s" : ""}</span></div>
             <div class="card"><div class="rows">${hits.map(rowHTML).join("")}</div></div>`
          : `<div class="card empty"><p class="display d-3">Nothing by that name.</p>
             <p class="small">Ask at the bar — the board changes.</p></div>`;
      });

      if (wanted) {
        const target = view.querySelector(`#cat-${wanted}`);
        if (target) requestAnimationFrame(() =>
          scrollTo({ top: target.offsetTop - 120, behavior: "instant" }));
      }
    },
  };
}
