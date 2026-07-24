'use client';

import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import {
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useQuestMap } from '@/hooks/use-quest-map';
import { useMomentumPan } from '@/hooks/use-momentum-pan';
import { useBranchDrag } from '@/hooks/use-branch-drag';
import { QuestEdge } from '@/components/quest-edge';
import { NodeAnchor } from '@/components/node-anchor';
import { BranchMenu } from '@/components/branch-menu';
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
      <span className="node-status">{data.isObjective ? 'Objectif' : data.status === 'done' ? 'Accompli' : data.status === 'active' ? 'En cours' : 'À venir'}</span>
      <strong>{data.title}</strong>
      <small className="node-description">{data.isObjective ? `Espace · ${data.questTitle}` : data.questTitle}</small>
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
  const branchDrag = useBranchDrag();
  const surface = useRef<HTMLDivElement>(null);

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

  return (
    <main className="quest-shell qt-nocturne atlas-calm" ref={surface} aria-label="Carte de quête">
      <span className="q-star" aria-hidden="true" style={{ top: '14%', left: '22%', animationDelay: '0s' }} />
      <span className="q-star" aria-hidden="true" style={{ top: '68%', left: '78%', animationDelay: '.8s' }} />
      <span className="q-star" aria-hidden="true" style={{ top: '32%', left: '86%', animationDelay: '1.6s' }} />
      <span className="q-star" aria-hidden="true" style={{ top: '82%', left: '12%', animationDelay: '2.3s' }} />

      {hoveredNode && anchorPoint && (
        <NodeAnchor
          x={anchorPoint.x}
          y={anchorPoint.y}
          variant="grow"
          label={`Ajouter une branche depuis ${hoveredNode.data.title}`}
          onActivate={() => branchDrag.startDrag(hoveredNode.id, anchorPoint!)}
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
              selectNode(sourceNodeId);
              await createStep(choice.title);
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
          <p className="eyebrow">CARTE VIDE</p>
          <h2>Aucun objectif pour l&rsquo;instant.</h2>
          <p className="panel-copy">Crée ton premier objectif dans le panneau à gauche pour commencer à explorer.</p>
        </div>
      )}

      <ReactFlow
        className="quest-flow"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={(_, node) => selectNode(node.id)}
        onNodeMouseEnter={(_, node) => setHoveredId(node.id)}
        onNodeMouseLeave={() => setHoveredId(null)}
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
          <p className="eyebrow">EXPÉDITION ACTIVE</p>
          <h1>{spaceName}</h1>
        </div>
        <span className={`connection-pill ${source === 'api' ? 'api' : ''}`}>
          <i /> {source === 'api' ? 'API connectée' : 'Mode exploration'}
        </span>
      </header>

      <aside className="creation-panel glass-panel" data-map-overlay>
        <p className="eyebrow">OBJECTIF AFFICHÉ</p>
        <h2>Choisis un cap.</h2>
        <p className="panel-copy">Explore un objectif à la fois, puis ajoute ses étapes sur la carte.</p>
        <label htmlFor="objective-selector">Objectif</label>
        <select id="objective-selector" value={selectedQuestId} onChange={(event) => selectQuest(event.target.value)}>
          {objectives.map((objective) => <option key={objective.id} value={objective.id}>{objective.title}</option>)}
        </select>
        <form onSubmit={submit}>
          <label htmlFor="quest-title">Nouvel objectif</label>
          <input id="quest-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex. Apprendre l’italien" />
          <label htmlFor="first-step-title">Premier projet ou étape</label>
          <input id="first-step-title" value={firstStepTitle} onChange={(event) => setFirstStepTitle(event.target.value)} placeholder="Ex. Choisir une méthode" />
          <button type="submit" disabled={isCreatingQuest}>{isCreatingQuest ? 'Création…' : 'Créer l’objectif'} <span>→</span></button>
        </form>
        {error && <p className="form-error" role="alert">{error}</p>}
        <p className="tip"><b>Astuce</b> — fais glisser la carte, pince pour zoomer.</p>
      </aside>

      {selectedNode && (
        <aside className="inspector glass-panel" data-map-overlay>
          <p className="eyebrow" style={{ color: selectedNode.data.color }}>{selectedNode.data.questTitle}</p>
          <div className="inspector-title">
            <span className="inspector-orb" style={{ background: selectedNode.data.color }} />
            <h2>{selectedNode.data.title}</h2>
          </div>
          <span className={`state-badge ${selectedNode.data.status}`}>{selectedNode.data.status === 'done' ? 'Accompli' : selectedNode.data.status === 'active' ? 'En cours' : 'Verrouillé'}</span>
          <p className="panel-copy">Cette étape donne une direction concrète à ta progression. Choisis le prochain geste, puis avance.</p>
          <form className="step-form" onSubmit={submitStep}>
            <label htmlFor="step-title">Ajouter une étape à « {selectedNode.data.questTitle} »</label>
            <input id="step-title" value={stepTitle} onChange={(event) => setStepTitle(event.target.value)} placeholder="Ex. Préparer le premier test" />
            <button type="submit" disabled={isCreatingStep}>{isCreatingStep ? 'Création…' : 'Ajouter l’étape'} <span>→</span></button>
          </form>
        </aside>
      )}

      <p className="map-hint" data-map-overlay>Carte vivante · clique une étape pour l’explorer</p>
    </main>
  );
}
