/**
 * Layout rules for the ServeGo24 assistant panel.
 *
 * Kept as plain JS (no JSX) so the decision can be exercised directly, without a
 * browser, and so ChatWidget.jsx stays about behaviour rather than box maths.
 *
 * The rule is simple and deliberate: on a phone or tablet the assistant is a
 * FULL-SCREEN sheet, on a desktop it is a floating bubble. A floating panel cannot
 * survive the on-screen keyboard — the keyboard takes the lower half of the screen
 * and the composer is either covered or pushed off. Full screen removes the
 * floating-position problem entirely; `panelStyle` then pins the sheet to the
 * *visual* viewport so it resizes to exactly the area above the keyboard.
 */

/**
 * The floating layout requires a real desktop pointer, not just width: a phone held
 * in landscape is 800-900px wide and would otherwise flip back to a popup that the
 * keyboard then covers. `pointer: fine` matches the PRIMARY pointing device, so it
 * is false on every phone/tablet — including a touchscreen laptop in use with a
 * mouse, which correctly keeps the desktop bubble.
 */
export const DESKTOP_QUERY = '(min-width: 768px) and (pointer: fine)';

/** True when the current viewport should get the floating desktop bubble. */
export function isDesktopViewport(matchMedia) {
  return typeof matchMedia === 'function' && matchMedia(DESKTOP_QUERY).matches;
}

/**
 * Mobile: `inset-0` + full height — a real full-screen sheet, no rounded corners,
 * no floating offset, so nothing can push it up off the visible area.
 */
const FULL_SCREEN_CLASS =
  'fixed inset-0 z-50 h-[100dvh] flex flex-col overflow-hidden bg-white animate-overlay-in text-left';

/**
 * Desktop: only rendered once the desktop query already matches, so it needs no
 * `md:` gate. `animate-fade-in` is safe here because the desktop branch never
 * receives the keyboard-driven inline transform.
 */
const FLOATING_CLASS =
  'fixed z-50 right-6 bottom-6 w-[23rem] h-[min(34rem,calc(100dvh-8rem))] flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl animate-fade-in text-left';

/** The panel's class list for the current layout. */
export function panelClassName(isDesktop) {
  return isDesktop ? FLOATING_CLASS : FULL_SCREEN_CLASS;
}

/**
 * Pin the mobile sheet to the VISUAL viewport.
 *
 * `position: fixed` resolves against the LAYOUT viewport, which does not shrink when
 * the keyboard opens — so `inset-0` / `bottom: 0` / `100dvh` all keep describing the
 * full screen and the composer ends up underneath the keyboard. Sizing to
 * `visualViewport.height` and offsetting by `offsetTop` keeps the header, transcript
 * and composer all inside the area the user can actually see. Returns undefined on
 * desktop (where there is no keyboard) or where the API is unavailable, so the
 * static `h-[100dvh]` remains as the fallback.
 */
export function panelStyle(isDesktop, viewport) {
  if (isDesktop || !viewport) return undefined;
  return {
    height: `${viewport.height}px`,
    transform: `translateY(${viewport.offsetTop}px)`
  };
}
