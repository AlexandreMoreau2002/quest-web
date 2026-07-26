import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import '@/i18n/config';

import { SpaceCanvas } from './space-canvas';

import type { CreateNodeInput } from '@/lib/api/client';
import type { SpaceGraph, SpaceNode } from '@/lib/map/graph';

const originalWindow = window;

const mockStore = vi.hoisted(() => {
  const baseGraph: SpaceGraph = {
    id: 'space-1',
    name: 'Atlas de test',
    nodes: [
      { id: 'main', type: 'OBJECTIF', title: 'Objectif principal', status: 'active', positionX: 0, positionY: 0 },
      { id: 'step-1', type: 'ETAPE', title: 'Étape initiale', status: 'active', positionX: 240, positionY: 120 },
    ],
    edges: [],
  };

  const subscribers = new Set<() => void>();

  const state: {
    graph: SpaceGraph;
    source: 'local' | 'api';
    error: string | null;
    selectedNodeId: string | null;
    createdCount: number;
    failNextRename: boolean;
  } = {
    graph: structuredClone(baseGraph),
    source: 'local',
    error: null,
    selectedNodeId: 'main',
    createdCount: 0,
    failNextRename: false,
  };

  const emit = () => {
    subscribers.forEach((listener) => listener());
  };

  const reset = () => {
    state.graph = structuredClone(baseGraph);
    state.source = 'local';
    state.error = null;
    state.selectedNodeId = 'main';
    state.createdCount = 0;
    state.failNextRename = false;
    emit();
  };

  const selectNode = vi.fn((nodeId: string | null) => {
    state.selectedNodeId = nodeId;
    emit();
  });

  const createNode = vi.fn(async (input: CreateNodeInput) => {
    state.createdCount += 1;
    const node: SpaceNode = {
      id: `created-${state.createdCount}`,
      type: input.type,
      title: input.title.trim(),
      status: 'active',
      positionX: input.positionX ?? 0,
      positionY: input.positionY ?? 0,
    };
    state.graph = {
      ...state.graph,
      nodes: [...state.graph.nodes, node],
    };
    state.selectedNodeId = node.id;
    emit();
    return node;
  });

  const updateNodeTitle = vi.fn(async (nodeId: string, nextTitle: string) => {
    const title = nextTitle.trim();
    if (!title) return false;
    if (state.failNextRename) {
      state.failNextRename = false;
      state.error = "Le titre n'a pas pu être enregistré.";
      emit();
      return false;
    }
    state.graph = {
      ...state.graph,
      nodes: state.graph.nodes.map((node) => node.id === nodeId ? { ...node, title } : node),
    };
    state.error = null;
    emit();
    return true;
  });

  const updateNodeStatus = vi.fn(async (nodeId: string, status: SpaceNode['status']) => {
    state.graph = {
      ...state.graph,
      nodes: state.graph.nodes.map((node) => node.id === nodeId ? { ...node, status } : node),
    };
    emit();
  });

  const linkNodes = vi.fn(async () => undefined);
  const unlinkEdge = vi.fn(async () => undefined);
  const validateObjectif = vi.fn(async () => undefined);
  const updateNodePosition = vi.fn(async () => undefined);
  const removeNode = vi.fn(async (nodeId: string) => {
    state.graph = {
      ...state.graph,
      nodes: state.graph.nodes.filter((node) => node.id !== nodeId),
      edges: state.graph.edges.filter((edge) => edge.sourceNodeId !== nodeId && edge.targetNodeId !== nodeId),
    };
    if (state.selectedNodeId === nodeId) {
      state.selectedNodeId = null;
    }
    emit();
  });

  return {
    state,
    subscribers,
    reset,
    failNextRename() {
      state.failNextRename = true;
    },
    setError(message: string | null) {
      state.error = message;
      emit();
    },
    selectNode,
    createNode,
    updateNodeTitle,
    updateNodeStatus,
    updateNodePosition,
    validateObjectif,
    linkNodes,
    unlinkEdge,
    removeNode,
  };
});

