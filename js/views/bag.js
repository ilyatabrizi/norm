// The bag, and the order that comes out of it. Nothing is charged here — the
// order is a slip you show at the cashier, which is how the room works.
//
// This is also where a drink's choices live now. Adding is one tap on the card;
// milk, size, ice and sweetness fold out of the line here, for the people who
// want them and out of everybody else's way.

import { ORDER } from "../config.js";
import { MARK } from "../brand.js";
import { icon } from "../icons.js";
import { esc, price, slots } from "../util.js";
import { byId } from "../data.js";
import { haptic } from "../motion.js";
import { qty, qtyHTML } from "../ui.js";
import { bag, setQty, setOptions, bagTotal, placeOrder } from "../store.js";
import * as presence from "../presence.js";
import { go, render } from "../router.js";

const summary = (options) => Object.values(options || {}).filter(Boolean).join(" · ");

const optionGroups = (line) => {
  const groups = byId(line.itemId)?.options || [];
  if (!groups.length) return "";
  return `
    <div class="line-opts" hidden>
      ${groups.map((g) => `
        <div class="opt-group" data-group="${esc(g.id)}">
          <span class="label">${esc(g.label)}</span>
          <div class="opt-list">
            ${g.choices.map((c) => `
              <button class="chip" type="button" data-choice="${esc(c.id)}"
                aria-pressed="${c.id === line.options[g.id]}">${esc(c.id)}${
                  c.add ? `<span class="chip__add">+${Math.round(c.add / 1000)}k</span>` : ""
                }</button>`).join("")}
          </div>
        </div>`).join("")}
    </div>`;
};

const lineHTML = (l) => {
  const hasOptions = (byId(l.itemId)?.options || []).length > 0;
  return `
  <li class="line" data-line="${l.id}">
    <span class="line-name">${esc(l.name)}</span>
    <span class="line-price money">${price(l.unit * l.qty)}</span>
    ${hasOptions ? `<span class="line-sum">${esc(summary(l.options))}</span>` : ""}
    ${optionGroups(l)}
    <span class="line-foot">
      ${qtyHTML(l.qty)}
      <span style="display:flex;gap:16px;align-items:center">
        ${hasOptions ? `<button class="line-more" type="button" data-more
          aria-expanded="false">Change</button>` : ""}
        <button class="line-more" type="button" data-remove
          style="color:var(--faint)">Remove</button>
      </span>
    </span>
  </li>`;
};

