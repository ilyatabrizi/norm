// Home. The page falls through four bands, each one opened by a numbered head:
// the room, the card, the matcha, and where to find it. Nothing on it needs a
// second tap to understand — the hero says what the place is, and every action
// on the page is one press.

import { BUSINESS, ROOM } from "../config.js";
import { ITEMS, byId } from "../data.js";
import { MARK, WORDMARK } from "../brand.js";
import { esc, openState } from "../util.js";
import { icon } from "../icons.js";
import { itemRow } from "../rows.js";
import { addDrink } from "../ui.js";
import * as presence from "../presence.js";

const SIGNATURE = ["matcha-latte", "flat-white", "cold-brew", "basque"];

const SAID = ["همان لحظه هم‌زده", "تازه کشیده", "هجده ساعت در آب سرد",
              "ولیعصر", "بدون صف، بدون حساب کاربری", "قهوه، بی‌حاشیه"];

const sechead = (name, n) => `
  <div class="sechead rv">
    <span class="label">${esc(name)}</span>
    <span class="idx">0${n} / 04</span>
  </div>`;

function roomRow() {
  const people = presence.list();
  const mine = presence.isIn();
  const n = people.length;
  const named = people.map((p) => p.name).filter(Boolean);
  const who = mine
    ? "شما جایی را گرفته‌اید"
    : named.length
      ? `${named.slice(-3).join("، ")}${named.length > 3 ? " و چند نفر دیگر" : ""}`
      : "اولین نفر امروز باشید";
  return `
    <a class="room" href="#/checkin">
      <span class="room-n">${n || "—"}</span>
      <span class="room-copy">
        <span class="room-line">${n
          ? `<span class="dot"></span>${n} نفر الان اینجا هستند`
          : "هنوز کسی اینجا نیست"}</span>
        <span class="room-who">${esc(who)}</span>
      </span>
      <span class="room-go">${icon("chevron")}</span>
    </a>`;
}

