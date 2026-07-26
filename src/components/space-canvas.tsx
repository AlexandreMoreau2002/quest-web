// web/src/components/space-canvas.tsx
'use client';

import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
  applyEdgeChanges,
  applyNodeChanges,
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
    createNode, updateNodePosition, updateNodeStatus, validateObjectif, linkNodes, unlinkEdge, removeNode,
  } = useSpaceMap();
  const { themeId, setThemeId } = useTheme();
  const { locale, setLocale } = useLocale();
  const { t } = useTranslation();
  const isMobile = useMediaQuery('(max-width: 760px)');
  const [newNodeType, setNewNodeType] = useState<NodeType>('ETAPE');
  const [newNodeTitle, setNewNodeTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const flowNodes: SpaceFlowNode[] = graph.nodes.map((node) => ({
    id: node.id,
    type: 'spaceNode',
    position: { x: node.positionX, y: node.positionY },
    selected: node.id === selectedNodeId,
    data: node as SpaceNode & Record<string, unknown>,
  }));
  const flowEdges: Edge[] = graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.sourceNodeId,
    target: edge.targetNodeId,
    type: 'quest',
    selected: edge.id === selectedEdgeId,
    style: { stroke: 'var(--q-conn)', strokeWidth: 1.4, strokeDasharray: '7 9', opacity: 0.8 },
  }));

  function handleNodesChange(changes: NodeChange<SpaceFlowNode>[]) {
    for (const change of changes) {
      if (change.type === 'position' && change.dragging === false && change.position) {
        void updateNodePosition(change.id, change.position.x, change.position.y);
      }
    }
    applyNodeChanges(changes, flowNodes);
  }

  function handleEdgesChange(changes: EdgeChange<Edge>[]) {
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
    applyEdgeChanges(changes, flowEdges);
  }

  function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target) return;
    void linkNodes(connection.source, connection.target);
  }

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

  return (
    <main className={`quest-shell ${THEME_CLASS[themeId]} atlas-calm`} aria-label={t('map.ariaLabel')}>
      <ReactFlow
        className="quest-flow"
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={(_, node) => selectNode(node.id)}
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
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>

      <header className="topbar" data-map-overlay>
        <div className="brand-mark">Q</div>
        <div>
          <p className="eyebrow">{t('topbar.eyebrow')}</p>
          <h1>{graph.name}</h1>
        </div>
        <span className={`connection-pill ${source === 'api' ? 'api' : ''}`}>
          <i /> {source === 'api' ? t('topbar.apiConnected') : t('topbar.localMode')}
        </span>
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
        {error && <p className="form-error" role="alert">{error}</p>}
      </aside>

      {selectedNode && (
        <aside className={`inspector glass-panel ${isMobile ? 'bottom-sheet' : ''}`} data-map-overlay>
          <div className="inspector-title">
            <h2>{selectedNode.title}</h2>
          </div>
          <span className={`state-badge ${selectedNode.status}`}>
            {selectedNode.status === 'completed' ? t('inspector.statusDone') : t('inspector.statusActive')}
          </span>
          {selectedNode.type === 'ETAPE' && (
            <button
              type="button"
              onClick={() => void updateNodeStatus(selectedNode.id, selectedNode.status === 'completed' ? 'active' : 'completed')}
            >
              {selectedNode.status === 'completed' ? t('inspector.markActive') : t('inspector.markDone')}
            </button>
          )}
          {selectedNode.type === 'OBJECTIF' && selectedNode.status !== 'completed' && (
            <button type="button" onClick={() => void validateObjectif(selectedNode.id)}>
              {t('inspector.validateObjectif')}
            </button>
          )}
          <button type="button" className="danger" onClick={() => void removeNode(selectedNode.id)}>
            {t('inspector.deleteNode')}
          </button>
        </aside>
      )}

      <p className="map-hint" data-map-overlay>{t('map.hint')}</p>
    </main>
  );
}