vi.mock('@/hooks/use-space-map', async () => {
  const React = await import('react');

  return {
    useSpaceMap() {
      const [, setVersion] = React.useState(0);

      React.useEffect(() => {
        const rerender = () => setVersion((current) => current + 1);
        mockStore.subscribers.add(rerender);
        return () => {
          mockStore.subscribers.delete(rerender);
        };
      }, []);

      return {
        graph: mockStore.state.graph,
        source: mockStore.state.source,
        error: mockStore.state.error,
        selectedNodeId: mockStore.state.selectedNodeId,
        selectNode: mockStore.selectNode,
        createNode: mockStore.createNode,
        updateNodePosition: mockStore.updateNodePosition,
        updateNodeStatus: mockStore.updateNodeStatus,
        updateNodeTitle: mockStore.updateNodeTitle,
        validateObjectif: mockStore.validateObjectif,
        linkNodes: mockStore.linkNodes,
        unlinkEdge: mockStore.unlinkEdge,
        removeNode: mockStore.removeNode,
      };
    },
  };
});

vi.mock('@/hooks/use-theme', () => ({
  THEME_CLASS: {
    nocturne: 'qt-nocturne',
    pirate: 'qt-pirate',
    futurist: 'qt-futurist',
  },
  useTheme: () => ({ themeId: 'nocturne', setThemeId: vi.fn() }),
}));

vi.mock('@/hooks/use-locale', () => ({
  useLocale: () => ({ locale: 'fr', setLocale: vi.fn() }),
}));

vi.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: () => false,
}));

vi.mock('@/components/quest-edge', () => ({
  QuestEdge: () => null,
}));

vi.mock('@/components/theme-switcher', () => ({
  ThemeSwitcher: () => <div data-testid="theme-switcher" />,
}));

vi.mock('@/components/language-toggle', () => ({
  LanguageToggle: () => <div data-testid="language-toggle" />,
}));

vi.mock('@xyflow/react', async () => {
  const React = await import('react');

  return {
    Controls: () => <div data-testid="controls" />,
    Handle: () => <div data-testid="handle" />,
    Position: { Left: 'left', Right: 'right' },
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useEdgesState: (initial: unknown[]) => {
      const [edges, setEdges] = React.useState(initial);
      return [edges, setEdges, vi.fn()] as const;
    },
    useNodesState: (initial: unknown[]) => {
      const [nodes, setNodes] = React.useState(initial);
      return [nodes, setNodes, vi.fn()] as const;
    },
    useReactFlow: () => ({
      screenToFlowPosition: ({ x, y }: { x: number; y: number }) => ({ x, y }),
    }),
    ReactFlow: ({ nodes, nodeTypes, onNodeClick, onConnectStart, onConnectEnd, children }: {
      nodes: Array<{ id: string; type?: string; data: SpaceNode & Record<string, unknown>; selected?: boolean }>;
      nodeTypes: Record<string, React.ComponentType<unknown>>;
      onNodeClick?: (event: MouseEvent, node: { id: string }) => void;
      onConnectStart?: (event: MouseEvent, params: { nodeId: string; handleType: 'source' | 'target' }) => void;
      onConnectEnd?: (event: MouseEvent) => void;
      children: React.ReactNode;
    }) => {
      const paneRef = React.useRef<HTMLDivElement>(null);

      return (
        <div data-testid="react-flow">
          <div
            ref={paneRef}
            className="react-flow__pane"
            data-testid="flow-pane"
          />
          <button
            type="button"
            data-testid="connect-start-main"
            onClick={() => onConnectStart?.({} as MouseEvent, { nodeId: 'main', handleType: 'source' })}
          />
          <button
            type="button"
            data-testid="connect-end-pane"
            onClick={() => {
              onConnectEnd?.({
                clientX: 480,
                clientY: 360,
                target: paneRef.current,
              } as MouseEvent);
            }}
          />
          {nodes.map((node) => {
            const NodeComponent = nodeTypes[node.type ?? 'spaceNode'];
            return (
              <div
                key={node.id}
                data-testid={`node-${node.id}`}
                onClick={() => onNodeClick?.({} as MouseEvent, { id: node.id })}
              >
                <NodeComponent
                  id={node.id}
                  data={node.data}
                  selected={node.selected}
                  dragging={false}
                  isConnectable
                  xPos={0}
                  yPos={0}
                  zIndex={0}
                  type={node.type}
                />
              </div>
            );
          })}
          {children}
        </div>
      );
    },
  };
});

