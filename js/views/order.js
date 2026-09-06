// One order, after it has been sent. The code is the whole point: the cashier
// reads it back, and the bag turns into a coffee.

import { BUSINESS, ORDER } from "../config.js";
import { esc, price, hm } from "../util.js";
import { icon } from "../icons.js";
import { orderById, orders } from "../store.js";
import { MARK } from "../brand.js";

export default function orderView({ id }) {
  const order = orderById(id) || orders()[0];
  if (!order) {
    return { html: `<div class="band" data-tone="paper"
      style="padding-top:calc(var(--bar-h) + 24px)"><div class="wrap">
      <div class="empty">
        <span class="empty-mark">${MARK}</span>
        <p class="display d-2">No order to show.</p>
        <a class="btn" href="#/menu">Open the card ${icon("arrow")}</a>
      </div></div></div>` };
  }

  const ready = order.at + ORDER.makeMinutes * 60000;

  const html = `
  <div class="band" data-tone="cream" style="padding-top:calc(var(--bar-h) + 30px)">
    <div class="wrap" style="display:grid;justify-items:center;text-align:center;gap:12px">
      <span class="label">Your code</span>
      <span class="code-n" id="code">${esc(order.code)}</span>
      <span class="small" id="eta"></span>
      <p class="small" style="max-width:28ch;margin-top:4px">Read it out at the cashier to
        pay and pick up.</p>
    </div>
  </div>

  <div class="band" data-tone="paper">
    <div class="wrap">
      <div class="list-item">
        <span class="ico">${icon("clock")}</span>
        <span class="list-body">
          <span class="list-label">${order.where === "in" ? "Table" : "Pick up at"}</span>
          <span class="list-note">Sent at ${esc(hm(new Date(order.at)))}</span>
        </span>
        <span class="list-value">${esc(order.where === "in" ? order.table : order.slot)}</span>
      </div>
      ${order.note ? `<div class="list-item">
        <span class="ico">${icon("receipt")}</span>
        <span class="list-body">
          <span class="list-label">Note for the bar</span>
          <span class="list-note">${esc(order.note)}</span>
        </span>
      </div>` : ""}

      <div class="sechead" style="margin-top:34px"><span class="label">What you ordered</span>
        <span class="idx">${order.lines.length} line${order.lines.length > 1 ? "s" : ""}</span></div>
      <ul>
        ${order.lines.map((l) => `
          <li class="line">
            <span class="line-name">${esc(l.qty)} × ${esc(l.name)}</span>
            <span class="line-price money">${price(l.unit * l.qty)}</span>
            ${Object.values(l.options || {}).filter(Boolean).length
              ? `<span class="line-sum">${esc(Object.values(l.options).filter(Boolean)
                  .join(" · "))}</span>` : ""}
          </li>`).join("")}
      </ul>
      <div class="totals" style="margin-top:20px">
        <div class="total-row grand"><span>Total</span>
          <span class="money">${price(order.total)}</span></div>
        <div class="total-row"><span>Payment</span><span>At the cashier</span></div>
      </div>

      <a class="btn btn--ghost btn--block" href="#/menu" style="margin-top:26px">
        Order something else ${icon("arrow")}</a>
      <p class="tiny" style="margin-top:20px;text-align:center">
        ${esc(BUSINESS.legal)} · ${esc(BUSINESS.district)}</p>
    </div>
  </div>`;

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
