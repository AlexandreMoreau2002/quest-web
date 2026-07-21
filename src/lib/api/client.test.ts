import { afterEach, describe, expect, it, vi } from 'vitest';

import { QuestApiClient } from './client';

describe('QuestApiClient', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('loads the first available space and its map from the configured API', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 'space-a', name: 'Vie' }]), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: 'space-a', name: 'Vie', quests: [] }),
          { status: 200 },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    const map = await new QuestApiClient('http://localhost:3001').loadFirstMap();

    expect(map).toMatchObject({ id: 'space-a', name: 'Vie' });
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://localhost:3001/spaces', { cache: 'no-store' });
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://localhost:3001/spaces/space-a/map', {
      cache: 'no-store',
    });
  });

  it('creates a quest in the selected space through the API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'quest-a',
          title: 'Lancer Quest',
          description: null,
          steps: [{ id: 'step-a', title: 'Définir le MVP', status: 'active' }],
        }),
        { status: 201 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await new QuestApiClient('http://localhost:3001').createQuest('space-a', {
      title: 'Lancer Quest',
      steps: ['Définir le MVP'],
    });

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/spaces/space-a/quests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Lancer Quest', steps: ['Définir le MVP'] }),
    });
  });
});
