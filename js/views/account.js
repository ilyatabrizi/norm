// Account — which here means this device. A name if you want one, the orders
// you have sent, the shop's own details, and a way to wipe all of it.
// No sign-up, no points, nothing leaves the phone.

import { BUSINESS } from "../config.js";
import { MARK } from "../brand.js";
import { esc, price, hm, initials, DAYS, openState } from "../util.js";
import { icon } from "../icons.js";
import { sheet, closeSheet, toast } from "../ui.js";
import { haptic } from "../motion.js";
import { profile, setProfile, orders, forgetEverything } from "../store.js";
import * as presence from "../presence.js";
import { isStandalone, isIOS, canPrompt, promptInstall } from "../install.js";
import { render } from "../router.js";

function editSheet() {
  const me = profile();
  sheet(() => `
    <div class="sheet-head">
      <h2 class="display d-2">Your details</h2>
      <p class="lede">Both stay on this phone. There is no account to make.</p>
    </div>
    <div class="stack">
      <div class="field">
        <label for="ed-name">Name</label>
        <input id="ed-name" type="text" maxlength="18" autocomplete="given-name"
               placeholder="What the room calls you" value="${esc(me.name)}">
      </div>
      <div class="field">
        <label for="ed-phone">Phone · optional</label>
        <input id="ed-phone" type="tel" maxlength="15" autocomplete="tel" dir="ltr"
               placeholder="Only if the bar needs to call" value="${esc(me.phone)}">
      </div>
    </div>
    <div class="sheet-actions">
      <button class="btn btn-green" type="button" id="ed-save">Save</button>
      <button class="btn btn-quiet" type="button" data-close>Cancel</button>
    </div>`, {
    label: "Your details",
    mount(el) {
      const name = el.querySelector("#ed-name");
      setTimeout(() => name.focus(), 320);
      const save = () => {
        setProfile({ name: name.value.trim(), phone: el.querySelector("#ed-phone").value.trim() });
        closeSheet();
        render();
        toast("Saved on this phone");
      };
      el.querySelector("#ed-save").addEventListener("click", save);
      el.addEventListener("keydown", (e) => { if (e.key === "Enter") save(); });
    },
  });
}

