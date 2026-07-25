'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { useReactFlow } from '@xyflow/react';

import { isMapOverlayTarget } from '@/lib/map/momentum';

interface Point { x: number; y: number; time: number; }

/** Adds a short decaying glide after a quick drag on the map's empty surface. */
export function useMomentumPan(surface: RefObject<HTMLDivElement | null>) {
  const { getViewport, setViewport } = useReactFlow();
  const lastPoint = useRef<Point | null>(null);
  const velocity = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const animation = useRef<number | null>(null);

  useEffect(() => {
    const element = surface.current;
    if (!element) return;

    const stop = () => {
      if (animation.current !== null) cancelAnimationFrame(animation.current);
      animation.current = null;
    };
    const down = (event: PointerEvent) => {
      stop();
      if (isMapOverlayTarget(event.target)) return;
      dragging.current = true;
      lastPoint.current = { x: event.clientX, y: event.clientY, time: event.timeStamp };
      velocity.current = { x: 0, y: 0 };
    };
    const move = (event: PointerEvent) => {
      if (!dragging.current || !lastPoint.current) return;
      const elapsed = Math.max(event.timeStamp - lastPoint.current.time, 1);
      velocity.current = {
        x: ((event.clientX - lastPoint.current.x) / elapsed) * 16,
        y: ((event.clientY - lastPoint.current.y) / elapsed) * 16,
      };
      lastPoint.current = { x: event.clientX, y: event.clientY, time: event.timeStamp };
    };
    const up = () => {
      if (!dragging.current) return;
      dragging.current = false;
      const glide = () => {
        velocity.current.x *= 0.91;
        velocity.current.y *= 0.91;
        if (Math.hypot(velocity.current.x, velocity.current.y) < 0.18) return;
        const viewport = getViewport();
        setViewport({ ...viewport, x: viewport.x + velocity.current.x, y: viewport.y + velocity.current.y });
        animation.current = requestAnimationFrame(glide);
      };
      animation.current = requestAnimationFrame(glide);
    };

    element.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      stop();
      element.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [getViewport, setViewport, surface]);
}
