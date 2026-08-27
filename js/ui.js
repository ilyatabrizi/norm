// Toasts and bottom sheets — the two pieces of chrome every view borrows.

import { $ } from "./util.js";
import { haptic, reduced } from "./motion.js";

/* ------------------------------------------------------------------ toast */
export function toast(message, ms = 2600) {
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

/* ------------------------------------------------------------------ sheet */
let openSheetEl = null;

export function closeSheet() {
  if (!openSheetEl) return;
  const { sheet, scrim, onClose, onKey } = openSheetEl;
  removeEventListener("keydown", onKey);
  openSheetEl = null;
  sheet.classList.remove("in");
  scrim.classList.remove("in");
  document.body.style.removeProperty("overflow");
  setTimeout(() => { sheet.remove(); scrim.remove(); onClose?.(); }, reduced() ? 0 : 440);
}

/**
 * Bottom sheet. `render` returns HTML; `mount` gets the element once it is in
 * the DOM. Dismiss by scrim, by the close button, by Escape, or by dragging it
 * down past a third of its height — the gesture people already expect on iOS.
 */
export function sheet(render, { mount, onClose, label = "Details" } = {}) {
  closeSheet();
  const scrim = document.createElement("div");
  scrim.className = "scrim";
  const el = document.createElement("div");
  el.className = "sheet";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-label", label);
  el.innerHTML = `<div class="grab"></div>${typeof render === "function" ? render() : render}`;
  document.body.append(scrim, el);
  document.body.style.overflow = "hidden";
  const onKey = (e) => { if (e.key === "Escape") closeSheet(); };
  addEventListener("keydown", onKey);
  openSheetEl = { sheet: el, scrim, onClose, onKey };

  requestAnimationFrame(() => { scrim.classList.add("in"); el.classList.add("in"); });
  scrim.addEventListener("click", closeSheet);
  el.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeSheet();
  });
  // drag to dismiss — only from the top of the sheet, so inner scrolling works
  let y0 = null, dy = 0;
  el.addEventListener("touchstart", (e) => {
    if (el.scrollTop > 2) return;
    y0 = e.touches[0].clientY; dy = 0;
    el.style.transition = "none";
  }, { passive: true });
  el.addEventListener("touchmove", (e) => {
    if (y0 === null) return;
    dy = Math.max(0, e.touches[0].clientY - y0);
    el.style.transform = `translateX(-50%) translateY(${dy}px)`;
  }, { passive: true });
  el.addEventListener("touchend", () => {
    if (y0 === null) return;
    el.style.removeProperty("transition");
    el.style.removeProperty("transform");
    if (dy > Math.min(160, el.offsetHeight / 3)) { haptic(8); closeSheet(); }
    y0 = null;
  });

  mount?.(el);
  return el;
}

/** Wire a − n + control. onChange gets the new quantity. */
export function stepper(node, { value, min = 0, max = 99, onChange }) {
  const out = node.querySelector("span");
  const set = (n) => { value = Math.min(max, Math.max(min, n)); out.textContent = value;
                       onChange(value); };
  node.querySelector("[data-dec]").addEventListener("click", () => { haptic(6); set(value - 1); });
  node.querySelector("[data-inc]").addEventListener("click", () => { haptic(6); set(value + 1); });
}

export const stepperHTML = (qty, min = 1) => `
  <span class="stepper">
    <button type="button" data-dec aria-label="One fewer">−</button>
    <span>${qty}</span>
    <button type="button" data-inc aria-label="One more">+</button>
  </span>`;
