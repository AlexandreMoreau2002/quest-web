'use client';

import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useViewport,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useQuestMap } from '@/hooks/use-quest-map';
import { useMomentumPan } from '@/hooks/use-momentum-pan';
import { useBranchDrag } from '@/hooks/use-branch-drag';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useTheme, THEME_CLASS } from '@/hooks/use-theme';
import { QuestEdge } from '@/components/quest-edge';
import { NodeAnchor } from '@/components/node-anchor';
import { BranchMenu } from '@/components/branch-menu';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { intersectRectangle, type Rect } from '@/lib/map/edge-geometry';
import type { QuestGraphNode } from '@/lib/map/graph';

const OBJECTIVE_SIZE = { width: 272, height: 132 };
const STEP_SIZE = { width: 224, height: 100 };

function graphNodeRect(node: QuestGraphNode): Rect {
  const size = node.data.isObjective ? OBJECTIVE_SIZE : STEP_SIZE;
  return { x: node.position.x, y: node.position.y, width: size.width, height: size.height };
}

function rectCenter(rect: Rect) {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

type QuestFlowNode = Node<QuestGraphNode['data']>;

function QuestNode({ data, selected }: NodeProps<QuestFlowNode>) {
  const { t } = useTranslation();
  return (
    <div
      className={`quest-node status-${data.status} ${data.isObjective ? 'is-objective' : ''} ${selected ? 'is-selected' : ''}`}
      style={{ '--quest-color': data.color } as React.CSSProperties}
      tabIndex={0}
      role="button"
      aria-label={data.title}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.currentTarget.click();
        }
      }}
    >
      <Handle id="target-left" type="target" position={Position.Left} className="node-handle" />
      <Handle id="source-left" type="source" position={Position.Left} className="node-handle" />
      <span className="node-status">{data.isObjective ? t('node.objectiveEyebrow') : data.status === 'done' ? t('node.statusDone') : data.status === 'active' ? t('node.statusActive') : t('node.statusLocked')}</span>
      <strong>{data.title}</strong>
      <small className="node-description">{data.isObjective ? t('node.objectiveDescription', { questTitle: data.questTitle }) : data.questTitle}</small>
      <Handle id="target-right" type="target" position={Position.Right} className="node-handle" />
      <Handle id="source-right" type="source" position={Position.Right} className="node-handle" />
    </div>
  );
}

const nodeTypes = { quest: QuestNode };
const edgeTypes = { quest: QuestEdge };

function MapMomentum({ surface }: { surface: RefObject<HTMLDivElement | null> }) {
  useMomentumPan(surface);
  return null;
}

export function QuestMap() {
  return (
    <ReactFlowProvider>
      <QuestMapInner />
    </ReactFlowProvider>
  );
}