describe('SpaceCanvas inspector rename flow', () => {
  beforeEach(() => {
    mockStore.reset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it.each(['localhost', '127.0.0.1', '::1'])('shows the connection pill on %s', async (hostname) => {
    vi.stubGlobal('window', new Proxy(originalWindow, {
      get(target, property, receiver) {
        if (property === 'location') return { ...target.location, hostname };
        return Reflect.get(target, property, receiver);
      },
    }));

    render(<SpaceCanvas />);

    expect(await screen.findByText('Mode local')).toBeTruthy();
  });

  it('hides the connection pill on public hostnames', async () => {
    vi.stubGlobal('window', new Proxy(originalWindow, {
      get(target, property, receiver) {
        if (property === 'location') return { ...target.location, hostname: 'quest.example.com' };
        return Reflect.get(target, property, receiver);
      },
    }));

    render(<SpaceCanvas />);

    await waitFor(() => {
      expect(screen.queryByText('Mode local')).toBeNull();
      expect(screen.queryByText('API connectée')).toBeNull();
    });
  });

  it('saves an edited inspector title on Enter', async () => {
    render(<SpaceCanvas />);

    const input = screen.getByLabelText('Titre du nœud') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '  Nouveau titre  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(mockStore.updateNodeTitle).toHaveBeenCalledWith('main', 'Nouveau titre');
    });

    expect(input.value).toBe('Nouveau titre');
  });

  it('saves a non-empty draft on blur', async () => {
    render(<SpaceCanvas />);

    const input = screen.getByLabelText('Titre du nœud') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '  Titre via blur  ' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockStore.updateNodeTitle).toHaveBeenCalledWith('main', 'Titre via blur');
    });
  });

  it('restores the previous title on Escape without saving', async () => {
    render(<SpaceCanvas />);

    const input = screen.getByLabelText('Titre du nœud') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Titre annulé' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() => {
      expect(input.value).toBe('Objectif principal');
    });

    expect(mockStore.updateNodeTitle).not.toHaveBeenCalled();
  });

  it('closes the inspector from the close button', async () => {
    render(<SpaceCanvas />);

    fireEvent.click(screen.getByRole('button', { name: 'Fermer l’inspecteur' }));

    await waitFor(() => {
      expect(screen.queryByLabelText('Titre du nœud')).toBeNull();
    });
  });

  it('focuses the title field with an empty draft after creating a child by drag', async () => {
    render(<SpaceCanvas />);

    fireEvent.click(screen.getByTestId('connect-start-main'));
    fireEvent.click(screen.getByTestId('connect-end-pane'));

    await waitFor(() => {
      expect(mockStore.createNode).toHaveBeenCalled();
      expect(mockStore.linkNodes).toHaveBeenCalledWith('main', 'created-1');
    });

    const input = await screen.findByLabelText('Titre du nœud') as HTMLInputElement;
    await waitFor(() => {
      expect(document.activeElement).toBe(input);
      expect(input.value).toBe('');
    });
  });

  it('shows the rename error only after a failed title save and clears it on the next draft change', async () => {
    mockStore.failNextRename();
    render(<SpaceCanvas />);

    const input = screen.getByLabelText('Titre du nœud') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Titre en erreur' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(await screen.findByText('Le titre n’a pas pu être enregistré. Réessaie dans un instant.')).toBeTruthy();

    fireEvent.change(input, { target: { value: 'Titre corrigé' } });

    await waitFor(() => {
      expect(screen.queryByText('Le titre n’a pas pu être enregistré. Réessaie dans un instant.')).toBeNull();
    });
  });

  it('keeps the inspector error visible without leaking the shared hook error into the creation panel', async () => {
    mockStore.failNextRename();
    render(<SpaceCanvas />);

    const input = screen.getByLabelText('Titre du nœud') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Titre en erreur' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(await screen.findByText('Le titre n’a pas pu être enregistré. Réessaie dans un instant.')).toBeTruthy();
    expect(screen.queryByText("Le titre n'a pas pu être enregistré.")).toBeNull();
  });
});
