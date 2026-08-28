// The bag, and the order that comes out of it. Nothing is charged here — the
// order is a slip you show at the cashier, which is how the room works.

import { ORDER } from "../config.js";
import { MARK } from "../brand.js";
import { icon } from "../icons.js";
import { esc, price, slots } from "../util.js";
import { haptic } from "../motion.js";
import { stepper, stepperHTML } from "../ui.js";
import { bag, setQty, bagTotal, placeOrder } from "../store.js";
import * as presence from "../presence.js";
import { go, render } from "../router.js";

const optionLine = (options) => Object.values(options || {}).filter(Boolean).join(" · ");

export default function bagView() {
  const lines = bag();

  if (!lines.length) {
    return {
      html: `<section class="wrap">
        <h1 class="title">Your bag</h1>
      </section>
      <section class="section wrap">
        <div class="card empty">
          <span class="empty-mark">${MARK}</span>
          <p class="display d-3">The bag is empty.</p>
          <p class="small">Everything on the card can be ordered from here.</p>
          <a class="btn btn-primary" href="#/menu" style="max-width:240px">Open the card</a>
        </div>
      </section>`,
    };
  }

  const pickups = slots(ORDER.slotStepMinutes, ORDER.slotCount, ORDER.leadMinutes);
  const state = { where: "in", table: ORDER.tables[0], slot: pickups[0], note: "" };

  const html = `
    <section class="wrap">
      <h1 class="title">Your bag</h1>
    </section>

    <section class="section wrap">
      <div class="card" id="lines">
        ${lines.map((l) => `
          <div class="line" data-line="${l.id}">
            <span class="line-name">${esc(l.name)}</span>
            <span class="line-price money">${price(l.unit * l.qty)}</span>
            ${optionLine(l.options)
              ? `<span class="line-opts">${esc(optionLine(l.options))}</span>` : ""}
            <span class="line-foot">
              ${stepperHTML(l.qty)}
              <button class="btn-quiet" type="button" data-remove
                style="font-size:13.5px;color:var(--faint)">Remove</button>
            </span>
          </div>`).join("")}
      </div>
    </section>

    <section class="section wrap">
      <div class="head"><span class="label">How and when</span></div>
      <div class="seg" id="where">
        <button type="button" data-where="in" aria-pressed="true">At a table</button>
        <button type="button" data-where="out" aria-pressed="false">Takeaway</button>
      </div>
      <div id="where-detail" style="margin-top:16px"></div>
      <div id="checkin-nudge"></div>
    </section>

    <section class="section wrap">
      <div class="field">
        <label for="note">Anything for the bar</label>
        <textarea id="note" rows="2" maxlength="140"
          placeholder="Less ice, extra hot, one spoon…"></textarea>
      </div>
    </section>

    <section class="section wrap" style="padding-bottom:8px">
      <div class="card totals">
        <div class="total-row"><span>Items</span>
          <span class="money" id="t-items">${price(bagTotal())}</span></div>
        <div class="total-row"><span>Payment</span><span>At the cashier</span></div>
        <div class="total-row grand"><span>Total</span>
          <span class="money" id="t-grand">${price(bagTotal())}</span></div>
      </div>
      <button class="btn btn-primary" type="button" id="send" style="margin-top:20px">
        Send to the bar <span class="n" id="send-total">${price(bagTotal())}</span>
      </button>
      <p class="tiny" style="margin-top:14px;text-align:center">
        You get a four-digit code. Show it at the cashier to pay and pick up.</p>
    </section>`;

  return {
    html,
    mount(view) {
      const detail = view.querySelector("#where-detail");
      const nudge = view.querySelector("#checkin-nudge");

      const totals = () => {
        const sum = bagTotal();
        view.querySelector("#t-items").textContent = price(sum);
        view.querySelector("#t-grand").textContent = price(sum);
        view.querySelector("#send-total").textContent = price(sum);
      };

      view.querySelectorAll("[data-line]").forEach((row) => {
        const id = row.dataset.line;
        const line = bag().find((l) => l.id === id);
        stepper(row.querySelector(".stepper"), {
          value: line.qty, min: 0, max: ORDER.maxPerLine,
          onChange: (n) => {
            setQty(id, n);
            if (n === 0) { row.remove(); if (!bag().length) render(); }
            else row.querySelector(".line-price").textContent = price(line.unit * n);
            totals();
          },
        });
        row.querySelector("[data-remove]").addEventListener("click", () => {
          haptic(8); setQty(id, 0); row.remove(); totals();
          if (!bag().length) render();
        });
      });

      const paintDetail = () => {
        if (state.where === "in") {
          detail.innerHTML = `<span class="label">Table</span>
            <div class="opt-list" id="tables" style="margin-top:11px">
              ${ORDER.tables.map((t) => `<button class="chip" type="button" data-table="${esc(t)}"
                aria-pressed="${t === state.table}">${esc(t)}</button>`).join("")}
            </div>`;
          detail.querySelector("#tables").addEventListener("click", (e) => {
            const chip = e.target.closest("[data-table]");
            if (!chip) return;
            haptic(6); state.table = chip.dataset.table;
            detail.querySelectorAll("[data-table]").forEach((c) =>
              c.setAttribute("aria-pressed", String(c === chip)));
          });
          nudge.innerHTML = presence.isIn() ? "" : `
            <a class="card list-item" href="#/checkin" style="margin-top:18px">
              <span class="ico">${icon("checkin")}</span>
              <span class="list-body">
                <span class="list-label">Check in first</span>
                <span class="list-note">So the bar knows which table is live. One tap.</span>
              </span>
            </a>`;
        } else {
          detail.innerHTML = `<span class="label">Pick up at</span>
            <div class="opt-list" id="slots" style="margin-top:11px">
              ${pickups.map((s) => `<button class="chip money" type="button" data-slot="${s}"
                aria-pressed="${s === state.slot}">${s}</button>`).join("")}
            </div>`;
          detail.querySelector("#slots").addEventListener("click", (e) => {
            const chip = e.target.closest("[data-slot]");
            if (!chip) return;
            haptic(6); state.slot = chip.dataset.slot;
            detail.querySelectorAll("[data-slot]").forEach((c) =>
              c.setAttribute("aria-pressed", String(c === chip)));
          });
          nudge.innerHTML = "";
        }
      };

      view.querySelector("#where").addEventListener("click", (e) => {
        const btn = e.target.closest("[data-where]");
        if (!btn) return;
        haptic(6); state.where = btn.dataset.where;
        view.querySelectorAll("[data-where]").forEach((c) =>
          c.setAttribute("aria-pressed", String(c === btn)));
        paintDetail();
      });
      paintDetail();

      view.querySelector("#note").addEventListener("input", (e) => {
        state.note = e.target.value.trim();
      });

      view.querySelector("#send").addEventListener("click", () => {
        const lines = bag().map((l) => ({ ...l }));
        if (!lines.length) return;
        haptic([12, 34, 18]);
        const order = placeOrder({
          lines, where: state.where,
          table: state.where === "in" ? state.table : "",
          slot: state.where === "out" ? state.slot : "",
          note: state.note, total: lines.reduce((n, l) => n + l.unit * l.qty, 0),
        });
        go(`#/order/${order.id}`);
      });
    },
  };
}
