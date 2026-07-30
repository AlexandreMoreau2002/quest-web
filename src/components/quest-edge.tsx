'use client';

import { BaseEdge, useInternalNode, type EdgeProps } from '@xyflow/react';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Returns the point where a ray from the rectangle's center toward
 * `towardPoint` crosses the rectangle's boundary.
 */
export function intersectRectangle(rect: Rect, towardPoint: { x: number; y: number }) {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const hw = rect.width / 2;
  const hh = rect.height / 2;

  const dx = towardPoint.x - cx;
  const dy = towardPoint.y - cy;

  if (dx === 0 && dy === 0) {
    return { x: cx, y: cy };
  }

  const scaleX = dx !== 0 ? hw / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? hh / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);

  return { x: cx + dx * scale, y: cy + dy * scale };
}

const OBJECTIVE_SIZE = { width: 272, height: 132 };
const STEP_SIZE = { width: 224, height: 100 };

function nodeRect(node: ReturnType<typeof useInternalNode>): Rect | null {
  if (!node) return null;
  const isObjectif = (node.data as { type?: string }).type === 'OBJECTIF';
  const size = isObjectif ? OBJECTIVE_SIZE : STEP_SIZE;
  return {
    x: node.internals.positionAbsolute.x,
    y: node.internals.positionAbsolute.y,
    width: size.width,
    height: size.height,
  };
}

function rectCenter(rect: Rect) {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

export function QuestEdge({ id, source, target, style, markerEnd }: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  const sourceRect = nodeRect(sourceNode);
  const targetRect = nodeRect(targetNode);
  if (!sourceRect || !targetRect) return null;

  const sourceCenter = rectCenter(sourceRect);
  const targetCenter = rectCenter(targetRect);

  const start = intersectRectangle(sourceRect, targetCenter);
  const end = intersectRectangle(targetRect, sourceCenter);

  const seed = Array.from(id).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const direction = seed % 2 === 0 ? 1 : -1;
  const magnitude = 18 + (seed % 24);

  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const normalX = (-dy / length) * magnitude * direction;
  const normalY = (dx / length) * magnitude * direction;

  const controlX = midX + normalX;
  const controlY = midY + normalY;

  const path = `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`;

  return (
    <BaseEdge
      id={id}
      path={path}
      markerEnd={markerEnd}
      style={{ ...style, strokeLinecap: 'round' }}
    />
  );
}
