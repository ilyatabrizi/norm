// Who is in the room right now.
//
// A check-in holds for an hour and then retires itself, so the list can never
// go stale in a way that embarrasses anybody. Storage is this device by
// default; set CHECKIN.endpoint in config.js and the same calls go to a shared
// room instead, with no change to any view.

import { CHECKIN, STORAGE } from "./config.js";
import { uid } from "./util.js";

const KEY = STORAGE + "room";
const ME = STORAGE + "meid";
const HOLD = CHECKIN.holdMinutes * 60000;

const listeners = new Set();
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach((fn) => fn(list()));

const channel = "BroadcastChannel" in self ? new BroadcastChannel("norm-room") : null;
if (channel) channel.onmessage = () => emit();
addEventListener("storage", (e) => { if (e.key === KEY) emit(); });

const readAll = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
};
const writeAll = (rows) => {
  try { localStorage.setItem(KEY, JSON.stringify(rows)); } catch {}
  channel?.postMessage("x");
  emit();
};

export function myId() {
  let id = null;
  try { id = localStorage.getItem(ME); } catch {}
  if (!id) { id = uid(); try { localStorage.setItem(ME, id); } catch {} }
  return id;
}

/** Everyone whose hour has not run out, newest arrival last. */
export function list() {
  const now = Date.now();
  return readAll().filter((p) => p.until > now).sort((a, b) => a.at - b.at);
}

export const me = () => list().find((p) => p.id === myId()) || null;
export const isIn = () => !!me();

export function checkIn({ name, mood }) {
  const now = Date.now();
  const rows = readAll().filter((p) => p.until > now && p.id !== myId());
  const entry = { id: myId(), name: name || "Guest", mood: mood || "", at: now,
                  until: now + HOLD };
  rows.push(entry);
  writeAll(rows);
  return entry;
}

export function extend() {
  const rows = readAll();
  const mine = rows.find((p) => p.id === myId());
  if (!mine) return null;
  mine.until = Date.now() + CHECKIN.extendMinutes * 60000;
  writeAll(rows);
  return mine;
}

export function checkOut() {
  writeAll(readAll().filter((p) => p.id !== myId()));
}

/* ------------------------------------------------------------------ demo */
// Regulars, so a single phone can still show what the room looks like at 18:40
// on a Thursday. CHECKIN.demo = false the moment a real endpoint is wired.
const NAMES = ["Elnaz", "Amir", "Sara", "Nima", "Ladan", "Kaveh", "Aylin",
               "Reza", "Mahsa", "Sina", "Roya", "Arman", "Niloofar", "Babak"];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function seed(count) {
  const now = Date.now();
  const taken = new Set(readAll().map((p) => p.name));
  const rows = readAll().filter((p) => p.until > now);
  for (let i = 0; i < count; i++) {
    const free = NAMES.filter((n) => !taken.has(n));
    if (!free.length) break;
    const who = pick(free);
    taken.add(who);
    // Arrived somewhere in the last 50 minutes, so the hours run out staggered.
    const at = now - Math.floor(Math.random() * 50) * 60000;
    rows.push({ id: "demo-" + uid(), name: who, mood: pick(CHECKIN.moods),
                at, until: at + HOLD, demo: true });
  }
  writeAll(rows);
}

export function startDemo() {
  if (!CHECKIN.demo) return;
  const live = list().filter((p) => p.demo).length;
  if (live < 3) seed(4 + Math.floor(Math.random() * 3));
  // The room breathes: roughly every 45s somebody arrives or leaves.
  setInterval(() => {
    const demos = list().filter((p) => p.demo);
    if (Math.random() < 0.5 && demos.length > 2) {
      writeAll(readAll().filter((p) => p.id !== pick(demos).id));
    } else if (demos.length < 9) {
      seed(1);
    } else {
      emit();                       // still tick, so "since" labels stay honest
    }
  }, 45000);
}

// Retire anyone whose hour is up, on the minute, whether or not a view asked.
setInterval(() => {
  const now = Date.now();
  const rows = readAll();
  if (rows.some((p) => p.until <= now)) writeAll(rows.filter((p) => p.until > now));
}, 20000);
