// web/src/components/space-canvas.tsx
'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
  type OnConnectEnd,
  type OnConnectStart,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useSpaceMap } from '@/hooks/use-space-map';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useTheme, THEME_CLASS } from '@/hooks/use-theme';
import { useLocale } from '@/hooks/use-locale';
import { QuestEdge } from '@/components/quest-edge';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { LanguageToggle } from '@/components/language-toggle';
import type { NodeType, SpaceNode } from '@/lib/map/graph';

type SpaceFlowNode = Node<SpaceNode & Record<string, unknown>>;

function SpaceNodeCard({ data, selected }: NodeProps<SpaceFlowNode>) {
  const { t } = useTranslation();
  const isObjectif = data.type === 'OBJECTIF';
  return (
    <div
      className={`quest-node status-${data.status} ${isObjectif ? 'is-objective' : ''} ${selected ? 'is-selected' : ''}`}
      tabIndex={0}
      role="button"
      aria-label={data.title}
    >
      <Handle id="target" type="target" position={Position.Left} className="node-handle" />
      <Handle id="source" type="source" position={Position.Right} className="node-handle" />
      <span className="node-status">
        {isObjectif ? t('node.objectiveEyebrow') : data.status === 'completed' ? t('node.statusDone') : t('node.statusActive')}
      </span>
      <strong>{data.title}</strong>
    </div>
  );
}

const nodeTypes = { spaceNode: SpaceNodeCard };
const edgeTypes = { quest: QuestEdge };
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

function isLocalHostname(hostname: string) {
  return LOCAL_HOSTNAMES.has(hostname);
}

export function SpaceCanvas() {
  return (
    <ReactFlowProvider>
      <SpaceCanvasInner />
    </ReactFlowProvider>
  );
}