function QuestMapInner() {
  const { flowToScreenPosition } = useReactFlow();
  // Subscribing to the viewport forces a re-render on every pan/zoom tick
  // (including momentum-glide frames, which move the viewport without any
  // hover/selection state changing) so anchorScreenPoint below never goes
  // stale relative to where the card actually is on screen.
  useViewport();
  const {
    graph, selectedId, selectedNode, selectNode, selectedQuestId, selectQuest, objectives,
    createQuest, createStep, createLinkedGoal, linkExisting, source, error, spaceName,
  } = useQuestMap();
  const [title, setTitle] = useState('');
  const [firstStepTitle, setFirstStepTitle] = useState('');
  const [stepTitle, setStepTitle] = useState('');
  const [isCreatingQuest, setIsCreatingQuest] = useState(false);
  const [isCreatingStep, setIsCreatingStep] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hideAnchorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showAnchorFor = (nodeId: string) => {
    console.debug('[QuestMap] showAnchorFor', nodeId);
    if (hideAnchorTimeout.current !== null) {
      clearTimeout(hideAnchorTimeout.current);
      hideAnchorTimeout.current = null;
    }
    setHoveredId(nodeId);
  };
  // The anchor button sits right on the card's edge, so the cursor crossing
  // in and out of its small hitbox would otherwise fire the card's
  // mouseleave/mouseenter back-to-back, making the anchor flicker on and
  // off rapidly. Delaying the hide (and cancelling it if the pointer lands
  // on the card or the anchor again within that window) bridges the gap.
  const scheduleHideAnchor = () => {
    console.debug('[QuestMap] scheduleHideAnchor');
    if (hideAnchorTimeout.current !== null) clearTimeout(hideAnchorTimeout.current);
    hideAnchorTimeout.current = setTimeout(() => {
      console.debug('[QuestMap] hideAnchor (timeout fired)');
      setHoveredId(null);
    }, 120);
  };
  const branchDrag = useBranchDrag();
  const surface = useRef<HTMLDivElement>(null);
  const { themeId, setThemeId } = useTheme();
  const { t } = useTranslation();
  const isMobile = useMediaQuery('(max-width: 760px)');
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);

  const hoveredNode = graph.nodes.find((node) => node.id === hoveredId) ?? null;
  let anchorPoint: { x: number; y: number } | null = null;
  if (hoveredNode) {
    const hoveredRect = graphNodeRect(hoveredNode);
    const hoveredCenter = rectCenter(hoveredRect);
    const parentEdge = graph.edges.find((edge) => edge.target === hoveredNode.id);
    const parentNode = parentEdge ? graph.nodes.find((node) => node.id === parentEdge.source) : undefined;
    if (parentNode) {
      const parentCenter = rectCenter(graphNodeRect(parentNode));
      const mirrored = { x: 2 * hoveredCenter.x - parentCenter.x, y: 2 * hoveredCenter.y - parentCenter.y };
      anchorPoint = intersectRectangle(hoveredRect, mirrored);
    } else {
      anchorPoint = intersectRectangle(hoveredRect, { x: hoveredCenter.x + 1000, y: hoveredCenter.y });
    }
  }
  // anchorPoint above is in flow (graph) coordinates. NodeAnchor is rendered
  // outside the ReactFlow viewport transform, so it needs screen coordinates.
  const anchorScreenPoint = anchorPoint ? flowToScreenPosition(anchorPoint) : null;

  useEffect(() => {
    const surfaceEl = surface.current;
    if (!surfaceEl) return;
    const handleFocusIn = (event: FocusEvent) => {
      const nodeEl = (event.target as HTMLElement).closest<HTMLElement>('.quest-node');
      const nodeId = nodeEl?.closest<HTMLElement>('[data-id]')?.dataset.id;
      if (nodeId) showAnchorFor(nodeId);
    };
    surfaceEl.addEventListener('focusin', handleFocusIn);
    return () => surfaceEl.removeEventListener('focusin', handleFocusIn);
  }, [surface]);

  useEffect(() => () => {
    if (hideAnchorTimeout.current !== null) clearTimeout(hideAnchorTimeout.current);
  }, []);

  useEffect(() => {
    if (branchDrag.state.status !== 'dragging') return;
    const handleMove = (event: PointerEvent) => branchDrag.updateDrag({ x: event.clientX, y: event.clientY });
    const handleUp = () => branchDrag.endDrag();
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [branchDrag.state.status, branchDrag]);

  const dragState = branchDrag.state;

  const nodes: QuestFlowNode[] = graph.nodes.map((node) => ({
    ...node,
    type: 'quest',
    selected: node.id === selectedId,
    ariaLabel: node.data.title,
  }));
  const edges: Edge[] = graph.edges.map((edge) => ({
    ...edge,
    type: 'quest',
    className: 'quest-edge',
    style: { stroke: 'var(--q-conn)', strokeWidth: 1.4, strokeDasharray: '7 9', opacity: 0.8 },
  }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreatingQuest(true);
    const created = await createQuest(title, firstStepTitle);
    setIsCreatingQuest(false);
    if (created) {
      setTitle('');
      setFirstStepTitle('');
    }
  }

  async function submitStep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreatingStep(true);
    const created = await createStep(stepTitle);
    setIsCreatingStep(false);
    if (created) setStepTitle('');
  }

  const creationPanelContent = (
    <>
      <p className="eyebrow">{t('creationPanel.eyebrow')}</p>
      <h2>{t('creationPanel.title')}</h2>
      <p className="panel-copy">{t('creationPanel.description')}</p>
      <label htmlFor="objective-selector">{t('creationPanel.objectiveLabel')}</label>
      <select id="objective-selector" value={selectedQuestId} onChange={(event) => selectQuest(event.target.value)}>
        {objectives.map((objective) => <option key={objective.id} value={objective.id}>{objective.title}</option>)}
      </select>
      <form onSubmit={submit}>
        <label htmlFor="quest-title">{t('creationPanel.newObjectiveLabel')}</label>
        <input id="quest-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t('creationPanel.newObjectivePlaceholder')} />
        <label htmlFor="first-step-title">{t('creationPanel.firstStepLabel')}</label>
        <input id="first-step-title" value={firstStepTitle} onChange={(event) => setFirstStepTitle(event.target.value)} placeholder={t('creationPanel.firstStepPlaceholder')} />
        <button type="submit" disabled={isCreatingQuest}>{isCreatingQuest ? t('creationPanel.submitPending') : t('creationPanel.submit')} <span>→</span></button>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="tip"><b>{t('creationPanel.tipLabel')}</b>{' — '}{t('creationPanel.tipText')}</p>
    </>
  );

  return (
    <main className={`quest-shell ${THEME_CLASS[themeId]} atlas-calm`} ref={surface} aria-label={t('map.ariaLabel')}>
      <span className="q-star" aria-hidden="true" style={{ top: '14%', left: '22%', animationDelay: '0s' }} />
      <span className="q-star" aria-hidden="true" style={{ top: '68%', left: '78%', animationDelay: '.8s' }} />
      <span className="q-star" aria-hidden="true" style={{ top: '32%', left: '86%', animationDelay: '1.6s' }} />
      <span className="q-star" aria-hidden="true" style={{ top: '82%', left: '12%', animationDelay: '2.3s' }} />

      {hoveredNode && anchorScreenPoint && (
        <NodeAnchor
          x={anchorScreenPoint.x}
          y={anchorScreenPoint.y}
          variant="grow"
          label={t('anchor.addBranchLabel', { title: hoveredNode.data.title })}
          onActivate={() => branchDrag.startDrag(hoveredNode.id, anchorScreenPoint!)}
          onKeyboardActivate={() => branchDrag.openMenuAt(hoveredNode.id, anchorScreenPoint!)}
          onMouseEnter={() => showAnchorFor(hoveredNode.id)}
          onMouseLeave={() => scheduleHideAnchor()}
        />
      )}

      {dragState.status === 'menu-open' && (
        <BranchMenu
          x={dragState.menuPosition.x}
          y={dragState.menuPosition.y}
          existingOptions={graph.nodes.filter((node) => node.id !== dragState.sourceNodeId).map((node) => ({ id: node.id, title: node.data.title }))}
          onChoose={async (choice) => {
            const sourceNodeId = dragState.sourceNodeId;
            if (choice.kind === 'step') {
              await createStep(choice.title, sourceNodeId);
            }
            if (choice.kind === 'linked-goal') {
              selectNode(sourceNodeId);
              await createLinkedGoal(choice.title);
            }
            if (choice.kind === 'existing') await linkExisting(choice.nodeId, sourceNodeId);
            branchDrag.reset();
          }}
          onDismiss={() => branchDrag.reset()}
        />
      )}

      {objectives.length === 0 && (
        <div className="empty-state glass-panel" data-map-overlay>
          <p className="eyebrow">{t('emptyState.eyebrow')}</p>
          <h2>{t('emptyState.title')}</h2>
          <p className="panel-copy">{t('emptyState.description')}</p>
        </div>
      )}

      <ReactFlow
        className="quest-flow"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={(_, node) => selectNode(node.id)}
        onNodeMouseEnter={(_, node) => showAnchorFor(node.id)}
        onNodeMouseLeave={() => scheduleHideAnchor()}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.5}
        maxZoom={1.8}
        panOnDrag
        panOnScroll
        zoomOnScroll
        zoomOnPinch
        nodesDraggable={false}
        nodesFocusable={false}
        proOptions={{ hideAttribution: true }}
      >
        <MapMomentum surface={surface} />
        <Controls showInteractive={false} />
      </ReactFlow>

      <header className="topbar" data-map-overlay>
        <div className="brand-mark">Q</div>
        <div>
          <p className="eyebrow">{t('topbar.eyebrow')}</p>
          <h1>{spaceName}</h1>
        </div>
        <span className={`connection-pill ${source === 'api' ? 'api' : ''}`}>
          <i /> {source === 'api' ? t('topbar.apiConnected') : t('topbar.localMode')}
        </span>
        <ThemeSwitcher activeTheme={themeId} onSelect={setThemeId} />
      </header>

      {isMobile ? (
        <>
          <button type="button" className="fab" aria-label={t('map.createObjectiveFab')} onClick={() => setIsCreatePanelOpen(true)}>+</button>
          {isCreatePanelOpen && (
            <div className="fab-sheet" onClick={() => setIsCreatePanelOpen(false)}>
              <div className="fab-sheet-panel" onClick={(event) => event.stopPropagation()}>
                <aside className="creation-panel glass-panel bottom-sheet" data-map-overlay>
                  <div className="bottom-sheet-handle" />
                  {creationPanelContent}
                </aside>
              </div>
            </div>
          )}
        </>
      ) : (
        <aside className="creation-panel glass-panel" data-map-overlay>
          {creationPanelContent}
        </aside>
      )}

      {selectedNode && (() => {
        const node = selectedNode;
        const inspectorInnerContent = (
          <>
            <p className="eyebrow" style={{ color: node.data.color }}>{node.data.questTitle}</p>
            <div className="inspector-title">
              <span className="inspector-orb" style={{ background: node.data.color }} />
              <h2>{node.data.title}</h2>
            </div>
            <span className={`state-badge ${node.data.status}`}>{node.data.status === 'done' ? t('inspector.statusDone') : node.data.status === 'active' ? t('inspector.statusActive') : t('inspector.statusLocked')}</span>
            <p className="panel-copy">{t('inspector.description')}</p>
            <form className="step-form" onSubmit={submitStep}>
              <label htmlFor="step-title">{t('inspector.addStepLabel', { questTitle: node.data.questTitle })}</label>
              <input id="step-title" value={stepTitle} onChange={(event) => setStepTitle(event.target.value)} placeholder={t('inspector.addStepPlaceholder')} />
              <button type="submit" disabled={isCreatingStep}>{isCreatingStep ? t('inspector.submitPending') : t('inspector.submit')} <span>→</span></button>
            </form>
          </>
        );
        return isMobile ? (
          <aside className="inspector glass-panel bottom-sheet" data-map-overlay>
            <div className="bottom-sheet-handle" />
            {inspectorInnerContent}
          </aside>
        ) : (
          <aside className="inspector glass-panel" data-map-overlay>
            {inspectorInnerContent}
          </aside>
        );
      })()}

      <p className="map-hint" data-map-overlay>{t('map.hint')}</p>
    </main>
  );
}
