// Check-in. One tap, nothing asked. It holds your seat for an hour and lets it
// go by itself; tapping again is how you leave early.

import { CHECKIN } from "../config.js";
import { MARK } from "../brand.js";
import { esc, initials, hm, clamp } from "../util.js";
import { haptic, reduced } from "../motion.js";
import { toast } from "../ui.js";
import * as presence from "../presence.js";
import { profile } from "../store.js";

const HOLD = CHECKIN.holdMinutes * 60000;

const nameOf = (p, mine) => (p.name || (mine ? "شما" : "یک نفر"));

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
  <div class="band" data-tone="paper" style="padding-top:calc(var(--bar-h) + 24px)">
    <div class="wrap">
      <h1 class="title">ثبت حضور</h1>
      <p class="title-sub">وقتی نشستید یک بار بزنید. هم بار می‌داند که اینجایید، هم هر کسی
        که دارد تصمیم می‌گیرد سر بزند یا نه.</p>

      <div class="ci-shell" id="ci-shell" style="margin-top:14px">
        <button class="ci" id="dial" type="button" aria-pressed="false" aria-label="ثبت حضور">
          <span class="ci-mark">${MARK}</span>
          <span class="ci-title" id="ci-title">اینجایید؟</span>
          <span class="ci-sub" id="ci-sub">جای شما ${CHECKIN.holdMinutes} دقیقه
            نگه داشته می‌شود.</span>
          <span class="ci-slot" id="ci-meter"></span>
        </button>
        <div class="ci-actions" id="ci-actions"></div>
        <span class="ci-ripple"></span>
      </div>

      <p class="tiny" style="margin-top:30px;text-align:center">
        چیزی پرسیده نمی‌شود و چیزی نگه داشته نمی‌شود — ثبت حضور بعد از
        ${CHECKIN.holdMinutes} دقیقه خودش پاک می‌شود.</p>
    </div>
  </div>

  <div class="band" data-tone="deep" id="room-band">
    <div class="wrap" id="room-list"></div>
  </div>`;

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
          <div class="sechead">
            <span class="label">الان در سالن</span>
            <span class="idx">${people.length
              ? `${people.length} نفر` : "خالی"}</span>
          </div>
          ${people.length
            ? `<ul>${[...people].reverse().map((p) => personRow(p, meId)).join("")}</ul>`
            : `<div class="empty"><span class="empty-mark">${MARK}</span>
                 <p class="display d-2">هنوز کسی اینجا نیست.</p>
                 <p class="small">ساعت خلوت. بار همچنان روشن است.</p></div>`}`;
      };

      const paintState = () => {
        const mine = presence.me();
        clearInterval(ticking);
        dial.setAttribute("aria-pressed", String(!!mine));
        dial.setAttribute("aria-label", mine ? "رفتن" : "ثبت حضور");
        dial.classList.toggle("on", !!mine);

        if (!mine) {
          title.textContent = "اینجایید؟";
          sub.textContent = `جای شما ${CHECKIN.holdMinutes} دقیقه نگه داشته می‌شود.`;
          meterSlot.innerHTML = "";
          actions.innerHTML = `<button class="btn btn--block" type="button" id="in">
            ثبت حضور</button>`;
          actions.querySelector("#in").addEventListener("click", () => enter());
          return;
        }

        title.textContent = "ثبت شد.";
        sub.textContent = `تا ${hm(new Date(mine.until))} نگه داشته شده. `
          + "موقع سفارش همین صفحه را سر صندوق نشان بدهید.";
        meterSlot.innerHTML = `<span class="ci-meter"><i style="width:100%"></i></span>`;
        actions.innerHTML = `
          <button class="btn btn--soft btn--sm" type="button" id="extend">یک ساعت دیگر</button>
          <button class="btn btn--quiet btn--sm" type="button" id="out">رفتم</button>`;
        actions.querySelector("#extend").addEventListener("click", () => {
          haptic(10); presence.extend(); paintState(); toast("یک ساعت دیگر روی ساعت");
        });
        actions.querySelector("#out").addEventListener("click", () => leave());

        const bar = meterSlot.querySelector("i");
        const tick = () => {
          const left = mine.until - Date.now();
          if (left <= 0) { toast("ساعتتان تمام شد — جا دوباره آزاد است");
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
        toast(`${CHECKIN.holdMinutes} دقیقه ثبت شد`);
      };

      const leave = () => {
        haptic([8, 24, 8]);
        presence.checkOut();
        paintState();
        toast("به‌زودی می‌بینیمتان");
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
