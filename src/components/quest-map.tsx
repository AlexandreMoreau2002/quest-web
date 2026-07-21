'use client';

import { useRef, useState, type FormEvent, type RefObject } from 'react';
import {
  Background,
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
    <div className={`quest-node status-${data.status} ${selected ? 'is-selected' : ''}`} style={{ '--quest-color': data.color } as React.CSSProperties}>
      <Handle type="target" position={Position.Left} className="node-handle" />
      <span className="node-orb" aria-hidden="true" />
      <span className="node-status">{data.status === 'done' ? 'Accompli' : data.status === 'active' ? 'En cours' : 'À venir'}</span>
      <strong>{data.title}</strong>
      <small>{data.questTitle}</small>
      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  );
}

const nodeTypes = { quest: QuestNode };

function MapMomentum({ surface }: { surface: RefObject<HTMLDivElement | null> }) {
  useMomentumPan(surface);
  return null;
}

export function QuestMap() {
  const { graph, selectedId, selectedNode, selectNode, createQuest, source, spaceName } = useQuestMap();
  const [title, setTitle] = useState('');
  const surface = useRef<HTMLDivElement>(null);

  const nodes: QuestFlowNode[] = graph.nodes.map((node) => ({
    ...node,
    type: 'quest',
    selected: node.id === selectedId,
  }));
  const edges: Edge[] = graph.edges.map((edge) => ({
    ...edge,
    animated: true,
    style: { stroke: '#8b7ad7', strokeWidth: 2, opacity: 0.72 },
  }));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createQuest(title);
    setTitle('');
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
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={1.8}
        panOnDrag
        panOnScroll
        zoomOnScroll
        zoomOnPinch
        proOptions={{ hideAttribution: true }}
      >
        <MapMomentum surface={surface} />
        <Background color="#9b8ae2" gap={32} size={1} className="map-grid" />
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
        <p className="eyebrow">NOUVELLE QUÊTE</p>
        <h2>Choisis un cap.</h2>
        <p className="panel-copy">Ajoute une nouvelle région à ton atlas personnel.</p>
        <form onSubmit={submit}>
          <label htmlFor="quest-title">Nom de la quête</label>
          <input id="quest-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex. Apprendre l’italien" />
          <button type="submit">Créer la quête <span>→</span></button>
        </form>
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
          <button className="secondary-button">Voir les détails <span>↗</span></button>
        </aside>
      )}

      <p className="map-hint" data-map-overlay>Carte vivante · clique une étape pour l’explorer</p>
    </main>
  );
}
