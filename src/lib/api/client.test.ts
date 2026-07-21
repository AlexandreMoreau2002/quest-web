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
});
