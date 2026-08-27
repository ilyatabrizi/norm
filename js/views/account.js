// Account — which here means this device. A name for the room, the orders you
// have already sent, the shop's own details, and a way to wipe all of it.
// There is no sign-up, no points, and nothing leaves the phone.

import { BUSINESS } from "../config.js";
import { MARK } from "../brand.js";
import { esc, hm, DAYS, openState } from "../util.js";
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
    ? `<div class="list-item"><span class="list-label">Installed</span>
         <span class="list-value">On this phone ${icon("check")}</span></div>`
    : `<button class="list-item" type="button" id="install">
         <span class="list-label">Add NORM to your home screen</span>
         <span class="list-value">${icon("install")}</span></button>`;

  const html = `
    <section class="section wrap" style="padding-top:8px">
      <div class="head"><span class="eyebrow">You</span>
        <span class="tiny">${presence.isIn() ? "In the room" : "Not checked in"}</span></div>
      <div class="field">
        <label for="ac-name">Name for the room</label>
        <input id="ac-name" type="text" maxlength="18" autocomplete="given-name"
               placeholder="Your first name" value="${esc(me.name)}">
      </div>
      <div class="field">
        <label for="ac-phone">Phone · optional</label>
        <input id="ac-phone" type="tel" maxlength="15" autocomplete="tel"
               placeholder="Optional" value="${esc(me.phone)}" dir="ltr">
      </div>
      <p class="tiny" style="margin-top:12px">The name is what the room sees when you
        check in. The number is only used if the bar needs to call about an order.
        Both stay on this phone — nothing is uploaded, and there is no account to make.</p>
    </section>

    <section class="section wrap">
      <div class="head"><span class="eyebrow">Your orders</span>
        <span class="tiny">${list.length ? `Last ${list.length}` : "None yet"}</span></div>
      ${list.length ? `<div class="list">${list.map((o) => `
        <a class="list-item" href="#/order/${o.id}">
          <span class="list-label">${esc(o.lines.map((l) => `${l.qty}× ${l.name}`)
            .join(", ").slice(0, 46))}</span>
          <span class="list-value num">${esc(hm(new Date(o.at)))} · ${esc(o.code)}</span>
        </a>`).join("")}</div>`
      : `<p class="small" style="padding:18px 0">Anything you send from the bag
           shows up here with its code.</p>`}
    </section>

    <section class="section wrap">
      <div class="head"><span class="eyebrow">The place</span>
        <span class="tiny">${state.open ? `Open until ${esc(state.closes)}`
          : `Opens ${esc(state.opens)}`}</span></div>
      <div class="list">
        <a class="list-item" target="_blank" rel="noopener"
           href="https://maps.google.com/?q=${BUSINESS.geo.lat},${BUSINESS.geo.lng}">
          <span class="list-label">${esc(BUSINESS.address)}</span>
          <span class="list-value">${icon("map")}</span></a>
        <a class="list-item" href="${esc(BUSINESS.instagramUrl)}" target="_blank" rel="noopener">
          <span class="list-label">@${esc(BUSINESS.instagram)}</span>
          <span class="list-value">${icon("instagram")}</span></a>
        ${BUSINESS.phone ? `<a class="list-item" href="tel:${esc(BUSINESS.phone)}">
          <span class="list-label">${esc(BUSINESS.phone)}</span>
          <span class="list-value">${icon("phone")}</span></a>` : ""}
      </div>
      <div style="margin-top:20px">
        ${DAYS.map((d, i) => {
          const h = BUSINESS.hours[i];
          return `<div class="hours-row${i === today ? " today" : ""}">
            <span class="day">${esc(d)}</span>
            <span>${h ? `${esc(h[0])} — ${esc(h[1])}` : "Closed"}</span></div>`;
        }).join("")}
      </div>
    </section>

    <section class="section wrap">
      <div class="head"><span class="eyebrow">This app</span>
        <span class="tiny">v1.0</span></div>
      <div class="list">
        ${installRow}
        <button class="list-item" type="button" id="share">
          <span class="list-label">Share NORM</span>
          <span class="list-value">${icon("share")}</span></button>
        <button class="list-item" type="button" id="wipe">
          <span class="list-label" style="color:var(--mute)">Clear everything on this phone</span>
          <span class="list-value">${icon("trash")}</span></button>
      </div>
      <div style="display:grid;justify-items:center;gap:14px;padding:44px 0 10px">
        <span style="width:54px;color:var(--ink-2)">${MARK}</span>
        <span class="tiny">${esc(BUSINESS.legal)} · ${esc(BUSINESS.city)}</span>
      </div>
    </section>`;

  return {
    html,
    mount(view) {
      const name = view.querySelector("#ac-name");
      const phone = view.querySelector("#ac-phone");
      const save = () => setProfile({ name: name.value.trim(), phone: phone.value.trim() });
      name.addEventListener("change", save);
      phone.addEventListener("change", save);
      name.addEventListener("blur", save);
      phone.addEventListener("blur", save);

      view.querySelector("#install")?.addEventListener("click", async () => {
        haptic(8);
        if (canPrompt()) {
          const outcome = await promptInstall();
          if (outcome === "accepted") toast("NORM is on your home screen");
          return;
        }
        toast(isIOS() ? "Tap Share, then Add to Home Screen"
                      : "Use your browser menu → Install app");
      });

      view.querySelector("#share").addEventListener("click", async () => {
        haptic(8);
        const url = location.href.split("#")[0];
        try {
          if (navigator.share) await navigator.share({ title: "NORM Unity", url });
          else { await navigator.clipboard.writeText(url); toast("Link copied"); }
        } catch { /* the sheet was dismissed */ }
      });

      view.querySelector("#wipe").addEventListener("click", () => {
        const btn = view.querySelector("#wipe");
        if (btn.dataset.armed !== "1") {
          btn.dataset.armed = "1";
          btn.querySelector(".list-label").textContent = "Tap again to clear it all";
          btn.querySelector(".list-label").style.color = "var(--green-text)";
          setTimeout(() => {
            if (!btn.isConnected) return;
            btn.dataset.armed = "0";
            btn.querySelector(".list-label").textContent = "Clear everything on this phone";
            btn.querySelector(".list-label").style.color = "var(--mute)";
          }, 4000);
          return;
        }
        haptic([10, 30, 10]);
        presence.checkOut();
        forgetEverything();
        toast("Cleared. Nothing kept.");
        location.hash = "#/";
      });
    },
  };
}
