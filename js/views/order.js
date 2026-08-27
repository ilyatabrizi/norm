// One order, after it has been sent. The code is the whole point: the cashier
// reads it back, and the bag turns into a coffee.

import { BUSINESS, ORDER } from "../config.js";
import { esc, price, hm } from "../util.js";
import { orderById, orders } from "../store.js";
import { MARK } from "../brand.js";

const STEPS = [
  { id: "sent", title: "Sent", note: "The slip is on your phone" },
  { id: "bar", title: "At the bar", note: "Show the code at the cashier" },
  { id: "ready", title: "Ready", note: "Collected at the counter" },
];

export default function orderView({ id }) {
  const order = orderById(id) || orders()[0];
  if (!order) {
    return { html: `<section class="section wrap"><div class="empty">
      <span class="empty-mark">${MARK}</span>
      <p class="display d-3">No order to show.</p>
      <a class="btn btn-ghost" href="#/menu" style="max-width:220px">Open the card</a>
    </div></section>` };
  }

  const ready = order.at + ORDER.makeMinutes * 60000;

  const html = `
    <section class="section wrap" style="padding-top:6px">
      <div class="head">
        <span class="eyebrow">Your code</span>
        <span class="tiny">${esc(hm(new Date(order.at)))}</span>
      </div>
      <div class="code">
        <span class="code-n" id="code">${esc(order.code)}</span>
        <span class="eyebrow">Read this out at the cashier</span>
      </div>

      <div class="steps" id="steps"></div>

      <div class="list">
        <div class="list-item"><span class="list-label">${
          order.where === "in" ? "Table" : "Pick up"}</span>
          <span class="list-value num">${esc(order.where === "in" ? order.table : order.slot)}</span></div>
        ${order.note ? `<div class="list-item"><span class="list-label">Note</span>
          <span class="list-value" style="text-transform:none;font-family:var(--sans)">
          ${esc(order.note)}</span></div>` : ""}
      </div>
    </section>

    <section class="section wrap">
      <div class="head"><span class="eyebrow">What you ordered</span>
        <span class="tiny">${order.lines.length} line${order.lines.length > 1 ? "s" : ""}</span></div>
      ${order.lines.map((l) => `
        <div class="line">
          <span class="line-name">${esc(l.qty)} × ${esc(l.name)}</span>
          <span class="line-price num">${price(l.unit * l.qty)}</span>
          ${Object.values(l.options || {}).filter(Boolean).length
            ? `<span class="line-opts">${esc(Object.values(l.options).filter(Boolean)
                .join(" · "))}</span>` : ""}
        </div>`).join("")}
      <div class="totals" style="border-bottom:0">
        <div class="total-row grand"><span>Total</span>
          <span class="num">${price(order.total)}</span></div>
      </div>
      <a class="btn btn-ghost" href="#/menu" style="margin-top:22px">Order something else</a>
      <p class="tiny" style="margin-top:16px;text-align:center">
        ${esc(BUSINESS.legal)} · ${esc(BUSINESS.district)}</p>
    </section>`;

  return {
    html,
    mount(view) {
      const steps = view.querySelector("#steps");
      let timer = null;

      const paint = () => {
        const now = Date.now();
        const age = now - order.at;
        const stage = now >= ready ? 2 : age > 60000 ? 1 : 0;
        steps.innerHTML = STEPS.map((s, i) => `
          <div class="step ${i < stage ? "done" : i === stage ? "now" : ""}">
            <span class="step-dot">${i < stage ? "✓" : i + 1}</span>
            <span class="step-body">
              <span class="step-title">${esc(s.title)}</span>
              <span class="tiny">${i === stage && stage < 2
                ? `Ready in about ${Math.max(1, Math.ceil((ready - now) / 60000))} min`
                : esc(s.note)}</span>
            </span>
          </div>`).join("");
        if (stage >= 2) { clearInterval(timer); timer = null; }
      };

      paint();
      timer = setInterval(paint, 1000);
      document.addEventListener("view:leaving", function once() {
        clearInterval(timer);
        document.removeEventListener("view:leaving", once);
      });
    },
  };
}
