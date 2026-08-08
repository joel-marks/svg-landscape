// scenepin.js — the stuck-state edge for the mobile sticky scene (Phase 13,
// CONTEXT.md sections 5 and 11).
//
// **This module is cosmetic and nothing depends on it.** The pin itself is
// `position: sticky` in style.css: no scroll listener, no scroll-position state,
// no header show/hide. All this adds is the hairline under the frame that says
// content is passing beneath it, and every other behaviour in the phase is
// correct with this file deleted, throwing, or running on a browser without
// IntersectionObserver — which is why every branch below simply returns.
//
// Why an observer on a sentinel rather than a scroll handler: `position: sticky`
// has no state a stylesheet can select on, so the only way to know the box is
// pinned is to watch something that is not. The sentinel is one pixel sitting at
// the figure's own first pixel (see index.html and the `#scene-pin-sentinel`
// rule), so it leaves the viewport at exactly the scroll position the figure
// starts sticking at — one intersection callback instead of a scroll listener
// measuring rects on every frame.
//
// It observes at every width. Above 1024px the class still toggles and means
// nothing, because the CSS that reads it lives inside the media query; adding a
// matchMedia branch here would be a second place for the breakpoint to be
// written down and a second place for it to drift.

export function initScenePin() {
  const sentinel = document.querySelector('#scene-pin-sentinel');
  const pin = document.querySelector('.scene-pin');

  if (!sentinel || !pin || typeof IntersectionObserver !== 'function') return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      pin.classList.toggle('is-stuck', !entry.isIntersecting);
    },
    // Against the viewport, which is the scroll container the figure pins to.
    { threshold: 0 },
  );

  observer.observe(sentinel);
}
