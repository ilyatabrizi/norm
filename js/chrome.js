// The tab bar, pinned to what you can actually see.
//
// `position: fixed` is fixed to the *layout* viewport, which on a phone is not
// the part of the screen you are looking at. Two things move it and both looked
// like bugs:
//
//   1. Safari's own toolbar grows back whenever a page stops being scrollable.
//      Walking from a long screen to a short one — the card to an almost-empty
//      bag — changed the visible height underneath a bar that had not moved, so
//      the bar appeared to jump up the screen.
//   2. The keyboard. Tapping the note field in the bag put the tab bar on top of
//      the keyboard, over the thing being typed.
//
// visualViewport reports the part that is actually visible. The bar is offset by
// the difference, so it sits on the real bottom edge in both cases — and when
// the gap is keyboard-sized it gets out of the way entirely, which is what an
// iOS app does.

const KEYBOARD = 140;   // px of lost height that can only be a keyboard

export function pinChrome() {
  const vv = window.visualViewport;
  const root = document.documentElement;
  if (!vv) { root.style.setProperty("--vv-bottom", "0px"); return; }

  let raf = 0;
  const sync = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      // How much of the layout viewport is hidden below the visible area.
      const hidden = Math.max(0, innerHeight - vv.height - vv.offsetTop);
      const typing = hidden > KEYBOARD;
      root.style.setProperty("--vv-bottom", `${typing ? 0 : Math.round(hidden)}px`);
      root.dataset.typing = typing ? "1" : "0";
    });
  };

  vv.addEventListener("resize", sync);
  vv.addEventListener("scroll", sync);
  addEventListener("orientationchange", sync);
  sync();
}
