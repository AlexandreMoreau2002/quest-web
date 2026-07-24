import { describe, expect, it } from 'vitest';

import { intersectRectangle } from './edge-geometry';

describe('intersectRectangle', () => {
  it('returns the point on the right edge when the target is directly to the right', () => {
    const rect = { x: 0, y: 0, width: 100, height: 50 };
    const target = { x: 500, y: 25 };
    const point = intersectRectangle(rect, target);
    expect(point.x).toBeCloseTo(100);
    expect(point.y).toBeCloseTo(25);
  });

  it('returns the point on the bottom edge when the target is directly below', () => {
    const rect = { x: 0, y: 0, width: 100, height: 50 };
    const target = { x: 50, y: 500 };
    const point = intersectRectangle(rect, target);
    expect(point.x).toBeCloseTo(50);
    expect(point.y).toBeCloseTo(50);
  });

  it('returns the point on the correct corner-adjacent edge for a diagonal target', () => {
    const rect = { x: 0, y: 0, width: 100, height: 50 };
    const target = { x: 200, y: 125 };
    const point = intersectRectangle(rect, target);
    expect(point.y).toBeCloseTo(50);
    expect(point.x).toBeGreaterThan(50);
    expect(point.x).toBeLessThan(100);
  });
});
