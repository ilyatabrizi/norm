// Check-in. One tap, nothing asked. The card holds your seat for an hour and
// lets it go by itself; tapping again is how you leave early.

import { CHECKIN } from "../config.js";
import { MARK } from "../brand.js";
import { esc, initials, hm, clamp } from "../util.js";
import { icon } from "../icons.js";
import { haptic, reduced } from "../motion.js";
import { toast } from "../ui.js";
import * as presence from "../presence.js";
import { profile } from "../store.js";

const HOLD = CHECKIN.holdMinutes * 60000;

const nameOf = (p, mine) => (p.name || (mine ? "You" : "Someone"));

const personRow = (p, meId) => {
  const mine = p.id === meId;
  const who = nameOf(p, mine);
  return `
    <li class="person${mine ? " me" : ""}">
      <span class="avatar">${esc(initials(who))}</span>
      <span class="person-name">${esc(who)}</span>
      <span class="person-since">${esc(hm(new Date(p.at)))}</span>
    </li>`;
};

export default function checkin() {
  const html = `
    <section class="wrap">
      <h1 class="title">Check in</h1>
      <p class="title-sub">One tap when you sit down. The bar knows you are here,
        and so does everyone deciding whether to come over.</p>
    </section>

    <section class="section wrap">
      <div class="card ci-shell" id="ci-shell">
        <button class="ci-card" id="dial" type="button" data-on="0"
                aria-pressed="false" aria-label="Check in" style="width:100%">
          <span class="ci-mark">${MARK}</span>
          <span class="ci-title" id="ci-title">Are you here?</span>
          <span class="ci-sub" id="ci-sub">Your seat is held for
            ${CHECKIN.holdMinutes} minutes.</span>
          <span class="ci-slot" id="ci-meter"></span>
        </button>
        <div class="ci-actions" id="ci-actions" style="padding:0 20px 22px"></div>
        <span class="ci-ripple"></span>
      </div>
    </section>

    <section class="section wrap" id="room-list"></section>

    <section class="wrap" style="padding-top:22px">
      <p class="tiny">Nothing is asked for and nothing is kept — the check-in
        clears itself after ${CHECKIN.holdMinutes} minutes.</p>
    </section>`;

  return {
    html,
    mount(view) {
      const shell = view.querySelector("#ci-shell");
      const dial = view.querySelector("#dial");
      const title = view.querySelector("#ci-title");
      const sub = view.querySelector("#ci-sub");
      const meterSlot = view.querySelector("#ci-meter");
      const actions = view.querySelector("#ci-actions");
      const roomList = view.querySelector("#room-list");
      const meId = presence.myId();
      let ticking = null;

      const paintRoom = () => {
        const people = presence.list();
        roomList.innerHTML = `
          <div class="head">
            <span class="label">In the room</span>
            <span class="tiny">${people.length
              ? `${people.length} ${people.length === 1 ? "person" : "people"}` : ""}</span>
          </div>
          ${people.length
            ? `<div class="card"><ul>${[...people].reverse()
                .map((p) => personRow(p, meId)).join("")}</ul></div>`
            : `<div class="card empty"><span class="empty-mark">${MARK}</span>
                 <p class="display d-3">Nobody is here yet.</p>
                 <p class="small">Quiet hour. The bar is still on.</p></div>`}`;
      };

      const paintState = () => {
        const mine = presence.me();
        clearInterval(ticking);
        dial.dataset.on = mine ? "1" : "0";
        dial.setAttribute("aria-pressed", String(!!mine));
        dial.setAttribute("aria-label", mine ? "Leave" : "Check in");
        dial.classList.toggle("on", !!mine);

        if (!mine) {
          title.textContent = "Are you here?";
          sub.textContent = `Your seat is held for ${CHECKIN.holdMinutes} minutes.`;
          meterSlot.innerHTML = "";
          actions.innerHTML = `<button class="btn btn-primary" type="button" id="in">
            Check in</button>`;
          actions.querySelector("#in").addEventListener("click", () => enter());
          return;
        }

        title.textContent = "You are in.";
        sub.textContent = `Held until ${hm(new Date(mine.until))}. `
          + "Show this screen at the cashier when you order.";
        meterSlot.innerHTML = `<span class="ci-meter"><i style="width:100%"></i></span>`;
        actions.innerHTML = `
          <button class="btn btn-soft" type="button" id="extend"
            style="min-height:46px;font-size:14px;width:auto;padding:0 20px">Another hour</button>
          <button class="btn btn-quiet" type="button" id="out"
            style="width:auto;padding:0 16px">Leave</button>`;
        actions.querySelector("#extend").addEventListener("click", () => {
          haptic(10); presence.extend(); paintState(); toast("Another hour on the clock");
        });
        actions.querySelector("#out").addEventListener("click", () => leave());

        const bar = meterSlot.querySelector("i");
        const tick = () => {
          const left = mine.until - Date.now();
          if (left <= 0) { toast("Your hour is up — the seat is free again");
                           paintState(); return; }
          bar.style.width = `${(clamp(left / HOLD, 0, 1) * 100).toFixed(1)}%`;
        };
        tick();
        ticking = setInterval(tick, 5000);
      };

      const enter = () => {
        presence.checkIn({ name: profile().name });
        haptic([14, 40, 20]);
        if (!reduced()) {
          shell.classList.remove("fire"); void shell.offsetWidth; shell.classList.add("fire");
        }
        paintState();
        toast(`Checked in for ${CHECKIN.holdMinutes} minutes`);
      };

      const leave = () => {
        haptic([8, 24, 8]);
        presence.checkOut();
        paintState();
        toast("See you soon");
      };

      dial.addEventListener("click", () => (presence.me() ? leave() : enter()));

      const off = presence.subscribe(() => {
        if (!roomList.isConnected) { off(); clearInterval(ticking); return; }
        paintRoom();
      });
      document.addEventListener("view:leaving", function once() {
        clearInterval(ticking);
        document.removeEventListener("view:leaving", once);
      });

      paintRoom();
      paintState();
    },
  };
}
