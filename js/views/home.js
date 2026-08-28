// Home. The name, whether the door is open, who is inside, a few things worth
// ordering, and where to find it.

import { BUSINESS } from "../config.js";
import { ITEMS } from "../data.js";
import { MARK, WORDMARK } from "../brand.js";
import { esc, price, openState } from "../util.js";
import { icon } from "../icons.js";
import * as presence from "../presence.js";
import { openItem } from "./item.js";

const SIGNATURE = ["matcha-latte", "flat-white", "cold-brew", "basque"];

function roomCard() {
  const people = presence.list();
  const mine = presence.isIn();
  const n = people.length;
  const named = people.map((p) => p.name).filter(Boolean);
  const who = mine
    ? "You are checked in"
    : named.length ? `${named.slice(-3).join(", ")}${named.length > 3 ? " and others" : ""}`
                   : "Tap to check in when you arrive";
  return `
    <a class="card room-card" href="#/checkin">
      <span class="room-n">${n || "—"}</span>
      <span class="room-copy">
        <span class="room-line">${n
          ? `<span class="dot" style="display:inline-block;margin-right:8px"></span>${n} ${
              n === 1 ? "person is" : "people are"} here now`
          : "Nobody is here yet"}</span>
        <span class="room-who">${esc(who)}</span>
      </span>
      <span class="room-go">${icon("chevron")}</span>
    </a>`;
}

export default function home() {
  const state = openState();
  const today = BUSINESS.hours[new Date().getDay()];

  const cardRows = SIGNATURE.map((id) => ITEMS.find((i) => i.id === id))
    .filter(Boolean).map((item) => `
      <div class="row">
        <span class="row-body">
          <span class="row-name">${esc(item.name)}</span>
          <span class="row-desc">${esc(item.desc)}</span>
        </span>
        <span class="row-side">
          <span class="row-price money">${price(item.price)}</span>
          <button class="add-btn" type="button" data-item="${item.id}"
            aria-label="Add ${esc(item.name)}">${icon("plus")}</button>
        </span>
      </div>`).join("");

  const html = `
    <section class="wrap hero">
      <div class="hero-mark">${MARK}</div>
      <div class="hero-word">${WORDMARK}</div>
      <p class="hero-place">${esc(BUSINESS.city)} · ${esc(BUSINESS.district)}</p>
      <p class="hero-status">
        <span class="pill-status">
          <span class="dot${state.open ? "" : " off"}"></span>
          ${state.open ? `Open until ${esc(state.closes)}` : `Opens at ${esc(state.opens)}`}
        </span>
      </p>
    </section>

    <section class="section wrap" id="room">${roomCard()}</section>

    <section class="section wrap">
      <div class="head">
        <span class="label">The card</span>
        <a class="head-link" href="#/menu">See all</a>
      </div>
      <div class="card"><div class="rows">${cardRows}</div></div>
    </section>

    <section class="section wrap">
      <figure class="card feature">
        <picture>
          <source srcset="assets/photos/street.webp" type="image/webp">
          <img src="assets/photos/street.jpg" alt="A NORM cup on the street outside"
               loading="lazy" width="1179" height="537">
        </picture>
        <figcaption class="feature-body">
          <span class="display d-3">Takeaway, any hour.</span>
          <span class="small">Every drink on the card travels. Order ahead and
            pick it up at the counter.</span>
        </figcaption>
      </figure>
    </section>

    <section class="section wrap">
      <div class="card split">
        <div class="split-body">
          <h2 class="display d-3">Ceremonial matcha, whisked to order.</h2>
          <p class="small">Nothing pre-mixed, nothing from a bottle.</p>
          <a class="head-link" href="#/item/matcha-latte">Order one</a>
        </div>
        <picture>
          <source srcset="assets/photos/portrait.webp" type="image/webp">
          <img src="assets/photos/portrait.jpg" alt="Iced matcha at the window"
               loading="lazy" width="659" height="1090">
        </picture>
      </div>
    </section>

    <section class="section wrap" style="padding-bottom:6px">
      <div class="head">
        <span class="label">Find us</span>
        <a class="head-link" href="${esc(BUSINESS.instagramUrl)}" target="_blank"
           rel="noopener">@${esc(BUSINESS.instagram)}</a>
      </div>
      <div class="card">
        <a class="list-item" href="https://maps.google.com/?q=${BUSINESS.geo.lat},${BUSINESS.geo.lng}"
           target="_blank" rel="noopener">
          <span class="ico">${icon("map")}</span>
          <span class="list-body">
            <span class="list-label">${esc(BUSINESS.district)}, ${esc(BUSINESS.city)}</span>
            <span class="list-note">${esc(BUSINESS.address)}</span>
          </span>
          <span class="list-value">${icon("chevron")}</span>
        </a>
        <div class="list-item">
          <span class="ico ico-plain">${icon("clock")}</span>
          <span class="list-body">
            <span class="list-label">Today</span>
            <span class="list-note">${state.open ? "Open now" : "Closed now"}</span>
          </span>
          <span class="list-value">${esc(today[0])} — ${esc(today[1])}</span>
        </div>
      </div>
      <p class="tiny" style="margin-top:18px;text-align:center">
        ${esc(BUSINESS.legal)} · ${esc(BUSINESS.tagline)}</p>
    </section>`;

  return {
    html,
    mount(view) {
      view.querySelectorAll("[data-item]").forEach((btn) =>
        btn.addEventListener("click", () => openItem(btn.dataset.item)));

      const room = view.querySelector("#room");
      const off = presence.subscribe(() => {
        if (!room.isConnected) { off(); return; }
        room.innerHTML = roomCard();
      });
    },
  };
}
