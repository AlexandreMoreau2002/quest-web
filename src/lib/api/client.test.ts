import { describe, expect, it, vi } from 'vitest';
import { QuestApiClient } from './client';

describe('QuestApiClient', () => {
  it('creates a node against the space nodes endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'node-1' }) });
    vi.stubGlobal('fetch', fetchMock);

    const client = new QuestApiClient('http://api.test');
    await client.createNode('space-1', { type: 'ETAPE', title: 'Test' });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/spaces/space-1/nodes',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('creates an edge against the space edges endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'edge-1' }) });
    vi.stubGlobal('fetch', fetchMock);

    const client = new QuestApiClient('http://api.test');
    await client.createEdge('space-1', { sourceNodeId: 'a', targetNodeId: 'b' });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/spaces/space-1/edges',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('deletes an edge with a DELETE request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const client = new QuestApiClient('http://api.test');
    await client.deleteEdge('edge-1');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/edges/edge-1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
