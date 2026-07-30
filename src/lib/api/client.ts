import type { NodeType, SpaceGraph, SpaceNode } from '@/lib/map/graph';

export type CreateNodeInput = {
  type: NodeType;
  title: string;
  description?: string;
  positionX?: number;
  positionY?: number;
};

export type UpdateNodeInput = {
  title?: string;
  description?: string;
  status?: SpaceNode['status'];
  positionX?: number;
  positionY?: number;
};

export type CreateEdgeInput = {
  sourceNodeId: string;
  targetNodeId: string;
};

export class QuestApiClient {
  constructor(private readonly baseUrl: string) {}

  async loadFirstSpace(): Promise<SpaceGraph> {
    const spaces = await this.getJson<Array<Pick<SpaceGraph, 'id' | 'name'>>>('/spaces');
    if (spaces.length === 0) {
      throw new Error('Aucun espace disponible');
    }
    return this.getJson<SpaceGraph>(`/spaces/${spaces[0]!.id}/graph`);
  }

  createNode(spaceId: string, input: CreateNodeInput): Promise<SpaceNode> {
    return this.sendJson<SpaceNode>(`/spaces/${spaceId}/nodes`, input);
  }

  updateNode(nodeId: string, input: UpdateNodeInput): Promise<SpaceNode> {
    return this.patchJson<SpaceNode>(`/nodes/${nodeId}`, input);
  }

  async deleteNode(nodeId: string): Promise<void> {
    await this.deleteRequest(`/nodes/${nodeId}`);
  }

  validateObjectif(nodeId: string): Promise<SpaceNode> {
    return this.sendJson<SpaceNode>(`/nodes/${nodeId}/validate`, {});
  }

  progressFor(nodeId: string): Promise<{ percent: number; totalAncestors: number; completedAncestors: number }> {
    return this.getJson(`/nodes/${nodeId}/progress`);
  }

  createEdge(spaceId: string, input: CreateEdgeInput): Promise<{ id: string; sourceNodeId: string; targetNodeId: string }> {
    return this.sendJson(`/spaces/${spaceId}/edges`, input);
  }

  async deleteEdge(edgeId: string): Promise<void> {
    await this.deleteRequest(`/edges/${edgeId}`);
  }

  private async getJson<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`API indisponible (${response.status})`);
    }
    return response.json() as Promise<T>;
  }

  private async sendJson<T>(path: string, body: object): Promise<T> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Création impossible (${response.status})`);
    }
    return response.json() as Promise<T>;
  }

  private async patchJson<T>(path: string, body: object): Promise<T> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Mise à jour impossible (${response.status})`);
    }
    return response.json() as Promise<T>;
  }

  private async deleteRequest(path: string): Promise<void> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, { method: 'DELETE' });
    if (!response.ok) {
      throw new Error(`Suppression impossible (${response.status})`);
    }
  }
}
