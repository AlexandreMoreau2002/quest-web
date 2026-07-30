export type NodeType = 'OBJECTIF' | 'ETAPE';
export type NodeStatus = 'active' | 'completed';

export interface SpaceNode {
  id: string;
  type: NodeType;
  title: string;
  description?: string | null;
  status: NodeStatus;
  validatedAt?: string | null;
  positionX: number;
  positionY: number;
}

export interface SpaceEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
}

export interface SpaceGraph {
  id: string;
  name: string;
  nodes: SpaceNode[];
  edges: SpaceEdge[];
}
