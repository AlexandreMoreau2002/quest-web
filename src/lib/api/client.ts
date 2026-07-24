import type { Quest, QuestSpace, QuestStep } from '@/lib/map/graph';

export type CreateQuestInput = {
  title: string;
  description?: string;
  steps: string[];
};

export type CreateStepInput = {
  title: string;
  order?: number;
};

export type UpdateStepInput = {
  title?: string;
  status?: QuestStep['status'];
  parentStepId?: string;
  order?: number;
};

export class QuestApiClient {
  constructor(private readonly baseUrl: string) {}

  async loadFirstMap(): Promise<QuestSpace> {
    const spaces = await this.getJson<Array<Pick<QuestSpace, 'id' | 'name'>>>('/spaces');
    if (spaces.length === 0) {
      throw new Error('Aucun espace disponible');
    }

    let firstMap: QuestSpace | undefined;
    for (const space of spaces) {
      const map = await this.getJson<QuestSpace>(`/spaces/${space.id}/map`);
      firstMap ??= map;
      if (map.quests.length > 0) return map;
    }
    return firstMap!;
  }

  createQuest(spaceId: string, input: CreateQuestInput): Promise<Quest> {
    return this.sendJson<Quest>(`/spaces/${spaceId}/quests`, input);
  }

  createStep(questId: string, input: CreateStepInput): Promise<QuestStep> {
    return this.sendJson<QuestStep>(`/quests/${questId}/steps`, input);
  }

  updateStep(stepId: string, input: UpdateStepInput): Promise<QuestStep> {
    return this.patchJson<QuestStep>(`/steps/${stepId}`, input);
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
}
