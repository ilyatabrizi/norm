// The card. A chip bar under the top bar, a search field, and then flat rows.
//
// The chips filter rather than chase the scroll: pressing one shows that
// section and hides the rest, so the page you are looking at is the answer to
// the thing you pressed. Nothing opens over the card — the plus is the order.

import { CATEGORIES, inCat } from "../data.js";
import { esc } from "../util.js";
import { icon } from "../icons.js";
import { itemRow } from "../rows.js";

export default function menu({ focus } = {}) {
  const html = `
  <div data-tone="paper">
    <div class="catbar-spacer" aria-hidden="true"></div>
    <div class="wrap">
      <nav class="catbar" id="cats" aria-label="Filter the card">
        <button class="chip" type="button" data-cat="all" aria-pressed="true">All</button>
        ${CATEGORIES.map((c) => `<button class="chip" type="button" data-cat="${c.id}"
          aria-pressed="false">${esc(c.name)}</button>`).join("")}
      </nav>

      <header style="padding-top:26px">
        <h1 class="title">The card</h1>
        <p class="title-sub">Everything on it can be ordered from here. You pay at the
          cashier — the app is only the slip.</p>
        <label class="search" style="margin-top:22px">
          ${icon("search")}
          <input type="search" id="q" placeholder="Search the card" aria-label="Search the card"
                 autocomplete="off" enterkeyhint="search">
        </label>
      </header>

      <div id="list">
        ${CATEGORIES.map((cat) => `
          <section class="msec" data-sec="${cat.id}" id="sec-${cat.id}">
            <div class="msec__head">
              <h2 class="display d-2">${esc(cat.name)}</h2>
              <span class="msec__note">${esc(cat.note)}</span>
            </div>
            <ul class="mlist">${inCat(cat.id).map(itemRow).join("")}</ul>
          </section>`).join("")}
      </div>

      <p class="empty" id="empty" hidden>
        <span class="display d-3">Nothing by that name.</span>
        <span class="small">Ask at the bar — the board changes.</span>
      </p>
    </div>
  </div>`;

  return {
    html,
    mount(view) {
      const search = view.querySelector("#q");
      const chips = [...view.querySelectorAll(".catbar .chip")];
      const empty = view.querySelector("#empty");
      let cat = "all";

      const apply = () => {
        const q = search.value.trim().toLowerCase();
        let any = false;
        view.querySelectorAll(".msec").forEach((sec) => {
          // A search looks at the whole card; the chips only narrow what is
          // already showing, so the two never fight over the same row.
          const secOn = cat === "all" || sec.dataset.sec === cat || !!q;
          let shown = 0;
          sec.querySelectorAll(".mitem").forEach((li) => {
            const on = secOn && (!q || li.dataset.search.includes(q));
            li.classList.toggle("is-hidden", !on);
            if (on) shown++;
          });
          sec.hidden = shown === 0;
          if (shown) any = true;
        });
        empty.hidden = any;
      };

      search.addEventListener("input", apply);

      chips.forEach((c) => c.addEventListener("click", () => {
        chips.forEach((x) => x.setAttribute("aria-pressed", String(x === c)));
        cat = c.dataset.cat;
        apply();
        const top = view.querySelector("#list").offsetTop;
        scrollTo({ top: cat === "all" ? 0 : top - 40, behavior: "smooth" });
      }));

      // #/item/<id> lands here with that line lit for a moment, instead of the
      // sheet it used to open.
      if (focus) {
        const row = view.querySelector(`#row-${CSS.escape(focus)}`);
        if (row) requestAnimationFrame(() => {
          scrollTo({ top: row.getBoundingClientRect().top + scrollY - 150, behavior: "instant" });
          row.classList.add("hit");
        });
      }
    },
  };
}
