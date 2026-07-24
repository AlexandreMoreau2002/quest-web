'use client';

import { useCallback, useState } from 'react';

type Point = { x: number; y: number };

type BranchDragState =
  | { status: 'idle' }
  | { status: 'dragging'; sourceNodeId: string; cursor: Point }
  | { status: 'menu-open'; sourceNodeId: string; menuPosition: Point };

export function useBranchDrag() {
  const [state, setState] = useState<BranchDragState>({ status: 'idle' });

  const startDrag = useCallback((sourceNodeId: string, cursor: Point) => {
    setState({ status: 'dragging', sourceNodeId, cursor });
  }, []);

  // Keyboard activation has no pointerup to end a drag with, so it opens the
  // menu directly at the anchor's position instead of entering 'dragging'.
  const openMenuAt = useCallback((sourceNodeId: string, menuPosition: Point) => {
    setState({ status: 'menu-open', sourceNodeId, menuPosition });
  }, []);

  const updateDrag = useCallback((cursor: Point) => {
    setState((current) => (current.status === 'dragging' ? { ...current, cursor } : current));
  }, []);

  const endDrag = useCallback(() => {
    setState((current) => (current.status === 'dragging'
      ? { status: 'menu-open', sourceNodeId: current.sourceNodeId, menuPosition: current.cursor }
      : current));
  }, []);

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, startDrag, updateDrag, endDrag, openMenuAt, reset };
}
