'use client';

import { useRef, useState, type FormEvent, type RefObject } from 'react';
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
import type { QuestGraphNode } from '@/lib/map/graph';

type QuestFlowNode = Node<QuestGraphNode['data']>;

function QuestNode({ data, selected }: NodeProps<QuestFlowNode>) {
  return (
    <div className={`quest-node status-${data.status} ${data.isObjective ? 'is-objective' : ''} ${selected ? 'is-selected' : ''}`} style={{ '--quest-color': data.color } as React.CSSProperties}>
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

function MapMomentum({ surface }: { surface: RefObject<HTMLDivElement | null> }) {
  useMomentumPan(surface);
  return null;
}

export function QuestMap() {
  const {
    graph, selectedId, selectedNode, selectNode, selectedQuestId, selectQuest, objectives,
    createQuest, createStep, source, error, spaceName,
  } = useQuestMap();
  const [title, setTitle] = useState('');
  const [firstStepTitle, setFirstStepTitle] = useState('');
  const [stepTitle, setStepTitle] = useState('');
  const [isCreatingQuest, setIsCreatingQuest] = useState(false);
  const [isCreatingStep, setIsCreatingStep] = useState(false);
  const surface = useRef<HTMLDivElement>(null);

  const nodes: QuestFlowNode[] = graph.nodes.map((node) => ({
    ...node,
    type: 'quest',
    selected: node.id === selectedId,
  }));
  const edges: Edge[] = graph.edges.map((edge) => ({
    ...edge,
    type: 'straight',
    className: 'quest-edge',
    style: { stroke: '#9b89ec', strokeWidth: 2, strokeDasharray: '7 9', opacity: 0.8 },
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
    <main className="quest-shell" ref={surface} aria-label="Carte de quête">
      <ReactFlow
        className="quest-flow"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => selectNode(node.id)}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.5}
        maxZoom={1.8}
        panOnDrag
        panOnScroll
        zoomOnScroll
        zoomOnPinch
        nodesDraggable={false}
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
