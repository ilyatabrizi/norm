// Motion helpers. Everything here checks the reduced-motion preference first —
// the app should still work for someone who has switched animation off.

export const reduced = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A short tap on the phone's haptic engine, where the browser allows it. */
export function haptic(pattern = 12) {
  try { navigator.vibrate?.(pattern); } catch {}
}

/** Tween a number over time with an easing curve; returns a cancel function. */
export function tween(from, to, ms, onFrame, ease = (t) => 1 - Math.pow(1 - t, 3)) {
  if (reduced()) { onFrame(to, 1); return () => {}; }
  const start = performance.now();
  let raf = 0, live = true;
  const step = (now) => {
    if (!live) return;
    const t = Math.min(1, (now - start) / ms);
    onFrame(from + (to - from) * ease(t), t);
    if (t < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => { live = false; cancelAnimationFrame(raf); };
}
