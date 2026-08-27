// One drink, its options, and the way into the bag. Opens as a sheet over
// whatever view asked for it, so nobody loses their place in the card.

import { byId } from "../data.js";
import { esc, price, money } from "../util.js";
import { sheet, closeSheet, toast, stepper, stepperHTML } from "../ui.js";
import { haptic } from "../motion.js";
import { addLine } from "../store.js";

export function openItem(id) {
  const item = byId(id);
  if (!item) return;

  const chosen = {};
  (item.options || []).forEach((g) => { chosen[g.id] = g.default; });
  let qty = 1;

  const unit = () => (item.options || []).reduce((sum, g) => {
    const c = g.choices.find((x) => x.id === chosen[g.id]);
    return sum + (c ? c.add : 0);
  }, item.price);

  const render = () => `
    <div class="sheet-head">
      <h2 class="display d-2">${esc(item.name)}</h2>
      <p class="lede">${esc(item.desc)}</p>
    </div>
    ${(item.options || []).map((g) => `
      <div class="opt-group" data-group="${g.id}">
        <span class="label">${esc(g.label)}</span>
        <div class="opt-list">
          ${g.choices.map((c) => `
            <button class="chip" type="button" data-choice="${esc(c.id)}"
              aria-pressed="${c.id === chosen[g.id]}">${esc(c.id)}${
                c.add ? ` <span class="add">+${money(c.add)}</span>` : ""
              }</button>`).join("")}
        </div>
      </div>`).join("")}
    <div class="line-foot" style="margin:4px 0 8px">
      <span class="label">How many</span>
      ${stepperHTML(qty)}
    </div>
    <div class="sheet-actions">
      <button class="btn btn-solid" type="button" id="add">
        Add to bag <span class="n" id="add-total">${price(unit())}</span>
      </button>
      <button class="btn btn-quiet" type="button" data-close>Not now</button>
    </div>`;

  sheet(render, {
    label: item.name,
    mount(el) {
      const total = el.querySelector("#add-total");
      const paint = () => { total.textContent = price(unit() * qty); };

      el.querySelectorAll("[data-group]").forEach((group) => {
        group.addEventListener("click", (e) => {
          const chip = e.target.closest("[data-choice]");
          if (!chip) return;
          haptic(6);
          chosen[group.dataset.group] = chip.dataset.choice;
          group.querySelectorAll("[data-choice]").forEach((c) =>
            c.setAttribute("aria-pressed", String(c === chip)));
          paint();
        });
      });

      stepper(el.querySelector(".stepper"), {
        value: qty, min: 1, max: 9, onChange: (n) => { qty = n; paint(); },
      });

      el.querySelector("#add").addEventListener("click", () => {
        haptic([10, 30, 14]);
        addLine({ itemId: item.id, name: item.name, unit: unit(), qty, options: { ...chosen } });
        closeSheet();
        toast(`${qty} × ${item.name} in the bag`);
      });
    },
  });
}
