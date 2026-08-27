// One order, after it has been sent. The code is the whole point: the cashier
// reads it back, and the bag turns into a coffee.

import { BUSINESS, ORDER } from "../config.js";
import { esc, price, hm } from "../util.js";
import { orderById, orders } from "../store.js";
import { MARK } from "../brand.js";

export default function orderView({ id }) {
  const order = orderById(id) || orders()[0];
  if (!order) {
    return { html: `<section class="section wrap"><div class="empty">
      <span class="empty-mark">${MARK}</span>
      <p class="display d-3">No order to show.</p>
      <a class="btn btn-ghost" href="#/menu" style="max-width:240px">Open the card</a>
    </div></section>` };
  }

  const ready = order.at + ORDER.makeMinutes * 60000;

  const html = `
    <section class="section wrap" style="padding-top:4px">
      <div class="code">
        <span class="label">Your code</span>
        <span class="code-n" id="code">${esc(order.code)}</span>
        <span class="small" id="eta"></span>
      </div>
      <p class="small" style="text-align:center;margin-top:20px">
        Read it out at the cashier to pay and pick up.</p>
    </section>

    <section class="section wrap">
      <div class="list-item">
        <span class="list-label">${order.where === "in" ? "Table" : "Pick up at"}</span>
        <span class="list-value">${esc(order.where === "in" ? order.table : order.slot)}</span>
      </div>
      <div class="list-item">
        <span class="list-label">Sent</span>
        <span class="list-value">${esc(hm(new Date(order.at)))}</span>
      </div>
      ${order.note ? `<div class="list-item">
        <span class="list-label">Note</span>
        <span class="list-value" style="color:var(--paper-dim)">${esc(order.note)}</span>
      </div>` : ""}
    </section>

    <section class="section wrap">
      <div class="head"><span class="label">What you ordered</span></div>
      ${order.lines.map((l) => `
        <div class="line">
          <span class="line-name">${esc(l.qty)} × ${esc(l.name)}</span>
          <span class="line-price money">${price(l.unit * l.qty)}</span>
          ${Object.values(l.options || {}).filter(Boolean).length
            ? `<span class="line-opts">${esc(Object.values(l.options).filter(Boolean)
                .join(" · "))}</span>` : ""}
        </div>`).join("")}
      <div class="totals">
        <div class="total-row grand"><span>Total</span>
          <span>${price(order.total)}</span></div>
      </div>
      <a class="btn btn-ghost" href="#/menu" style="margin-top:24px">Order something else</a>
      <p class="tiny" style="margin-top:18px;text-align:center">
        ${esc(BUSINESS.legal)} · ${esc(BUSINESS.district)}</p>
    </section>`;

  return {
    html,
    mount(view) {
      const eta = view.querySelector("#eta");
      let timer = null;

      const paint = () => {
        const left = Math.ceil((ready - Date.now()) / 60000);
        eta.textContent = left > 0
          ? `Ready in about ${left} minute${left > 1 ? "s" : ""}`
          : "Ready at the counter";
        if (left <= 0) { clearInterval(timer); timer = null; }
      };

      paint();
      timer = setInterval(paint, 5000);
      document.addEventListener("view:leaving", function once() {
        clearInterval(timer);
        document.removeEventListener("view:leaving", once);
      });
    },
  };
}
