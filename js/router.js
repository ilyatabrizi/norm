// Hash routing. Four tabs plus the pages they open, each a function that
// returns HTML and an optional mount step for the wiring.

import { $ } from "./util.js";

const routes = [];
let current = null;

export const route = (pattern, view) => routes.push({ pattern, view });

const match = (hash) => {
  const path = (hash.replace(/^#/, "") || "/").split("?")[0];
  for (const r of routes) {
    if (r.pattern === path) return { view: r.view, params: {} };
    if (r.pattern.includes(":")) {
      const p = r.pattern.split("/"), q = path.split("/");
      if (p.length !== q.length) continue;
      const params = {};
      const ok = p.every((seg, i) =>
        seg.startsWith(":") ? (params[seg.slice(1)] = decodeURIComponent(q[i])) : seg === q[i]);
      if (ok) return { view: r.view, params };
    }
  }
  return null;
};

const scrollMemory = new Map();

export async function render() {
  const view = $("#view");
  const hit = match(location.hash) || match("#/");
  // Views hang clocks and listeners off their mount; this is where they get
  // the chance to take them down, while their nodes are still on the page.
  if (current) document.dispatchEvent(new CustomEvent("view:leaving"));
  if (current) scrollMemory.set(current, scrollY);
  current = (location.hash || "#/").split("?")[0];
  const out = await hit.view(hit.params);
  view.innerHTML = typeof out === "string" ? out : out.html;
  view.classList.remove("view-in");
  void view.offsetWidth;                     // restart the entrance animation
  view.classList.add("view-in");
  if (typeof out === "object" && out.mount) out.mount(view);

  const y = scrollMemory.get(current);
  scrollTo({ top: history.state?.restore && y ? y : 0, behavior: "instant" });
  document.dispatchEvent(new CustomEvent("view:rendered", { detail: { path: current } }));
}

export function startRouter() {
  addEventListener("hashchange", render);
  if (!location.hash) location.replace("#/");
  render();
}

export const go = (hash) => { location.hash = hash; };
export const path = () => current;
