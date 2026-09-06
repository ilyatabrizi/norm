// State that outlives a page load: the bag, the name on this device, and the
// orders already sent. All of it stays in this browser — there is no account
// server, no profile, nothing collected. See README → Data.

import { STORAGE } from "./config.js";
import { uid } from "./util.js";
import { byId } from "./data.js";

const KEY = {
  bag: STORAGE + "bag",
  profile: STORAGE + "profile",
  orders: STORAGE + "orders",
};

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : structuredClone(fallback);
  } catch { return structuredClone(fallback); }
};
const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
};

const state = {
  bag: read(KEY.bag, []),
  profile: read(KEY.profile, { name: "", phone: "" }),
  orders: read(KEY.orders, []),
};

const listeners = new Set();
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach((fn) => fn(state));

/* -------------------------------------------------------------------- bag */
export const bag = () => state.bag;
export const bagCount = () => state.bag.reduce((n, l) => n + l.qty, 0);
export const bagTotal = () => state.bag.reduce((n, l) => n + l.unit * l.qty, 0);

/** Same item with the same options stacks instead of adding a second line. */
export function addLine({ itemId, name, unit, qty = 1, options = {} }) {
  const sig = itemId + "|" + JSON.stringify(options);
  const found = state.bag.find((l) => l.sig === sig);
  if (found) found.qty = Math.min(99, found.qty + qty);
  else state.bag.push({ id: uid(), sig, itemId, name, unit, qty, options });
  write(KEY.bag, state.bag); emit();
}

/** What one of this drink costs with these choices on it. */
export function unitPrice(itemId, options = {}) {
  const item = byId(itemId);
  if (!item) return 0;
  return (item.options || []).reduce((sum, g) => {
    const choice = g.choices.find((c) => c.id === options[g.id]);
    return sum + (choice ? choice.add : 0);
  }, item.price);
}

/** The choices a drink comes with when nobody has touched them. */
export const defaultOptions = (itemId) =>
  Object.fromEntries((byId(itemId)?.options || []).map((g) => [g.id, g.default]));

/**
 * Change one choice on a line already in the bag. Options moved here from the
 * sheet that used to stand between the card and the bag: adding is one tap, and
 * this is where you were going to look at the order anyway.
 * If the change makes the line identical to another, the two fold together.
 */
export function setOptions(lineId, groupId, choiceId) {
  const line = state.bag.find((l) => l.id === lineId);
  if (!line) return;
  const options = { ...line.options, [groupId]: choiceId };
  const sig = line.itemId + "|" + JSON.stringify(options);
  const twin = state.bag.find((l) => l.sig === sig && l.id !== lineId);
  if (twin) {
    twin.qty = Math.min(99, twin.qty + line.qty);
    state.bag = state.bag.filter((l) => l.id !== lineId);
  } else {
    line.options = options;
    line.sig = sig;
    line.unit = unitPrice(line.itemId, options);
  }
  write(KEY.bag, state.bag); emit();
}

export function setQty(lineId, qty) {
  const line = state.bag.find((l) => l.id === lineId);
  if (!line) return;
  if (qty <= 0) state.bag = state.bag.filter((l) => l.id !== lineId);
  else line.qty = qty;
  write(KEY.bag, state.bag); emit();
}

export function clearBag() { state.bag = []; write(KEY.bag, state.bag); emit(); }

/* ---------------------------------------------------------------- profile */
export const profile = () => state.profile;
export function setProfile(patch) {
  state.profile = { ...state.profile, ...patch };
  write(KEY.profile, state.profile); emit();
}

/* ----------------------------------------------------------------- orders */
export const orders = () => state.orders;
export const orderById = (id) => state.orders.find((o) => o.id === id);

/** Four digits the cashier can read back. Unique among the live orders. */
function orderCode() {
  const taken = new Set(state.orders.map((o) => o.code));
  let code;
  do { code = String(Math.floor(1000 + Math.random() * 9000)); } while (taken.has(code));
  return code;
}

export function placeOrder({ lines, where, table, slot, note, total }) {
  const order = {
    id: uid(), code: orderCode(), at: Date.now(),
    lines, where, table, slot, note, total, status: "sent",
  };
  state.orders.unshift(order);
  state.orders = state.orders.slice(0, 20);
  write(KEY.orders, state.orders);
  clearBag();               // clearBag emits for both
  return order;
}

export function forgetEverything() {
  Object.values(KEY).forEach((k) => { try { localStorage.removeItem(k); } catch {} });
  state.bag = []; state.profile = { name: "", phone: "" }; state.orders = [];
  emit();
}
