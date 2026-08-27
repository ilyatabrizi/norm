// Home. The name, whether the door is open, who is already inside, a few
// things worth ordering, and where to find it. Nothing else.

import { BUSINESS } from "../config.js";
import { ITEMS } from "../data.js";
import { MARK, WORDMARK } from "../brand.js";
import { esc, price, openState } from "../util.js";
import { icon } from "../icons.js";
import * as presence from "../presence.js";
import { openItem } from "./item.js";

const SIGNATURE = ["matcha-latte", "flat-white", "cold-brew", "basque"];

function roomBlock() {
  const people = presence.list();
  const mine = presence.isIn();
  const n = people.length;
  const named = people.map((p) => p.name).filter(Boolean);

  if (!n) {
    return `
      <a class="head" href="#/checkin">
        <span class="label">The room</span>
        <span class="head-link">Check in →</span>
      </a>
      <p class="room-line">Nobody has checked in yet today.</p>`;
  }
  return `
    <a class="head" href="#/checkin">
      <span class="label">The room</span>
      <span class="head-link">${mine ? "You are in" : "Check in"} →</span>
    </a>
    <div class="room">
      <span class="room-n">${n}</span>
      <span class="room-line">${n === 1 ? "person is" : "people are"} here right now</span>
      ${named.length ? `<span class="room-who">${esc(named.slice(-4).join(", "))}${
        named.length > 4 ? " and others" : ""}</span>` : ""}
    </div>`;
}

export default function home() {
  const state = openState();
  const today = BUSINESS.hours[new Date().getDay()];

  const cardRows = SIGNATURE.map((id) => ITEMS.find((i) => i.id === id))
    .filter(Boolean).map((item) => `
      <button class="row" type="button" data-item="${item.id}">
        <span class="row-name">${esc(item.name)}</span>
        <span class="row-price money">${price(item.price)}</span>
        <span class="row-desc">${esc(item.desc)}</span>
      </button>`).join("");

  const html = `
    <section class="hero">
      <div class="hero-mark">${MARK}</div>
      <div class="hero-word">${WORDMARK}</div>
      <p class="hero-place">${esc(BUSINESS.city)} · ${esc(BUSINESS.district)}</p>
      <p class="hero-status">
        <span class="dot${state.open ? "" : " off"}"></span>
        ${state.open ? `Open until ${esc(state.closes)}` : `Opens at ${esc(state.opens)}`}
      </p>
    </section>

    <section class="section wrap" id="room">${roomBlock()}</section>

    <section class="section wrap">
      <div class="head">
        <span class="label">The card</span>
        <a class="head-link" href="#/menu">See all →</a>
      </div>
      <div class="rows">${cardRows}</div>
    </section>

    <section class="section wrap">
      <figure class="band band-wide band-full">
        <picture>
          <source srcset="assets/photos/street.webp" type="image/webp">
          <img src="assets/photos/street.jpg" alt="A NORM cup on the street outside"
               loading="lazy" width="1179" height="537">
        </picture>
        <figcaption class="band-cap">Takeaway, any hour</figcaption>
      </figure>
    </section>

    <section class="section wrap">
      <div class="split">
        <picture>
          <source srcset="assets/photos/portrait.webp" type="image/webp">
          <img src="assets/photos/portrait.jpg" alt="Iced matcha at the window"
               loading="lazy" width="659" height="1090">
        </picture>
        <div class="split-body">
          <h2 class="display d-3">Ceremonial grade, whisked to order.</h2>
          <p class="small">Nothing pre-mixed, nothing from a bottle. Hot, iced, or
            dirty with a shot dropped through it.</p>
          <a class="head-link" href="#/item/matcha-latte">Order one →</a>
        </div>
      </div>
    </section>

    <section class="section wrap">
      <div class="head">
        <span class="label">Find us</span>
        <a class="head-link" href="${esc(BUSINESS.instagramUrl)}" target="_blank"
           rel="noopener">@${esc(BUSINESS.instagram)} →</a>
      </div>
      <a class="list-item" href="https://maps.google.com/?q=${BUSINESS.geo.lat},${BUSINESS.geo.lng}"
         target="_blank" rel="noopener">
        <span class="list-label">${esc(BUSINESS.address)}</span>
        <span class="list-value">${icon("map")}</span>
      </a>
      <div class="list-item">
        <span class="list-label">Today</span>
        <span class="list-value">${esc(today[0])} — ${esc(today[1])}</span>
      </div>
      <p class="tiny" style="margin-top:26px">${esc(BUSINESS.legal)} · ${esc(BUSINESS.tagline)}</p>
    </section>`;

  return {
    html,
    mount(view) {
      document.getElementById("shell").dataset.hero = "1";
      view.querySelectorAll("[data-item]").forEach((btn) =>
        btn.addEventListener("click", () => openItem(btn.dataset.item)));

      const room = view.querySelector("#room");
      const off = presence.subscribe(() => {
        if (!room.isConnected) { off(); return; }
        room.innerHTML = roomBlock();
      });
    },
  };
}
