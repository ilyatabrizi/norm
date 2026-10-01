// You — which here means this device. A name if you want one, the orders you
// have sent, the shop's own details, and a way to wipe all of it.
// No sign-up, no points, nothing leaves the phone.
//
// The name used to live behind a sheet with a Save button. It is two fields on
// the page now, saved as you type, because that was two taps of ceremony around
// something nobody is obliged to fill in at all.

import { BUSINESS } from "../config.js";
import { MARK } from "../brand.js";
import { esc, price, hm, DAYS, openState } from "../util.js";
import { icon } from "../icons.js";
import { toast } from "../ui.js";
import { haptic } from "../motion.js";
import { profile, setProfile, orders, forgetEverything } from "../store.js";
import * as presence from "../presence.js";
import { isStandalone, isIOS, canPrompt, promptInstall } from "../install.js";

export default function account() {
  const me = profile();
  const list = orders();
  const state = openState();
  const today = new Date().getDay();

  const installRow = isStandalone()
    ? `<div class="list-item">
         <span class="ico">${icon("check")}</span>
         <span class="list-body">
           <span class="list-label">نصب شده</span>
           <span class="list-note">NORM روی صفحهٔ اصلی این گوشی هست</span>
         </span>
       </div>`
    : `<button class="list-item" type="button" id="install">
         <span class="ico">${icon("install")}</span>
         <span class="list-body">
           <span class="list-label">NORM را به صفحهٔ اصلی اضافه کنید</span>
           <span class="list-note">${isIOS() ? "در سافاری: Share ← Add to Home Screen"
             : "مثل اپ باز می‌شود، آفلاین هم کار می‌کند"}</span>
         </span>
         <span class="list-value">${icon("chevron")}</span>
       </button>`;

  const html = `
  <div class="band" data-tone="paper" style="padding-top:calc(var(--bar-h) + 24px)">
    <div class="wrap">
      <h1 class="title">شما</h1>
      <p class="title-sub">حساب کاربری در کار نیست. اسم اختیاری است — فقط همان چیزی است
        که وقتی حضورتان را ثبت می‌کنید سالن شما را با آن صدا می‌زند.</p>

      <div class="grid" style="margin-top:26px;gap:14px">
        <div class="field">
          <label for="ac-name">اسم</label>
          <input id="ac-name" type="text" maxlength="18" autocomplete="given-name"
                 placeholder="سالن شما را چه صدا کند" value="${esc(me.name)}">
        </div>
        <div class="field">
          <label for="ac-phone">تلفن · اختیاری</label>
          <input id="ac-phone" type="tel" maxlength="15" autocomplete="tel" dir="ltr"
                 placeholder="فقط اگر بار لازم شد زنگ بزند" value="${esc(me.phone)}">
        </div>
      </div>
      <p class="tiny" id="saved" style="margin-top:12px">
        ${presence.isIn() ? "همین الان حضورتان ثبت است." : "فقط روی همین گوشی می‌ماند، جای دیگری نه."}</p>

      <div style="margin-top:30px">
        ${installRow}
        <button class="list-item" type="button" id="share">
          <span class="ico">${icon("share")}</span>
          <span class="list-body"><span class="list-label">NORM را بفرستید</span>
            <span class="list-note">لینک را برای یک دوست بفرستید</span></span>
          <span class="list-value">${icon("chevron")}</span>
        </button>
      </div>
    </div>
  </div>

  <div class="band" data-tone="deep">
    <div class="wrap">
      <div class="sechead">
        <span class="label">سفارش‌های شما</span>
        <span class="idx">${list.length ? `${list.length} سفارش آخر` : "هنوز هیچ"}</span>
      </div>
      ${list.length ? list.map((o) => {
        const n = o.lines.reduce((sum, l) => sum + l.qty, 0);
        return `
        <a class="list-item" href="#/order/${o.id}">
          <span class="ico">${icon("receipt")}</span>
          <span class="list-body">
            <span class="list-label">${esc(o.code)}، ${n} قلم</span>
            <span class="list-note">${esc(hm(new Date(o.at)))}، ${esc(price(o.total))}</span>
          </span>
          <span class="list-value">${icon("chevron")}</span>
        </a>`; }).join("")
      : `<div class="empty"><span class="empty-mark">${MARK}</span>
           <p class="display d-2">هنوز سفارشی نداده‌اید.</p>
           <p class="small">هر چه از سبد بفرستید اینجا می‌آید.</p></div>`}
    </div>
  </div>

  <div class="band" data-tone="paper">
    <div class="wrap">
      <div class="sechead">
        <span class="label">خود کافه</span>
        <span class="idx">${state.open ? `تا ${esc(state.closes)} باز`
          : `${esc(state.opens)} باز می‌کند`}</span>
      </div>
      <a class="list-item" target="_blank" rel="noopener"
         href="https://maps.google.com/?q=${BUSINESS.geo.lat},${BUSINESS.geo.lng}">
        <span class="ico">${icon("map")}</span>
        <span class="list-body"><span class="list-label">${esc(BUSINESS.district)}،
          ${esc(BUSINESS.city)}</span>
          <span class="list-note">${esc(BUSINESS.address)}</span></span>
        <span class="list-value">${icon("chevron")}</span>
      </a>
      <a class="list-item" href="${esc(BUSINESS.instagramUrl)}" target="_blank" rel="noopener">
        <span class="ico">${icon("instagram")}</span>
        <span class="list-body"><span class="list-label">@${esc(BUSINESS.instagram)}</span>
          <span class="list-note">این هفته چه چیزی روی تخته است</span></span>
        <span class="list-value">${icon("chevron")}</span>
      </a>
      ${BUSINESS.phone ? `<a class="list-item" href="tel:${esc(BUSINESS.phone)}">
        <span class="ico">${icon("phone")}</span>
        <span class="list-body"><span class="list-label">${esc(BUSINESS.phone)}</span>
          <span class="list-note">زنگ بزنید به بار</span></span>
        <span class="list-value">${icon("chevron")}</span></a>` : ""}

      <div style="margin-top:26px">
        ${DAYS.map((d, i) => {
          const h = BUSINESS.hours[i];
          return `<div class="hours-row${i === today ? " today" : ""}">
            <span>${esc(d)}</span><span>${h ? `${esc(h[0])} — ${esc(h[1])}` : "Closed"}</span>
          </div>`;
        }).join("")}
      </div>
    </div>
  </div>

  <div class="band" data-tone="deep">
    <div class="wrap">
      <button class="list-item" type="button" id="wipe" style="border-bottom:0">
        <span class="ico">${icon("trash")}</span>
        <span class="list-body">
          <span class="list-label" id="wipe-label">همه چیز را از این گوشی پاک کن</span>
          <span class="list-note">سبد، اسم، سفارش‌ها و ثبت حضور</span>
        </span>
      </button>
      <div style="display:grid;justify-items:center;gap:12px;padding:34px 0 0">
        <span style="width:48px;color:#2A2523">${MARK}</span>
        <span class="tiny"><span dir="ltr">${esc(BUSINESS.legal)}</span> · <span dir="ltr">v7</span></span>
      </div>
    </div>
  </div>`;

  return {
    html,
    mount(view) {
      const name = view.querySelector("#ac-name");
      const phone = view.querySelector("#ac-phone");
      const saved = view.querySelector("#saved");
      let timer = null;
      const keep = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          setProfile({ name: name.value.trim(), phone: phone.value.trim() });
          saved.textContent = "روی همین گوشی ذخیره شد.";
        }, 400);
      };
      name.addEventListener("input", keep);
      phone.addEventListener("input", keep);

      view.querySelector("#install")?.addEventListener("click", async () => {
        haptic(8);
        if (canPrompt()) {
          const outcome = await promptInstall();
          if (outcome === "accepted") toast("NORM روی صفحهٔ اصلی شماست");
          return;
        }
        toast(isIOS() ? "Share را بزنید، بعد Add to Home Screen"
                      : "از منوی مرورگر ← Install app");
      });

      view.querySelector("#share").addEventListener("click", async () => {
        haptic(8);
        const url = location.href.split("#")[0];
        try {
          if (navigator.share) await navigator.share({ title: "NORM Unity", url });
          else { await navigator.clipboard.writeText(url); toast("لینک کپی شد"); }
        } catch { /* the sheet was dismissed */ }
      });

      const wipe = view.querySelector("#wipe");
      const label = view.querySelector("#wipe-label");
      wipe.addEventListener("click", () => {
        if (wipe.dataset.armed !== "1") {
          wipe.dataset.armed = "1";
          label.textContent = "برای پاک کردن دوباره بزنید";
          label.style.color = "var(--green-ink)";
          setTimeout(() => {
            if (!wipe.isConnected) return;
            wipe.dataset.armed = "0";
            label.textContent = "همه چیز را از این گوشی پاک کن";
            label.style.removeProperty("color");
          }, 4000);
          return;
        }
        haptic([10, 30, 10]);
        presence.checkOut();
        forgetEverything();
        toast("پاک شد. چیزی نماند.");
        location.hash = "#/";
      });
    },
  };
}
