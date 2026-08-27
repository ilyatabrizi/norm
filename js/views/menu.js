// The card. One typographic list, categories along the top, search when the
// list gets long. No photographs — the pictures are downstairs on Home.

import { CATEGORIES, ITEMS, inCat } from "../data.js";
import { esc, price } from "../util.js";
import { icon } from "../icons.js";
import { openItem } from "./item.js";

const rowHTML = (item) => `
  <button class="row${item.tag === "New" ? " is-new" : ""}" type="button" data-item="${item.id}">
    <span class="row-name">${esc(item.name)}${item.tag
      ? `<span class="row-tag">${esc(item.tag)}</span>` : ""}</span>
    <span class="row-price money">${price(item.price)}</span>
    <span class="row-desc">${esc(item.desc)}</span>
  </button>`;

export default function menu() {
  const wanted = new URLSearchParams(location.hash.split("?")[1] || "").get("cat");

  const sections = CATEGORIES.map((cat) => `
    <section class="section wrap" data-cat="${cat.id}" id="cat-${cat.id}">
      <div class="head">
        <span class="label">${esc(cat.name)}</span>
        <span class="tiny">${esc(cat.note)}</span>
      </div>
      <div class="rows">${inCat(cat.id).map(rowHTML).join("")}</div>
    </section>`).join("");

  const html = `
    <div class="wrap">
      <nav class="cats" id="cats" aria-label="Categories">
        ${CATEGORIES.map((c, i) => `<a class="cat" href="#cat-${c.id}" data-cat="${c.id}"
           aria-current="${i === 0}">${esc(c.name)}</a>`).join("")}
      </nav>
      <label class="search">
        ${icon("search")}
        <input type="search" id="menu-search" placeholder="Search the card"
               aria-label="Search the card" autocomplete="off" enterkeyhint="search">
      </label>
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

      // Category taps scroll rather than navigate, so the tab bar keeps its
      // place and the hash stays on /menu.
      cats.forEach((a) => a.addEventListener("click", (e) => {
        e.preventDefault();
        const target = view.querySelector(`#cat-${a.dataset.cat}`);
        const top = target.getBoundingClientRect().top + scrollY
          - (parseFloat(getComputedStyle(document.documentElement)
            .getPropertyValue("--bar-h")) || 56) - 64;
        scrollTo({ top, behavior: "smooth" });
      }));

      // Scroll-spy: whichever section owns the line under the category bar.
      const spy = () => {
        const line = 150;
        let active = cats[0]?.dataset.cat;
        view.querySelectorAll("section[data-cat]").forEach((sec) => {
          if (sec.getBoundingClientRect().top <= line) active = sec.dataset.cat;
        });
        cats.forEach((a) => a.setAttribute("aria-current", String(a.dataset.cat === active)));
      };
      addEventListener("scroll", spy, { passive: true });
      document.addEventListener("view:leaving", function once() {
        removeEventListener("scroll", spy);
        document.removeEventListener("view:leaving", once);
      });

      // Search filters into a flat list and hides the sectioned card.
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
          ? `<div class="head" style="margin-top:28px"><span class="label">
               ${hits.length} result${hits.length > 1 ? "s" : ""}</span></div>
             <div class="rows">${hits.map(rowHTML).join("")}</div>`
          : `<div class="empty"><p class="display d-3">Nothing by that name.</p>
             <p class="small">Ask at the bar — the board changes.</p></div>`;
      });

      if (wanted) {
        const target = view.querySelector(`#cat-${wanted}`);
        if (target) requestAnimationFrame(() =>
          scrollTo({ top: target.offsetTop - 96, behavior: "instant" }));
      }
    },
  };
}
