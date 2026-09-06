// One drink, one line. The same row on the home page and on the card, so the
// gesture is learned once: the name, what it costs, and a button that puts it
// in the bag. Nothing opens on the way.

import { esc, price } from "./util.js";
import { icon } from "./icons.js";
import { addDrink } from "./ui.js";

export const itemRow = (item) => `
  <li class="mitem" data-item="${item.id}" id="row-${item.id}"
      data-search="${esc((item.name + " " + (item.desc || "") + " " + item.cat).toLowerCase())}">
    <div class="mitem__t">
      <div class="mitem__n">${esc(item.name)}${item.tag
        ? `<span class="mitem__tag">${esc(item.tag)}</span>` : ""}</div>
      ${item.desc ? `<div class="mitem__d">${esc(item.desc)}</div>` : ""}
    </div>
    <div class="mitem__p money">${price(item.price)}</div>
    <button class="add" type="button" data-add="${item.id}"
      aria-label="Add ${esc(item.name)} to the bag">${icon("plus")}</button>
  </li>`;

/**
 * One listener for the whole app, on the document. Views are rendered into the
 * same #view element over and over, so anything bound there survives the render
 * that replaced its rows — bind once, at a node that is never swapped.
 */
export function wireRows() {
  if (wireRows.done) return;
  wireRows.done = true;
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add]");
    if (!btn) return;
    addDrink(btn.dataset.add, btn);
  });
}
