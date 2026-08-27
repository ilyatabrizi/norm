// Small shared helpers. No framework, no dependencies.

import { BUSINESS } from "./config.js";

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Escape anything that came from a person before it goes near innerHTML. */
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g,
  (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const pad2 = (n) => String(n).padStart(2, "0");

/** 118000 → "118,000" — grouped, never rounded, always Latin digits. */
export const money = (n) => Math.round(n).toLocaleString("en-US");
export const price = (n) => `${money(n)} ${BUSINESS.currency}`;

export const uid = () =>
  Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

export const initials = (name) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "··";
  return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
};

export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/* ------------------------------------------------------------------ clock */
export const hm = (d = new Date()) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

const minutesOf = (str) => {
  const [h, m] = String(str).split(":").map(Number);
  return h * 60 + (m || 0);
};

/** Today's hours, and whether the door is open right now. "24:00" means midnight. */
export function openState(now = new Date()) {
  const today = BUSINESS.hours[now.getDay()];
  if (!today) return { open: false, opens: null, closes: null };
  const [openStr, closeStr] = today;
  const mins = now.getHours() * 60 + now.getMinutes();
  const open = mins >= minutesOf(openStr) && mins < minutesOf(closeStr);
  return {
    open,
    opens: openStr,
    closes: closeStr === "24:00" ? "00:00" : closeStr,
    minutesToClose: minutesOf(closeStr) - mins,
  };
}

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday",
                     "Friday", "Saturday"];

/** mm:ss left on a deadline, floored at zero. */
export function countdown(until, now = Date.now()) {
  const s = Math.max(0, Math.round((until - now) / 1000));
  return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
}

/* ------------------------------------------------------------------- misc */
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Next N pickup slots, rounded up to the step, starting after the lead time. */
export function slots(step, count, lead, now = new Date()) {
  const start = new Date(now.getTime() + lead * 60000);
  start.setMinutes(Math.ceil(start.getMinutes() / step) * step, 0, 0);
  return Array.from({ length: count }, (_, i) =>
    hm(new Date(start.getTime() + i * step * 60000)));
}
