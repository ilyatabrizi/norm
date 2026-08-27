// Check-in. One dial: tap it when you sit down, and the room knows you are
// here for the hour. Tap it again on the way out, or let the hour run out by
// itself. No points, no history, nothing kept once the hour is over.

import { CHECKIN, ROOM } from "../config.js";
import { MARK } from "../brand.js";
import { esc, initials, hm, countdown, clamp } from "../util.js";
import { haptic, tween, reduced } from "../motion.js";
import { sheet, closeSheet, toast } from "../ui.js";
import * as presence from "../presence.js";
import { profile, setProfile } from "../store.js";

const R = 46;
const C = 2 * Math.PI * R;
const HOLD = CHECKIN.holdMinutes * 60000;

/* Ask for a first name once. It never leaves this phone unless the room is
   pointed at a shared endpoint, and even then it is a first name and an hour. */
function askName(onDone) {
  const saved = profile();
  let mood = CHECKIN.moods[0];
  const back = !!saved.name;
  sheet(() => `
    <div class="sheet-head">
      <span class="eyebrow">${back ? "Welcome back" : "Before you sit"}</span>
      <h2 class="display d-2">${back ? `Here for the hour, ${esc(saved.name)}?`
        : "What should the room call you?"}</h2>
      <p class="lede">${back ? "Say what you are here for and the room is yours."
        : "A first name is enough. It disappears when your hour is up."}</p>
    </div>
    <div class="field">
      <label for="ci-name">First name</label>
      <input id="ci-name" type="text" autocomplete="given-name" maxlength="18"
             placeholder="Elnaz" value="${esc(saved.name)}" enterkeyhint="done">
    </div>
    <div class="opt-group">
      <span class="eyebrow">Here for</span>
      <div class="opt-list" id="ci-moods">
        ${CHECKIN.moods.map((m, i) => `<button class="chip" type="button"
          data-mood="${esc(m)}" aria-pressed="${i === 0}">${esc(m)}</button>`).join("")}
      </div>
    </div>
    <div class="sheet-actions">
      <button class="btn btn-green" type="button" id="ci-go">Check in</button>
      <button class="btn btn-quiet" type="button" data-close>Cancel</button>
    </div>`, {
    label: "Check in",
    mount(el) {
      const input = el.querySelector("#ci-name");
      setTimeout(() => input.focus(), 320);
      el.querySelector("#ci-moods").addEventListener("click", (e) => {
        const chip = e.target.closest("[data-mood]");
        if (!chip) return;
        haptic(6);
        mood = chip.dataset.mood;
        el.querySelectorAll("[data-mood]").forEach((c) =>
          c.setAttribute("aria-pressed", String(c === chip)));
      });
      const go = () => {
        const name = input.value.trim();
        if (!name) { input.focus(); return; }
        setProfile({ name });
        closeSheet();
        onDone({ name, mood });
      };
      el.querySelector("#ci-go").addEventListener("click", go);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    },
  });
}

const personRow = (p, meId) => `
  <li class="person${p.id === meId ? " me" : ""}">
    <span class="avatar">${esc(initials(p.name))}</span>
    <span>
      <span class="person-name">${esc(p.name)}${p.id === meId ? " · you" : ""}</span>
      ${p.mood ? `<br><span class="person-tag">${esc(p.mood)}</span>` : ""}
    </span>
    <span class="person-since">${esc(hm(new Date(p.at)))}</span>
  </li>`;

export default function checkin() {
  const html = `
    <section class="section wrap" style="padding-top:10px">
      <div class="head">
        <span class="eyebrow">Check-in</span>
        <span class="tiny">Holds your seat ${CHECKIN.holdMinutes} min</span>
      </div>

      <div class="dial-wrap" style="margin-top:32px">
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
          <span class="dial-time" id="dial-time">Not here yet</span>
          <p class="small dial-hint" id="dial-hint">
            Tap when you sit down. The bar can see you are in, and so can whoever
            is deciding whether to come over.</p>
          <div id="dial-actions" style="display:flex;gap:8px;margin-top:8px;
            justify-content:center;align-items:center"></div>
        </div>
      </div>
    </section>

    <section class="section wrap" id="room-list"></section>

    <section class="wrap">
      <div class="note">
        <span class="eyebrow">What is shared</span>
        <p class="small">Your first name, what you are here for, and the time you
          arrived. It clears itself after ${CHECKIN.holdMinutes} minutes. There is no
          account, no points card, and nothing to sign up for.</p>
      </div>
    </section>`;

  return {
    html,
    mount(view) {
      const dial = view.querySelector("#dial");
      const live = view.querySelector(".ring-live");
      const timeEl = view.querySelector("#dial-time");
      const hintEl = view.querySelector("#dial-hint");
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
            <span class="eyebrow">In the room</span>
            <span class="tiny">${people.length} of ${ROOM.capacity} seats · arrived</span>
          </div>
          ${people.length
            ? `<ul class="people">${[...people].reverse()
                .map((p) => personRow(p, meId)).join("")}</ul>`
            : `<div class="empty"><span class="empty-mark">${MARK}</span>
                 <p class="display d-3">Nobody has checked in.</p>
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
          timeEl.textContent = "Not checked in";
          hintEl.textContent = "Tap when you sit down. The bar can see you are in, "
            + "and so can whoever is deciding whether to come over.";
          actions.innerHTML = "";
          return;
        }

        const paintClock = () => {
          const left = mine.until - Date.now();
          if (left <= 0) {
            toast("Your hour is up — the seat is free again");
            paintState();
            return;
          }
          timeEl.textContent = countdown(mine.until);
          setRing(left / HOLD);
        };

        hintEl.textContent = `Checked in at ${new Date(mine.at)
          .toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}. `
          + "Show this screen at the cashier when you order.";
        actions.innerHTML = `
          <button class="btn btn-ghost" type="button" id="extend"
            style="min-height:42px;font-size:10px">+ ${CHECKIN.extendMinutes} min</button>
          <button class="btn btn-quiet" type="button" id="out"
            style="min-height:42px">Check out</button>`;
        actions.querySelector("#extend").addEventListener("click", () => {
          haptic(10); presence.extend(); paintState({ animate: true });
          toast("Another hour on the clock");
        });
        actions.querySelector("#out").addEventListener("click", () => {
          haptic([8, 24, 8]); presence.checkOut(); paintState();
          toast("Checked out — see you soon");
        });

        if (animate && !reduced()) {
          // Sweep the ring all the way round once, then hand it to the clock.
          sweeping?.();
          timeEl.textContent = countdown(mine.until);
          sweeping = tween(0, 1, 760, (v, t) => {
            setRing(v * (mine.until - Date.now()) / HOLD);
            if (t === 1) { paintClock(); ticking = setInterval(paintClock, 1000); }
          });
        } else {
          paintClock();
          ticking = setInterval(paintClock, 1000);
        }
      };

      dial.addEventListener("click", () => {
        if (presence.me()) {
          haptic([8, 24, 8]);
          presence.checkOut();
          paintState();
          toast("Checked out — see you soon");
          return;
        }
        const start = ({ name, mood }) => {
          presence.checkIn({ name, mood });
          haptic([14, 40, 20]);
          dial.classList.remove("fire"); void dial.offsetWidth;
          dial.classList.add("fire");
          paintState({ animate: true });
          toast(`You are in the room for ${CHECKIN.holdMinutes} minutes`);
        };
        // The sheet is shown every time: the name is prefilled after the first
        // visit, but what you are here for changes from one afternoon to the next.
        askName(start);
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
