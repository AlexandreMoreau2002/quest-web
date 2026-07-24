export interface PlacedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PlaceNodeInput {
  parent: PlacedRect;
  siblingIndex: number;
  siblingCount: number;
  existing: PlacedRect[];
  newNodeWidth?: number;
  newNodeHeight?: number;
}

const MIN_RING_RADIUS = 180;
const SECTOR_DEGREES = 45;
const NEW_NODE_WIDTH = 224;
const NEW_NODE_HEIGHT = 100;

function center(rect: PlacedRect) {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function rectsOverlap(a: { x: number; y: number; width: number; height: number }, b: PlacedRect): boolean {
  return Math.abs(a.x - (b.x + b.width / 2)) < (a.width + b.width) / 2
    && Math.abs(a.y - (b.y + b.height / 2)) < (a.height + b.height) / 2;
}

/**
 * Places a new node on a ring around its parent: the base angle points "up" from the parent
 * center, siblings fan out across evenly spaced sectors, and if the resulting spot overlaps an
 * existing card the candidate is nudged clockwise/counter-clockwise along the same ring until a
 * free spot is found (falling back to the original spot if none is found).
 */
export function placeNode({ parent, siblingIndex, siblingCount, existing, newNodeWidth = NEW_NODE_WIDTH, newNodeHeight = NEW_NODE_HEIGHT }: PlaceNodeInput): { x: number; y: number } {
  const parentCenter = center(parent);
  const parentHalfDiagonal = Math.hypot(parent.width / 2, parent.height / 2);
  const radius = parentHalfDiagonal + MIN_RING_RADIUS;

  const baseAngle = -90;
  const spread = (siblingIndex - (siblingCount - 1) / 2) * SECTOR_DEGREES;
  const angleDeg = baseAngle + spread;

  const candidateAt = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return {
      x: parentCenter.x + Math.cos(rad) * radius,
      y: parentCenter.y + Math.sin(rad) * radius,
    };
  };

  const fits = (point: { x: number; y: number }) => !existing.some((rect) => rectsOverlap({ ...point, width: newNodeWidth, height: newNodeHeight }, rect));

  const initial = candidateAt(angleDeg);
  if (fits(initial)) return initial;

  for (let stepDeg = 5; stepDeg <= 180; stepDeg += 5) {
    const clockwise = candidateAt(angleDeg + stepDeg);
    if (fits(clockwise)) return clockwise;
    const counterClockwise = candidateAt(angleDeg - stepDeg);
    if (fits(counterClockwise)) return counterClockwise;
  }

  return initial;
}
