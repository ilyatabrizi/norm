// Check-in. One tap, nothing asked. The dial holds your seat for an hour and
// then lets it go by itself; tapping again is how you leave early.

import { CHECKIN } from "../config.js";
import { MARK } from "../brand.js";
import { esc, initials, hm, clamp } from "../util.js";
import { haptic, tween, reduced } from "../motion.js";
import { toast } from "../ui.js";
import * as presence from "../presence.js";
import { profile } from "../store.js";

const R = 46;
const C = 2 * Math.PI * R;
const HOLD = CHECKIN.holdMinutes * 60000;

const nameOf = (p, mine) => (p.name || (mine ? "You" : "Someone"));

const personRow = (p, meId) => {
  const mine = p.id === meId;
  const who = nameOf(p, mine);
  return `
    <li class="person${mine ? " me" : ""}">
      <span class="avatar">${mine && !p.name ? "•" : esc(initials(who))}</span>
      <span class="person-name">${esc(who)}</span>
      <span class="person-since">${esc(hm(new Date(p.at)))}</span>
    </li>`;
};

export default function checkin() {
  const html = `
    <section class="section wrap" style="padding-top:6px">
      <div class="dial-wrap">
        <button class="dial" id="dial" type="button" data-on="0"
                aria-pressed="false" aria-label="Check in">
          <svg class="ring" viewBox="0 0 100 100" aria-hidden="true">
            <circle class="ring-track" cx="50" cy="50" r="${R}"></circle>
            <circle class="ring-live" cx="50" cy="50" r="${R}"
              stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${C.toFixed(1)}"></circle>
          </svg>
          <span class="dial-mark">${MARK}</span>
          <span class="dial-ripple"></span>
        </button>

        <div class="dial-caption">
          <h1 class="display d-2" id="dial-title">Are you here?</h1>
          <p class="small" id="dial-hint">One tap and the room knows.
            Your seat is held for an hour.</p>
          <div id="dial-actions" style="display:flex;gap:10px;align-items:center"></div>
        </div>
      </div>
    </section>

    <section class="section wrap" id="room-list"></section>

    <section class="wrap">
      <p class="tiny">Nothing is asked for and nothing is kept — the check-in
        clears itself after ${CHECKIN.holdMinutes} minutes.</p>
    </section>`;

  return {
    html,
    mount(view) {
      const dial = view.querySelector("#dial");
      const live = view.querySelector(".ring-live");
      const title = view.querySelector("#dial-title");
      const hint = view.querySelector("#dial-hint");
      const actions = view.querySelector("#dial-actions");
      const roomList = view.querySelector("#room-list");
      const meId = presence.myId();
      let ticking = null, sweeping = null;

      const setRing = (p) => {
        live.style.strokeDashoffset = (C * (1 - clamp(p, 0, 1))).toFixed(2);
      };

      const paintRoom = () => {
        const people = presence.list();
        roomList.innerHTML = `
          <div class="head">
            <span class="label">In the room</span>
            <span class="tiny">${people.length ? `${people.length} ${people.length === 1 ? "person" : "people"}` : ""}</span>
          </div>
          ${people.length
            ? `<ul class="people">${[...people].reverse()
                .map((p) => personRow(p, meId)).join("")}</ul>`
            : `<div class="empty"><span class="empty-mark">${MARK}</span>
                 <p class="display d-3">Nobody is here yet.</p>
                 <p class="small">Quiet hour. The bar is still on.</p></div>`}`;
      };

      const paintState = ({ animate = false } = {}) => {
        const mine = presence.me();
        clearInterval(ticking);
        dial.dataset.on = mine ? "1" : "0";
        dial.setAttribute("aria-pressed", String(!!mine));
        dial.setAttribute("aria-label", mine ? "Check out" : "Check in");

        if (!mine) {
          sweeping?.();
          setRing(0);
          title.textContent = "Are you here?";
          hint.textContent = "One tap and the room knows. Your seat is held for an hour.";
          actions.innerHTML = "";
          return;
        }

        const until = hm(new Date(mine.until));
        title.textContent = "You are in.";
        hint.textContent = `Your seat is held until ${until}. `
          + "Show this screen at the cashier when you order.";
        actions.innerHTML = `
          <button class="btn btn-ghost" type="button" id="extend"
            style="min-height:44px;font-size:14px">Another hour</button>
          <button class="btn btn-quiet" type="button" id="out">Leave</button>`;
        actions.querySelector("#extend").addEventListener("click", () => {
          haptic(10); presence.extend(); paintState();
          toast("Another hour on the clock");
        });
        actions.querySelector("#out").addEventListener("click", () => leave());

        const tick = () => {
          const left = mine.until - Date.now();
          if (left <= 0) { toast("Your hour is up — the seat is free again");
                           paintState(); return; }
          setRing(left / HOLD);
        };

        if (animate && !reduced()) {
          // The ring sweeps the whole hour round once, then settles onto the clock.
          sweeping?.();
          sweeping = tween(0, 1, 820, (v, t) => {
            setRing(v * (mine.until - Date.now()) / HOLD);
            if (t === 1) { tick(); ticking = setInterval(tick, 5000); }
          });
        } else {
          tick();
          ticking = setInterval(tick, 5000);
        }
      };

      const leave = () => {
        haptic([8, 24, 8]);
        presence.checkOut();
        paintState();
        toast("See you soon");
      };

      dial.addEventListener("click", () => {
        if (presence.me()) { leave(); return; }
        // No sheet, no questions. The name is whatever Account has, if anything.
        presence.checkIn({ name: profile().name });
        haptic([14, 40, 20]);
        dial.classList.remove("fire"); void dial.offsetWidth;
        dial.classList.add("fire");
        paintState({ animate: true });
        toast(`Checked in for ${CHECKIN.holdMinutes} minutes`);
      });

      const off = presence.subscribe(() => {
        if (!roomList.isConnected) { off(); clearInterval(ticking); return; }
        paintRoom();
      });
      document.addEventListener("view:leaving", function once() {
        clearInterval(ticking); sweeping?.();
        document.removeEventListener("view:leaving", once);
      });

      paintRoom();
      paintState();
    },
  };
}
