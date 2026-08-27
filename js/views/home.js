// Home. The room first — its name, whether the door is open, and who is
// already inside — then the card, then how to find it.

import { BUSINESS, ROOM } from "../config.js";
import { ITEMS } from "../data.js";
import { MARK, WORDMARK } from "../brand.js";
import { esc, price, openState, DAYS } from "../util.js";
import { icon } from "../icons.js";
import * as presence from "../presence.js";
import { openItem } from "./item.js";

const SIGNATURE = ["matcha-latte", "flat-white", "cold-brew", "basque"];

const seatGrid = (taken, mine) =>
  Array.from({ length: ROOM.capacity }, (_, i) => {
    const on = i < taken;
    const isMine = mine && i === taken - 1;
    return `<span class="seat${on ? " taken" : ""}${isMine ? " mine" : ""}"
      style="transition-delay:${Math.min(i, 14) * 26}ms"></span>`;
  }).join("");

function roomBlock() {
  const people = presence.list();
  const mine = presence.isIn();
  const n = people.length;
  return `
    <a class="head" href="#/checkin" style="text-decoration:none">
      <span class="eyebrow">The room</span>
      <span class="head-link">${mine ? "You are checked in" : "Check in"} →</span>
    </a>
    <div class="room-grid" id="room-grid">${seatGrid(n, mine)}</div>
    <div class="room-line">
      <span class="room-count" id="room-count">${n === 0 ? "Empty" : n}
        <em>${n === 0 ? "· be the first" : `of ${ROOM.capacity} seats taken`}</em></span>
      <span class="tiny">${n ? esc(people.slice(-3).map((p) => p.name).join(" · ")) : ""}</span>
    </div>`;
}

export default function home() {
  const state = openState();
  const today = BUSINESS.hours[new Date().getDay()];

  const cardRows = SIGNATURE.map((id) => ITEMS.find((i) => i.id === id))
    .filter(Boolean).map((item) => `
      <button class="row" type="button" data-item="${item.id}">
        <span class="row-name">${esc(item.name)}</span>
        <span class="row-price num">${price(item.price)}</span>
        <span class="row-desc">${esc(item.desc)}</span>
      </button>`).join("");

  const html = `
    <section class="hero">
      <div class="hero-mark">${MARK}</div>
      <div class="hero-word">${WORDMARK}</div>
      <p class="hero-tag">${esc(BUSINESS.city)} · ${esc(BUSINESS.district)}</p>
      <div class="hero-meta">
        <span class="hero-status">
          <span class="pulse${state.open ? "" : " off"}"></span>
          ${state.open ? `Open until ${esc(state.closes)}` : `Opens ${esc(state.opens)}`}
        </span>
        <span class="hero-status">${esc(DAYS[new Date().getDay()])}</span>
      </div>
      <span class="hero-scroll"></span>
    </section>

    <section class="section wrap" id="room">${roomBlock()}</section>

    <section class="section wrap">
      <div class="head">
        <span class="eyebrow">The card</span>
        <a class="head-link" href="#/menu">Everything →</a>
      </div>
      <div class="rows">${cardRows}</div>
    </section>

    <section>
      <figure class="band band-wide">
        <picture>
          <source srcset="assets/photos/street.webp" type="image/webp">
          <img src="assets/photos/street.jpg" alt="A NORM cup on the street outside"
               loading="lazy" width="1179" height="537">
        </picture>
        <figcaption class="band-cap">
          <span class="eyebrow" style="color:var(--paper-dim)">Takeaway, any hour</span>
          <span class="tiny">No. 01</span>
        </figcaption>
      </figure>
    </section>

    <section class="section wrap">
      <div class="head">
        <span class="eyebrow">House pour</span>
        <a class="head-link" href="#/menu?cat=matcha">Matcha →</a>
      </div>
      <div class="split">
        <picture>
          <source srcset="assets/photos/portrait.webp" type="image/webp">
          <img src="assets/photos/portrait.jpg" alt="Iced matcha at the window"
               loading="lazy" width="659" height="1090">
        </picture>
        <div class="split-body">
          <h3 class="display d-3">Ceremonial grade,<br>whisked to order.</h3>
          <p class="small">Nothing pre-mixed and nothing from a bottle. Hot, iced,
            or dirty with a shot dropped through it.</p>
          <a class="head-link" href="#/item/matcha-latte">Order one →</a>
        </div>
      </div>
    </section>

    <section class="section wrap">
      <div class="head"><span class="eyebrow">Find us</span>
        <a class="head-link" href="${esc(BUSINESS.instagramUrl)}" target="_blank"
           rel="noopener">@${esc(BUSINESS.instagram)} →</a></div>
      <div class="list">
        <a class="list-item" href="https://maps.google.com/?q=${BUSINESS.geo.lat},${BUSINESS.geo.lng}"
           target="_blank" rel="noopener">
          <span class="list-label">${esc(BUSINESS.address)}</span>
          <span class="list-value">${icon("map")}</span>
        </a>
        <div class="list-item">
          <span class="list-label">Today</span>
          <span class="list-value num">${esc(today[0])} — ${esc(today[1])}</span>
        </div>
      </div>
      <p class="tiny" style="margin-top:22px">${esc(BUSINESS.legal)} · ${esc(BUSINESS.tagline)}</p>
    </section>`;

  return {
    html,
    mount(view) {
      document.getElementById("shell").dataset.hero = "1";
      view.querySelectorAll("[data-item]").forEach((btn) =>
        btn.addEventListener("click", () => openItem(btn.dataset.item)));

      // The room block redraws itself whenever presence changes — someone
      // checking in on another tab, or an hour running out.
      const room = view.querySelector("#room");
      const off = presence.subscribe(() => {
        if (!room.isConnected) { off(); return; }
        room.innerHTML = roomBlock();
      });
    },
  };
}
