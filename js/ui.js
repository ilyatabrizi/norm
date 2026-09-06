// The two pieces of chrome every view borrows: a toast, and the − n + control.
//
// There is no bottom sheet any more. Adding a drink is one tap and nothing
// opens in front of it; the choices that used to live in a modal now sit on the
// line in the bag, where you are already reviewing the order.

import { $ } from "./util.js";
import { haptic } from "./motion.js";
import { icon } from "./icons.js";
import { byId } from "./data.js";
import { addLine, unitPrice, defaultOptions } from "./store.js";

/* ------------------------------------------------------------------ toast */
export function toast(message, ms = 2400) {
  const root = $("#toast-root");
  if (!root) return;
  const node = document.createElement("div");
  node.className = "toast";
  node.innerHTML = `<span class="dot"></span><span></span>`;
  node.lastElementChild.textContent = message;
  root.append(node);
  setTimeout(() => {
    node.classList.add("out");
    node.addEventListener("animationend", () => node.remove(), { once: true });
  }, ms);
}

/* -------------------------------------------------------------------- qty */
export const qtyHTML = (n) => `
  <span class="qty">
    <button type="button" data-dec aria-label="One fewer">${icon("minus")}</button>
    <output>${n}</output>
    <button type="button" data-inc aria-label="One more">${icon("plus")}</button>
  </span>`;

/** Wire a − n + control. onChange gets the new quantity. */
export function qty(node, { value, min = 0, max = 99, onChange }) {
  const out = node.querySelector("output");
  const set = (n) => {
    value = Math.min(max, Math.max(min, n));
    out.textContent = value;
    onChange(value);
  };
  node.querySelector("[data-dec]").addEventListener("click", () => { haptic(6); set(value - 1); });
  node.querySelector("[data-inc]").addEventListener("click", () => { haptic(6); set(value + 1); });
}

/* ------------------------------------------------------------ add to bag */
/**
 * The whole ordering interaction: one tap. The drink goes in as it comes, the
 * button flashes cream, and a toast says so. Milk, size and serve are changed
 * on the line in the bag for the people who care, and cost nobody else a step.
 */
export function addDrink(itemId, btn) {
  const item = byId(itemId);
  if (!item) return;
  const options = defaultOptions(itemId);
  haptic([10, 26, 12]);
  addLine({ itemId, name: item.name, unit: unitPrice(itemId, options), qty: 1, options });
  if (btn) {
    btn.classList.remove("done");
    void btn.offsetWidth;
    btn.classList.add("done");
    setTimeout(() => btn.classList.remove("done"), 700);
  }
  toast(`${item.name} in the bag`);
}
