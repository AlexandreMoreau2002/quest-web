import { describe, expect, it } from 'vitest';

import { buildQuestGraph } from './graph';

describe('buildQuestGraph', () => {
  it('turns quest steps into connected flow nodes with a selected first step', () => {
    const graph = buildQuestGraph({
      id: 'space-1',
      name: 'Ma quête',
      quests: [
        {
          id: 'quest-1',
          title: 'Courir 10 km',
          color: '#a78bfa',
          steps: [
            { id: 'step-1', title: 'Choisir un plan', status: 'done' },
            { id: 'step-2', title: 'Sortie longue', status: 'active' },
          ],
        },
      ],
    });

    expect(graph.nodes).toHaveLength(2);
    expect(graph.nodes[0]).toMatchObject({ id: 'step-1', selected: true });
    expect(graph.edges).toEqual([
      expect.objectContaining({ id: 'edge-step-1-step-2', source: 'step-1', target: 'step-2' }),
    ]);
  });
});