export default function bagView() {
  const lines = bag();

  if (!lines.length) {
    return {
      html: `<div class="band" data-tone="paper" style="padding-top:calc(var(--bar-h) + 24px)">
        <div class="wrap">
          <h1 class="title">Your bag</h1>
          <div class="empty">
            <span class="empty-mark">${MARK}</span>
            <p class="display d-2">Nothing in it yet.</p>
            <p class="small">Everything on the card can be ordered from here.</p>
            <a class="btn" href="#/menu" style="margin-top:6px">Open the card ${icon("arrow")}</a>
          </div>
        </div>
      </div>`,
    };
  }

  const pickups = slots(ORDER.slotStepMinutes, ORDER.slotCount, ORDER.leadMinutes);
  const state = { where: "in", table: ORDER.tables[0], slot: pickups[0], note: "" };

  const html = `
  <div class="band" data-tone="paper" style="padding-top:calc(var(--bar-h) + 24px)">
    <div class="wrap">
      <h1 class="title">Your bag</h1>
      <p class="title-sub">Send it to the bar and you get a four-digit code. You pay at
        the cashier when you pick it up.</p>

      <ul id="lines" style="margin-top:26px">${lines.map(lineHTML).join("")}</ul>

      <div style="margin-top:34px">
        <div class="sechead"><span class="label">How and when</span></div>
        <div class="seg" id="where">
          <button type="button" data-where="in" aria-pressed="true">At a table</button>
          <button type="button" data-where="out" aria-pressed="false">Takeaway</button>
        </div>
        <div id="where-detail" style="margin-top:18px"></div>
        <div id="nudge"></div>
      </div>

      <div class="field" style="margin-top:30px">
        <label for="note">Anything for the bar</label>
        <textarea id="note" rows="2" maxlength="140"
          placeholder="Less ice, extra hot, one spoon…"></textarea>
      </div>

      <div class="totals" style="margin-top:34px">
        <div class="total-row"><span>Items</span>
          <span class="money" id="t-items">${price(bagTotal())}</span></div>
        <div class="total-row"><span>Payment</span><span>At the cashier</span></div>
        <div class="total-row grand"><span>Total</span>
          <span class="money" id="t-grand">${price(bagTotal())}</span></div>
      </div>

      <button class="btn btn--block" type="button" id="send" style="margin-top:24px">
        Send to the bar <span class="n" id="send-total">${price(bagTotal())}</span>
      </button>
    </div>
  </div>`;

  return {
    html,
    mount(view) {
      const detail = view.querySelector("#where-detail");
      const nudge = view.querySelector("#nudge");

      const totals = () => {
        const sum = bagTotal();
        view.querySelector("#t-items").textContent = price(sum);
        view.querySelector("#t-grand").textContent = price(sum);
        view.querySelector("#send-total").textContent = price(sum);
      };

      const wireLine = (row) => {
        const id = row.dataset.line;
        const line = () => bag().find((l) => l.id === id);
        const priceEl = row.querySelector(".line-price");

        qty(row.querySelector(".qty"), {
          value: line().qty, min: 0, max: ORDER.maxPerLine,
          onChange: (n) => {
            setQty(id, n);
            if (n === 0) { row.remove(); if (!bag().length) render(); }
            else priceEl.textContent = price(line().unit * n);
            totals();
          },
        });

        row.querySelector("[data-remove]").addEventListener("click", () => {
          haptic(8); setQty(id, 0); row.remove(); totals();
          if (!bag().length) render();
        });

        const more = row.querySelector("[data-more]");
        const opts = row.querySelector(".line-opts");
        more?.addEventListener("click", () => {
          const open = more.getAttribute("aria-expanded") === "true";
          more.setAttribute("aria-expanded", String(!open));
          more.textContent = open ? "Change" : "Done";
          opts.hidden = open;
          haptic(6);
        });

        opts?.addEventListener("click", (e) => {
          const chip = e.target.closest("[data-choice]");
          if (!chip) return;
          const group = chip.closest("[data-group]");
          haptic(6);
          setOptions(id, group.dataset.group, chip.dataset.choice);
          // The change may have folded this line into an identical one, in which
          // case the whole list has to be redrawn rather than patched.
          if (!line()) { render(); return; }
          group.querySelectorAll("[data-choice]").forEach((c) =>
            c.setAttribute("aria-pressed", String(c === chip)));
          row.querySelector(".line-sum").textContent = summary(line().options);
          priceEl.textContent = price(line().unit * line().qty);
          totals();
        });
      };

      view.querySelectorAll("[data-line]").forEach(wireLine);

      const paintDetail = () => {
        if (state.where === "in") {
          detail.innerHTML = `<span class="label">Table</span>
            <div class="opt-list" id="tables">
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
            <a class="list-item" href="#/checkin" style="margin-top:20px">
              <span class="ico">${icon("checkin")}</span>
              <span class="list-body">
                <span class="list-label">Check in first</span>
                <span class="list-note">So the bar knows which table is live. One tap.</span>
              </span>
              <span class="list-value">${icon("chevron")}</span>
            </a>`;
        } else {
          detail.innerHTML = `<span class="label">Pick up at</span>
            <div class="opt-list" id="slots">
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
        const sending = bag().map((l) => ({ ...l }));
        if (!sending.length) return;
        haptic([12, 34, 18]);
        const order = placeOrder({
          lines: sending, where: state.where,
          table: state.where === "in" ? state.table : "",
          slot: state.where === "out" ? state.slot : "",
          note: state.note, total: sending.reduce((n, l) => n + l.unit * l.qty, 0),
        });
        go(`#/order/${order.id}`);
      });
    },
  };
}