export default function home() {
  const state = openState();
  const today = BUSINESS.hours[new Date().getDay()];
  const picks = SIGNATURE.map((id) => byId(id)).filter(Boolean);
  const matcha = byId("matcha-latte") || ITEMS[0];

  const html = `
  <section class="hero" data-tone="paper">
    <div class="hero__media">
      <picture>
        <source srcset="assets/photos/hero.webp" type="image/webp">
        <img src="assets/photos/hero.jpg" alt="ماچای سرد NORM، مقابل شیشه‌های سبز"
             width="734" height="1240" fetchpriority="high" decoding="async">
      </picture>
    </div>
    <div class="hero__inner wrap">
      <div class="hero__mark">${MARK}</div>
      <div class="hero__word">${WORDMARK}</div>
      <h1 class="hero__tag">قهوه،<br><i>بی‌حاشیه.</i></h1>
      <div class="hero__meta">
        <span class="label">${esc(BUSINESS.city)} · ${esc(BUSINESS.district)}</span>
        <span class="pill-status">
          <span class="dot${state.open ? "" : " off"}"></span>
          ${state.open ? `تا ${esc(state.closes)} باز است` : `${esc(state.opens)} باز می‌کنیم`}
        </span>
      </div>
      <div class="hero__cta">
        <a class="btn btn--block" href="#/menu">منو را ببینید ${icon("arrow")}</a>
        <a class="btn btn--ghost btn--block" href="#/checkin">وقتی نشستید حضورتان را ثبت کنید</a>
      </div>
    </div>
  </section>

  <div data-tone="paper"><div class="marquee"><div class="marquee__track">
    ${[1, 2].map(() => SAID.map((t) =>
      `<div class="marquee__item">${esc(t)}</div>`).join("")).join("")}
  </div></div></div>

  <section class="band" data-tone="deep" id="room-band">
    <div class="wrap">
      ${sechead("سالن", 1)}
      <p class="display d-1 rv">ببینید کی هست،<br>قبل از اینکه راه بیفتید.</p>
      <p class="lede rv rv-d1" style="margin-top:16px">وقتی نشستید یک بار بزنید. یک ساعت
        جای شما را نگه می‌دارد و خودش رهایش می‌کند — بدون اسم، بدون حساب کاربری، بدون
        اینکه چیزی جایی ذخیره شود.</p>
      <div id="room" class="rv rv-d2" style="margin-top:26px">${roomRow()}</div>
      <div class="grid grid-2 pairs rv rv-d2" style="margin-top:26px">
        <div><div class="stat__n">${ROOM.capacity}</div>
          <p class="small" style="margin-top:4px">صندلی، بار و تراس</p></div>
        <div><div class="stat__n">60</div>
          <p class="small" style="margin-top:4px">دقیقه که هر ثبت حضور نگه می‌دارد</p></div>
      </div>
      <div class="frame frame--wide rv rv-d3" style="margin-top:30px">
        <picture>
          <source srcset="assets/photos/street.webp" type="image/webp">
          <img class="imgload" src="assets/photos/street.jpg" width="1179" height="537"
               alt="یک لیوان NORM روی پیاده‌رو" loading="lazy" decoding="async">
        </picture>
        <span class="frame__cap">${esc(BUSINESS.district)} · ${esc(BUSINESS.city)}</span>
      </div>
    </div>
  </section>

  <section class="band" data-tone="paper">
    <div class="wrap">
      ${sechead("منو", 2)}
      <p class="display d-1 rv">همان چندتایی که<br>واقعاً قبولشان داریم.</p>
      <p class="lede rv rv-d1" style="margin-top:16px">روی + بزنید و همان‌طور که هست
        می‌رود داخل سبد. شیر، اندازه و یخ را داخل سبد عوض می‌کنید — یا اصلاً دست
        نمی‌زنید.</p>
      <ul class="mlist rv rv-d2" style="margin-top:24px">${picks.map(itemRow).join("")}</ul>
      <a class="btn btn--ghost btn--block rv rv-d2" href="#/menu" style="margin-top:26px">
        تمام منو ${icon("arrow")}</a>
    </div>
  </section>

  <section class="band" data-tone="cream">
    <div class="wrap">
      ${sechead("ماچا", 3)}
      <p class="display d-1 rv">درجهٔ تشریفاتی،<br>همان لحظه هم‌زده.</p>
      <p class="lede rv rv-d1" style="margin-top:16px">هیچ چیز از قبل آماده نیست و هیچ چیز
        از بطری نمی‌آید. وقتی سفارش بدهید درست می‌شود، که تنها حالتی است که ارزش خوردن
        دارد.</p>
      <div class="frame frame--45 frame--low rv rv-d2" style="margin-top:26px">
        <picture>
          <source srcset="assets/photos/portrait.webp" type="image/webp">
          <img class="imgload" src="assets/photos/portrait.jpg" width="659" height="1090"
               alt="ماچای سرد، در دست" loading="lazy" decoding="async">
        </picture>
      </div>
      <button class="btn btn--dark btn--block rv rv-d2" type="button" id="add-matcha"
        style="margin-top:22px">یک <span dir="ltr">${esc(matcha.name)}</span> بریز
        ${icon("plus")}</button>
    </div>
  </section>

  <section class="band" data-tone="paper">
    <div class="wrap">
      ${sechead("نشانی", 4)}
      <div class="rv">
        <a class="list-item" href="https://maps.google.com/?q=${BUSINESS.geo.lat},${BUSINESS.geo.lng}"
           target="_blank" rel="noopener">
          <span class="ico">${icon("map")}</span>
          <span class="list-body">
            <span class="list-label">${esc(BUSINESS.district)}، ${esc(BUSINESS.city)}</span>
            <span class="list-note">${esc(BUSINESS.address)}</span>
          </span>
          <span class="list-value">${icon("chevron")}</span>
        </a>
        <div class="list-item">
          <span class="ico">${icon("clock")}</span>
          <span class="list-body">
            <span class="list-label">امروز</span>
            <span class="list-note">${state.open ? "الان باز است" : "الان بسته است"}</span>
          </span>
          <span class="list-value">${esc(today[0])} — ${esc(today[1])}</span>
        </div>
        <a class="list-item" href="${esc(BUSINESS.instagramUrl)}" target="_blank" rel="noopener">
          <span class="ico">${icon("instagram")}</span>
          <span class="list-body">
            <span class="list-label" dir="ltr">@${esc(BUSINESS.instagram)}</span>
            <span class="list-note">این هفته چه چیزی روی تخته است</span>
          </span>
          <span class="list-value">${icon("chevron")}</span>
        </a>
      </div>
      <div style="display:grid;justify-items:center;gap:12px;padding:44px 0 0">
        <span style="width:48px;color:#2A2523">${MARK}</span>
        <span class="tiny"><span dir="ltr">${esc(BUSINESS.legal)}</span> ·
          ${esc(BUSINESS.tagline)}</span>
      </div>
    </div>
  </section>`;

  return {
    html,
    mount(view) {
      view.querySelector("#add-matcha").addEventListener("click", (e) =>
        addDrink(matcha.id, e.currentTarget));

      const room = view.querySelector("#room");
      const off = presence.subscribe(() => {
        if (!room.isConnected) { off(); return; }
        room.innerHTML = roomRow();
      });
    },
  };
}
