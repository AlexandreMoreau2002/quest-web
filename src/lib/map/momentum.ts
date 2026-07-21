export function isMapOverlayTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[data-map-overlay]') !== null;
}
