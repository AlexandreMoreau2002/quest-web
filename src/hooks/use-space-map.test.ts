import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSpaceMap } from './use-space-map';

const loadFirstSpace = vi.fn();
const createNode = vi.fn();
const updateNode = vi.fn();
const createEdge = vi.fn();
const deleteEdge = vi.fn();

vi.mock('@/lib/api/client', () => {
  const graph = {
    id: 'space-1',
    name: 'Test Space',
    nodes: [{ id: 'n1', type: 'OBJECTIF', title: 'Objectif', status: 'active', positionX: 0, positionY: 0 }],
    edges: [],
  };
  return {
    QuestApiClient: vi.fn().mockImplementation(() => ({
      loadFirstSpace,
      createNode,
      updateNode,
      createEdge,
      deleteEdge,
    })),
    __mocks: { graph },
  };
});

describe('useSpaceMap', () => {
  const apiGraph = {
    id: 'space-1',
    name: 'Test Space',
    nodes: [{ id: 'n1', type: 'OBJECTIF', title: 'Objectif', status: 'active', positionX: 0, positionY: 0 }],
    edges: [],
  };

  beforeEach(() => {
    loadFirstSpace.mockReset();
    createNode.mockReset();
    updateNode.mockReset();
    createEdge.mockReset();
    deleteEdge.mockReset();

    loadFirstSpace.mockResolvedValue(apiGraph);
    createNode.mockResolvedValue({ id: 'n2', type: 'ETAPE', title: 'Étape', status: 'active', positionX: 100, positionY: 100 });
    updateNode.mockResolvedValue({ id: 'n1', type: 'OBJECTIF', title: 'Objectif API', status: 'active', positionX: 50, positionY: 50 });
    createEdge.mockResolvedValue({ id: 'e1', sourceNodeId: 'n2', targetNodeId: 'n1' });
    deleteEdge.mockResolvedValue(undefined);
  });

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

  it('updates a node title in local mode', async () => {
    loadFirstSpace.mockRejectedValueOnce(new Error('offline'));

    const { result } = renderHook(() => useSpaceMap());
    await waitFor(() => expect(result.current.source).toBe('local'));

    let updated = false;
    await act(async () => {
      updated = await result.current.updateNodeTitle('main', '  Nouvelle priorité  ');
    });

    expect(updated).toBe(true);
    expect(result.current.graph.nodes.find((node) => node.id === 'main')?.title).toBe('Nouvelle priorité');
  });

  it('patches the title in API mode and replaces the returned node', async () => {
    updateNode.mockResolvedValueOnce({
      id: 'n1',
      type: 'OBJECTIF',
      title: 'Titre API',
      status: 'active',
      positionX: 50,
      positionY: 50,
    });

    const { result } = renderHook(() => useSpaceMap());
    await waitFor(() => expect(result.current.source).toBe('api'));

    let updated = false;
    await act(async () => {
      updated = await result.current.updateNodeTitle('n1', '  Titre API  ');
    });

    expect(updated).toBe(true);
    expect(updateNode).toHaveBeenCalledWith('n1', { title: 'Titre API' });
    expect(result.current.graph.nodes.find((node) => node.id === 'n1')?.title).toBe('Titre API');
  });

  it('rejects an empty trimmed title without mutating the graph', async () => {
    const { result } = renderHook(() => useSpaceMap());
    await waitFor(() => expect(result.current.source).toBe('api'));

    const initialTitle = result.current.graph.nodes.find((node) => node.id === 'n1')?.title;

    let updated = true;
    await act(async () => {
      updated = await result.current.updateNodeTitle('n1', '   ');
    });

    expect(updated).toBe(false);
    expect(updateNode).not.toHaveBeenCalled();
    expect(result.current.graph.nodes.find((node) => node.id === 'n1')?.title).toBe(initialTitle);
  });

  it('rolls back only the title when the API update fails', async () => {
    let rejectUpdateNode!: (error: Error) => void;
    updateNode.mockImplementationOnce(() => new Promise<never>((_resolve, reject) => {
      rejectUpdateNode = reject;
    }));

    const { result } = renderHook(() => useSpaceMap());
    await waitFor(() => expect(result.current.source).toBe('api'));

    let updatePromise: Promise<boolean> | undefined;
    await act(async () => {
      updatePromise = result.current.updateNodeTitle('n1', '  Titre provisoire  ');
    });

    expect(result.current.graph.nodes.find((node) => node.id === 'n1')?.title).toBe('Titre provisoire');

    await act(async () => {
      await result.current.updateNodeStatus('n1', 'completed');
    });

    expect(result.current.graph.nodes.find((node) => node.id === 'n1')?.status).toBe('completed');

    await act(async () => {
      rejectUpdateNode(new Error('update failed'));
      await updatePromise;
    });

    expect(updatePromise).toBeDefined();
    await expect(updatePromise).resolves.toBe(false);
    expect(result.current.error).toBe("Le titre n'a pas pu être enregistré.");
    expect(result.current.graph.nodes.find((node) => node.id === 'n1')?.title).toBe('Objectif');
    expect(result.current.graph.nodes.find((node) => node.id === 'n1')?.status).toBe('completed');
  });

  it('keeps a newer title if a later rename has already been applied', async () => {
    let rejectFirstUpdate!: (error: Error) => void;
    updateNode.mockImplementationOnce(() => new Promise<never>((_resolve, reject) => {
      rejectFirstUpdate = reject;
    }));
    updateNode.mockResolvedValueOnce({
      id: 'n1',
      type: 'OBJECTIF',
      title: 'Titre plus récent',
      status: 'active',
      positionX: 50,
      positionY: 50,
    });

    const { result } = renderHook(() => useSpaceMap());
    await waitFor(() => expect(result.current.source).toBe('api'));

    let firstUpdatePromise: Promise<boolean> | undefined;
    await act(async () => {
      firstUpdatePromise = result.current.updateNodeTitle('n1', '  Titre provisoire  ');
    });

    expect(result.current.graph.nodes.find((node) => node.id === 'n1')?.title).toBe('Titre provisoire');

    let secondUpdatePromise: Promise<boolean> | undefined;
    await act(async () => {
      secondUpdatePromise = result.current.updateNodeTitle('n1', '  Titre plus récent  ');
    });

    expect(result.current.graph.nodes.find((node) => node.id === 'n1')?.title).toBe('Titre plus récent');

    await act(async () => {
      rejectFirstUpdate(new Error('update failed'));
      await firstUpdatePromise;
    });

    await expect(firstUpdatePromise).resolves.toBe(false);

    await expect(secondUpdatePromise).resolves.toBe(true);
    expect(result.current.error).toBe("Le titre n'a pas pu être enregistré.");
    expect(result.current.graph.nodes.find((node) => node.id === 'n1')?.title).toBe('Titre plus récent');
  });
});