export default function account() {
  const me = profile();
  const list = orders();
  const state = openState();
  const today = new Date().getDay();

  const installRow = isStandalone()
    ? `<div class="list-item">
         <span class="ico">${icon("check")}</span>
         <span class="list-body">
           <span class="list-label">Installed</span>
           <span class="list-note">NORM is on this phone's home screen</span>
         </span>
       </div>`
    : `<button class="list-item" type="button" id="install">
         <span class="ico">${icon("install")}</span>
         <span class="list-body">
           <span class="list-label">Add NORM to your home screen</span>
           <span class="list-note">${isIOS() ? "In Safari: Share → Add to Home Screen"
             : "Opens like an app, works offline"}</span>
         </span>
         <span class="list-value">${icon("chevron")}</span>
       </button>`;

  const html = `
    <section class="wrap">
      <h1 class="title">Account</h1>
    </section>

    <section class="section wrap">
      <div class="card list-item" style="padding:18px 20px">
        <span class="avatar" style="width:52px;height:52px;font-size:17px">
          ${me.name ? esc(initials(me.name)) : icon("account")}</span>
        <span class="list-body">
          <span class="list-label" style="font-size:18px">
            ${me.name ? esc(me.name) : "Add your name"}</span>
          <span class="list-note">${me.phone ? esc(me.phone)
            : presence.isIn() ? "Checked in right now" : "So the room knows who you are"}</span>
        </span>
        <button class="add-btn" type="button" id="edit" aria-label="Edit your details"
          style="width:38px;height:38px">${icon("edit")}</button>
      </div>
    </section>

    <section class="section wrap">
      <div class="card">${installRow}
        <button class="list-item" type="button" id="share">
          <span class="ico ico-plain">${icon("share")}</span>
          <span class="list-body"><span class="list-label">Share NORM</span>
            <span class="list-note">Send the link to a friend</span></span>
          <span class="list-value">${icon("chevron")}</span>
        </button>
      </div>
    </section>

    <section class="section wrap">
      <div class="head">
        <span class="label">Your orders</span>
        <span class="tiny">${list.length ? `Last ${list.length}` : "None yet"}</span>
      </div>
      <div class="card">
        ${list.length ? list.map((o) => `
          <a class="list-item" href="#/order/${o.id}">
            <span class="ico ico-plain">${icon("receipt")}</span>
            <span class="list-body">
              <span class="list-label">${esc(o.code)} · ${o.lines.reduce((n, l) => n + l.qty, 0)}
                item${o.lines.reduce((n, l) => n + l.qty, 0) > 1 ? "s" : ""}</span>
              <span class="list-note">Today at ${esc(hm(new Date(o.at)))} ·
                ${esc(price(o.total))}</span>
            </span>
            <span class="list-value">${icon("chevron")}</span>
          </a>`).join("")
        : `<div class="list-item"><span class="ico ico-plain">${icon("receipt")}</span>
             <span class="list-body"><span class="list-label">No orders yet</span>
               <span class="list-note">Anything you send from the bag shows up here</span></span>
           </div>`}
      </div>
    </section>

    <section class="section wrap">
      <div class="head">
        <span class="label">The place</span>
        <span class="tiny">${state.open ? `Open until ${esc(state.closes)}`
          : `Opens ${esc(state.opens)}`}</span>
      </div>
      <div class="card">
        <a class="list-item" target="_blank" rel="noopener"
           href="https://maps.google.com/?q=${BUSINESS.geo.lat},${BUSINESS.geo.lng}">
          <span class="ico">${icon("map")}</span>
          <span class="list-body"><span class="list-label">${esc(BUSINESS.district)},
            ${esc(BUSINESS.city)}</span>
            <span class="list-note">${esc(BUSINESS.address)}</span></span>
          <span class="list-value">${icon("chevron")}</span>
        </a>
        <a class="list-item" href="${esc(BUSINESS.instagramUrl)}" target="_blank" rel="noopener">
          <span class="ico">${icon("instagram")}</span>
          <span class="list-body"><span class="list-label">@${esc(BUSINESS.instagram)}</span>
            <span class="list-note">What is on the board this week</span></span>
          <span class="list-value">${icon("chevron")}</span>
        </a>
        ${BUSINESS.phone ? `<a class="list-item" href="tel:${esc(BUSINESS.phone)}">
          <span class="ico">${icon("phone")}</span>
          <span class="list-body"><span class="list-label">${esc(BUSINESS.phone)}</span>
            <span class="list-note">Call the bar</span></span>
          <span class="list-value">${icon("chevron")}</span></a>` : ""}
      </div>
    </section>

    <section class="section wrap">
      <div class="head"><span class="label">Hours</span></div>
      <div class="card" style="padding:14px 0">
        ${DAYS.map((d, i) => {
          const h = BUSINESS.hours[i];
          return `<div class="hours-row${i === today ? " today" : ""}">
            <span>${esc(d)}</span><span>${h ? `${esc(h[0])} — ${esc(h[1])}` : "Closed"}</span>
          </div>`;
        }).join("")}
      </div>
    </section>

    <section class="section wrap" style="padding-bottom:10px">
      <div class="card">
        <button class="list-item" type="button" id="wipe">
          <span class="ico ico-plain">${icon("trash")}</span>
          <span class="list-body">
            <span class="list-label" id="wipe-label">Clear everything on this phone</span>
            <span class="list-note">Bag, name, orders and check-in</span>
          </span>
        </button>
      </div>
      <div style="display:grid;justify-items:center;gap:12px;padding:40px 0 6px">
        <span style="width:52px;color:var(--line)">${MARK}</span>
        <span class="tiny">${esc(BUSINESS.legal)} · v1.0</span>
      </div>
    </section>`;

  return {
    html,
    mount(view) {
      view.querySelector("#edit").addEventListener("click", () => { haptic(8); editSheet(); });
      view.querySelector(".card.list-item").addEventListener("click", (e) => {
        if (!e.target.closest("#edit")) editSheet();
      });

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

      const wipe = view.querySelector("#wipe");
      const label = view.querySelector("#wipe-label");
      wipe.addEventListener("click", () => {
        if (wipe.dataset.armed !== "1") {
          wipe.dataset.armed = "1";
          label.textContent = "Tap again to clear it all";
          label.style.color = "var(--green-ink)";
          setTimeout(() => {
            if (!wipe.isConnected) return;
            wipe.dataset.armed = "0";
            label.textContent = "Clear everything on this phone";
            label.style.removeProperty("color");
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
