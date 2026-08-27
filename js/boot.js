// The opening. The mark's eyes open, the pupils dilate, the dot drops, the
// word arrives, and then the whole thing steps aside. Roughly two seconds on a
// cold start, half that on a warm one — long enough to be a piece of the brand,
// short enough that nobody waits for it.

import { STORAGE } from "./config.js";
import { reduced } from "./motion.js";

const SEEN = STORAGE + "booted";

export function runBoot() {
  const boot = document.getElementById("boot");
  if (!boot) return Promise.resolve();

  const warm = sessionStorage.getItem(SEEN) === "1";
  try { sessionStorage.setItem(SEEN, "1"); } catch {}

  if (reduced()) {
    boot.hidden = true;
    document.documentElement.dataset.booted = "1";
    return Promise.resolve();
  }

  const hold = warm ? 900 : 2150;
  // The word and the rule come in once the eyes are open, not with them.
  setTimeout(() => boot.classList.add("lit"), warm ? 260 : 900);
  // One slow blink before it goes — the tell that the room is awake.
  if (!warm) setTimeout(() => boot.classList.add("blink"), 1620);

  return new Promise((resolve) => {
    setTimeout(() => {
      boot.classList.add("gone");
      document.documentElement.dataset.booted = "1";
      setTimeout(() => { boot.hidden = true; resolve(); }, 520);
    }, hold);
  });
}
