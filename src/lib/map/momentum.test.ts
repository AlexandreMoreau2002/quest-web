import { describe, expect, it } from 'vitest';

import { isMapOverlayTarget } from './momentum';

describe('isMapOverlayTarget', () => {
  it('prevents a drag which begins inside a map overlay from launching momentum', () => {
    const panel = document.createElement('aside');
    panel.dataset.mapOverlay = '';
    const input = document.createElement('input');
    panel.append(input);

    expect(isMapOverlayTarget(input)).toBe(true);
    expect(isMapOverlayTarget(document.createElement('div'))).toBe(false);
  });
});
