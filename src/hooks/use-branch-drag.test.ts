import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useBranchDrag } from './use-branch-drag';

describe('useBranchDrag', () => {
  it('starts idle, tracks position while dragging, and opens the menu on drop', () => {
    const { result } = renderHook(() => useBranchDrag());

    expect(result.current.state.status).toBe('idle');

    act(() => result.current.startDrag('node-1', { x: 10, y: 10 }));
    expect(result.current.state).toMatchObject({ status: 'dragging', sourceNodeId: 'node-1' });

    act(() => result.current.updateDrag({ x: 50, y: 60 }));
    expect(result.current.state).toMatchObject({ status: 'dragging', cursor: { x: 50, y: 60 } });

    act(() => result.current.endDrag());
    expect(result.current.state).toMatchObject({ status: 'menu-open', sourceNodeId: 'node-1', menuPosition: { x: 50, y: 60 } });

    act(() => result.current.reset());
    expect(result.current.state.status).toBe('idle');
  });
});