function SpaceCanvasInner() {
  const {
    graph, source, error, selectedNodeId, selectNode,
    createNode, updateNodePosition, updateNodeStatus, updateNodeTitle, validateObjectif, linkNodes, unlinkEdge, removeNode,
  } = useSpaceMap();
  const { themeId, setThemeId } = useTheme();
  const { locale, setLocale } = useLocale();
  const { t } = useTranslation();
  const { screenToFlowPosition } = useReactFlow();
  const isMobile = useMediaQuery('(max-width: 760px)');
  const [newNodeType, setNewNodeType] = useState<NodeType>('ETAPE');
  const [newNodeTitle, setNewNodeTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isLocalHost, setIsLocalHost] = useState(false);
  const connectingHandle = useRef<{ nodeId: string; handleType: 'source' | 'target' } | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const skipNextTitleBlur = useRef(false);
  const focusTitleInputOnPaint = useRef(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [draftNodeId, setDraftNodeId] = useState<string | null>(null);

  // useNodesState/useEdgesState keep a local, mutable copy that React Flow's
  // own drag handling updates frame-by-frame (via onNodesChange), so a card
  // tracks the cursor exactly instead of waiting for the position to round-trip
  // through useSpaceMap's state on every animation frame. We only resync from
  // `graph` (the source of truth) when it changes from outside a drag.
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState<SpaceFlowNode>([]);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState<Edge>([]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsLocalHost(isLocalHostname(window.location.hostname));
    });
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    setNodes(graph.nodes.map((node) => ({
      id: node.id,
      type: 'spaceNode',
      position: { x: node.positionX, y: node.positionY },
      selected: node.id === selectedNodeId,
      data: node as SpaceNode & Record<string, unknown>,
    })));
  }, [graph.nodes, selectedNodeId, setNodes]);

  useEffect(() => {
    setEdges(graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      type: 'quest',
      selected: edge.id === selectedEdgeId,
      style: { stroke: 'var(--q-conn)', strokeWidth: 1.4, strokeDasharray: '7 9', opacity: 0.8 },
    })));
  }, [graph.edges, selectedEdgeId, setEdges]);

  function handleNodesChange(changes: NodeChange<SpaceFlowNode>[]) {
    onNodesChangeInternal(changes);
    for (const change of changes) {
      if (change.type === 'position' && change.dragging === false && change.position) {
        void updateNodePosition(change.id, change.position.x, change.position.y);
      }
    }
  }

  function handleEdgesChange(changes: EdgeChange<Edge>[]) {
    onEdgesChangeInternal(changes);
    for (const change of changes) {
      if (change.type === 'remove') {
        void unlinkEdge(change.id);
        setSelectedEdgeId((current) => (current === change.id ? null : current));
      }
      if (change.type === 'select') {
        setSelectedEdgeId((current) => {
          if (change.selected) return change.id;
          return current === change.id ? null : current;
        });
      }
    }
  }

  function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target) return;
    void linkNodes(connection.source, connection.target);
  }

  const handleConnectStart: OnConnectStart = useCallback((_event, params) => {
    if (!params.nodeId || !params.handleType) return;
    connectingHandle.current = { nodeId: params.nodeId, handleType: params.handleType };
  }, []);

  const startRename = useCallback((nodeId: string, initialDraft?: string) => {
    setRenameError(null);
    setDraftNodeId(nodeId);
    setTitleDraft(initialDraft ?? '');
    focusTitleInputOnPaint.current = true;
    selectNode(nodeId);
  }, [selectNode]);

  // Dragging a link from a Card's handle and releasing it over empty canvas
  // (rather than onto another Card) creates a new linked Card at the drop
  // point — the "grow a branch" gesture the old anchor+menu interaction used
  // to provide, now expressed through React Flow's native connect gesture.
  const handleConnectEnd: OnConnectEnd = useCallback((event) => {
    const pending = connectingHandle.current;
    connectingHandle.current = null;
    if (!pending) return;

    const target = event.target as HTMLElement | null;
    if (!target?.classList.contains('react-flow__pane')) return;

    const point = 'changedTouches' in event
      ? { x: event.changedTouches[0]!.clientX, y: event.changedTouches[0]!.clientY }
      : { x: event.clientX, y: event.clientY };
    const position = screenToFlowPosition(point);

    void (async () => {
      const created = await createNode({
        type: 'ETAPE',
        title: t('inspector.temporaryChildTitle'),
        positionX: position.x,
        positionY: position.y,
      });
      if (!created) return;
      if (pending.handleType === 'source') {
        await linkNodes(pending.nodeId, created.id);
      } else {
        await linkNodes(created.id, pending.nodeId);
      }
      startRename(created.id, '');
    })();
  }, [createNode, linkNodes, screenToFlowPosition, startRename, t]);

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    const centerX = 400 + Math.round(Math.random() * 200);
    const centerY = 300 + Math.round(Math.random() * 200);
    await createNode({ type: newNodeType, title: newNodeTitle, positionX: centerX, positionY: centerY });
    setIsCreating(false);
    setNewNodeTitle('');
  }

  const selectedNode = graph.nodes.find((node) => node.id === selectedNodeId) ?? null;
  const currentTitleDraft = selectedNode
    ? (draftNodeId === selectedNode.id ? titleDraft : selectedNode.title)
    : '';

  useEffect(() => {
    if (!selectedNode || !focusTitleInputOnPaint.current) return;
    titleInputRef.current?.focus();
    titleInputRef.current?.select();
    focusTitleInputOnPaint.current = false;
  });

  const commitTitleDraft = useCallback(async () => {
    if (!selectedNode) return;

    const nextTitle = currentTitleDraft.trim();
    if (!nextTitle) {
      setRenameError(null);
      setDraftNodeId(selectedNode.id);
      setTitleDraft(selectedNode.title);
      return;
    }

    if (nextTitle === selectedNode.title) {
      setRenameError(null);
      setDraftNodeId(selectedNode.id);
      setTitleDraft(nextTitle);
      return;
    }

    const saved = await updateNodeTitle(selectedNode.id, nextTitle);
    if (!saved) {
      setRenameError(selectedNode.id);
      setDraftNodeId(selectedNode.id);
      setTitleDraft(selectedNode.title);
      return;
    }

    setRenameError(null);
    setDraftNodeId(selectedNode.id);
    setTitleDraft(nextTitle);
  }, [currentTitleDraft, selectedNode, updateNodeTitle]);

  async function handleTitleBlur() {
    if (skipNextTitleBlur.current) {
      skipNextTitleBlur.current = false;
      return;
    }
    await commitTitleDraft();
  }

  async function handleTitleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!selectedNode) return;
    const input = event.currentTarget;

    if (event.key === 'Enter') {
      event.preventDefault();
      skipNextTitleBlur.current = true;
      await commitTitleDraft();
      input.blur();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      skipNextTitleBlur.current = true;
      setRenameError(null);
      setDraftNodeId(selectedNode.id);
      setTitleDraft(selectedNode.title);
      input.blur();
    }
  }

  return (
    <main className={`quest-shell ${THEME_CLASS[themeId]} atlas-calm`} aria-label={t('map.ariaLabel')}>
      <ReactFlow
        className="quest-flow"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onConnectStart={handleConnectStart}
        onConnectEnd={handleConnectEnd}
        onNodeClick={(_, node) => {
          setRenameError(null);
          selectNode(node.id);
        }}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.3}
        maxZoom={1.8}
        panOnDrag
        panOnScroll
        zoomOnScroll
        zoomOnPinch
        nodesDraggable
        nodesFocusable
        deleteKeyCode={['Backspace', 'Delete']}
        proOptions={{ hideAttribution: true }}
      >
        <Controls showInteractive={false} />
      </ReactFlow>

      <header className="topbar" data-map-overlay>
        <div className="brand-mark">Q</div>
        <div>
          <p className="eyebrow">{t('topbar.eyebrow')}</p>
          <h1>{graph.name}</h1>
        </div>
        {isLocalHost && (
          <span className={`connection-pill ${source === 'api' ? 'api' : ''}`}>
            <i /> {source === 'api' ? t('topbar.apiConnected') : t('topbar.localMode')}
          </span>
        )}
        <ThemeSwitcher activeTheme={themeId} onSelect={setThemeId} />
        <LanguageToggle activeLocale={locale} onSelect={setLocale} />
      </header>

      <aside className={`creation-panel glass-panel ${isMobile ? 'bottom-sheet' : ''}`} data-map-overlay>
        <p className="eyebrow">{t('creationPanel.eyebrow')}</p>
        <h2>{t('creationPanel.title')}</h2>
        <form onSubmit={submitCreate}>
          <label htmlFor="node-type">{t('creationPanel.nodeTypeLabel')}</label>
          <select id="node-type" value={newNodeType} onChange={(event) => setNewNodeType(event.target.value as NodeType)}>
            <option value="OBJECTIF">{t('creationPanel.nodeTypeObjectif')}</option>
            <option value="ETAPE">{t('creationPanel.nodeTypeEtape')}</option>
          </select>
          <label htmlFor="node-title">{t('creationPanel.nodeTitleLabel')}</label>
          <input id="node-title" value={newNodeTitle} onChange={(event) => setNewNodeTitle(event.target.value)} placeholder={t('creationPanel.nodeTitlePlaceholder')} />
          <button type="submit" disabled={isCreating || newNodeTitle.trim() === ''}>
            {isCreating ? t('creationPanel.submitPending') : t('creationPanel.submit')} <span>→</span>
          </button>
        </form>
        {error && !renameError && <p className="form-error" role="alert">{error}</p>}
      </aside>

      {selectedNode && (
        <aside className={`inspector glass-panel ${isMobile ? 'bottom-sheet' : ''}`} data-map-overlay>
          {isMobile && <div className="bottom-sheet-handle" />}
          <div className="inspector-header">
            <div className="inspector-label-group">
              <p className="eyebrow">
                {selectedNode.type === 'OBJECTIF' ? t('creationPanel.nodeTypeObjectif') : t('creationPanel.nodeTypeEtape')}
              </p>
              <p className="panel-copy">{t('inspector.description')}</p>
            </div>
            <button
              type="button"
              className="secondary-button inspector-close"
              aria-label={t('inspector.close')}
              onClick={() => {
                setRenameError(null);
                selectNode(null);
              }}
            >
              ×
            </button>
          </div>
          <div className="inspector-field">
            <label htmlFor="inspector-node-title">{t('inspector.titleLabel')}</label>
            <input
              id="inspector-node-title"
              ref={titleInputRef}
              value={currentTitleDraft}
              onBlur={() => void handleTitleBlur()}
              onChange={(event) => {
                setRenameError(null);
                setDraftNodeId(selectedNode.id);
                setTitleDraft(event.target.value);
              }}
              onKeyDown={(event) => void handleTitleKeyDown(event)}
              placeholder={t('inspector.titlePlaceholder')}
            />
            <p className="inspector-hint">{t('inspector.titleHint')}</p>
          </div>
          {renameError === selectedNode.id && <p className="form-error" role="alert">{t('inspector.titleError')}</p>}
          <span className={`state-badge ${selectedNode.status}`}>
            {selectedNode.status === 'completed' ? t('inspector.statusDone') : t('inspector.statusActive')}
          </span>
          <div className="inspector-actions">
            {selectedNode.type === 'ETAPE' && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => void updateNodeStatus(selectedNode.id, selectedNode.status === 'completed' ? 'active' : 'completed')}
              >
                {selectedNode.status === 'completed' ? t('inspector.markActive') : t('inspector.markDone')}
              </button>
            )}
            {selectedNode.type === 'OBJECTIF' && selectedNode.status !== 'completed' && (
              <button type="button" className="secondary-button" onClick={() => void validateObjectif(selectedNode.id)}>
                {t('inspector.validateObjectif')}
              </button>
            )}
            <button type="button" className="danger" onClick={() => void removeNode(selectedNode.id)}>
              {t('inspector.deleteNode')}
            </button>
          </div>
        </aside>
      )}

      <p className="map-hint" data-map-overlay>{t('map.hint')}</p>
    </main>
  );
}
