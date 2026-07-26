import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSpaceMap } from './use-space-map';

vi.mock('@/lib/api/client', () => {
  const graph = {
    id: 'space-1',
    name: 'Test Space',
    nodes: [{ id: 'n1', type: 'OBJECTIF', title: 'Objectif', status: 'active', positionX: 0, positionY: 0 }],
    edges: [],
  };
  return {
    QuestApiClient: vi.fn().mockImplementation(() => ({
      loadFirstSpace: vi.fn().mockResolvedValue(graph),
      createNode: vi.fn().mockResolvedValue({ id: 'n2', type: 'ETAPE', title: 'Étape', status: 'active', positionX: 100, positionY: 100 }),
      updateNode: vi.fn().mockResolvedValue({ id: 'n1', positionX: 50, positionY: 50 }),
      createEdge: vi.fn().mockResolvedValue({ id: 'e1', sourceNodeId: 'n2', targetNodeId: 'n1' }),
      deleteEdge: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

describe('useSpaceMap', () => {
  it('loads the space graph from the API', async () => {
    const { result } = renderHook(() => useSpaceMap());
    await waitFor(() => expect(result.current.source).toBe('api'));
    expect(result.current.graph.nodes).toHaveLength(1);
  });

  it('creates a node and adds it to the graph', async () => {
    const { result } = renderHook(() => useSpaceMap());
    await waitFor(() => expect(result.current.source).toBe('api'));

    await act(async () => {
      await result.current.createNode({ type: 'ETAPE', title: 'Étape', positionX: 100, positionY: 100 });
    });

    expect(result.current.graph.nodes.map((node) => node.id)).toContain('n2');
  });

  it('creates an edge and adds it to the graph', async () => {
    const { result } = renderHook(() => useSpaceMap());
    await waitFor(() => expect(result.current.source).toBe('api'));

    await act(async () => {
      await result.current.linkNodes('n2', 'n1');
    });

    expect(result.current.graph.edges.map((edge) => edge.id)).toContain('e1');
  });
});
