import { describe, expect, it } from 'vitest';

import { placeNode, type PlacedRect } from './placement';

describe('placeNode', () => {
  const parent: PlacedRect = { x: 0, y: 0, width: 272, height: 132 };

  it('places the first child at least MIN_RING_RADIUS away from the parent edge', () => {
    const position = placeNode({ parent, siblingIndex: 0, siblingCount: 1, existing: [] });
    const parentCenter = { x: parent.x + parent.width / 2, y: parent.y + parent.height / 2 };
    const distanceFromCenter = Math.hypot(position.x - parentCenter.x, position.y - parentCenter.y);
    const parentHalfDiagonal = Math.hypot(parent.width / 2, parent.height / 2);

    expect(distanceFromCenter).toBeGreaterThanOrEqual(parentHalfDiagonal + 180 - 1);
  });

  it('spreads multiple siblings across different angles', () => {
    const first = placeNode({ parent, siblingIndex: 0, siblingCount: 3, existing: [] });
    const second = placeNode({ parent, siblingIndex: 1, siblingCount: 3, existing: [] });
    const third = placeNode({ parent, siblingIndex: 2, siblingCount: 3, existing: [] });

    expect(first).not.toEqual(second);
    expect(second).not.toEqual(third);
    expect(first).not.toEqual(third);
  });

  it('nudges along the ring to avoid overlapping an existing card', () => {
    const existing: PlacedRect = { x: 300, y: 0, width: 224, height: 100 };
    const position = placeNode({ parent, siblingIndex: 0, siblingCount: 1, existing: [existing] });

    const overlaps = Math.abs(position.x - (existing.x + existing.width / 2)) < (224 + 224) / 2
      && Math.abs(position.y - (existing.y + existing.height / 2)) < (100 + 100) / 2;
    expect(overlaps).toBe(false);
  });
});
