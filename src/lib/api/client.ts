import type { QuestSpace } from '@/lib/map/graph';

export class QuestApiClient {
  constructor(private readonly baseUrl: string) {}

  async loadFirstMap(): Promise<QuestSpace> {
    const spaces = await this.getJson<Array<Pick<QuestSpace, 'id' | 'name'>>>('/spaces');
    const space = spaces[0];
    if (!space) {
      throw new Error('Aucun espace disponible');
    }

    return this.getJson<QuestSpace>(`/spaces/${space.id}/map`);
  }

  private async getJson<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`API indisponible (${response.status})`);
    }
    return response.json() as Promise<T>;
  }
}
