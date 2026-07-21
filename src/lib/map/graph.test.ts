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

  it('places the first active step at the atlas focus and fans its branch out diagonally', () => {
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
            { id: 'step-3', title: 'Course cible', status: 'locked' },
          ],
        },
      ],
    });

    const positions = Object.fromEntries(graph.nodes.map((node) => [node.id, node.position]));

    expect(positions['step-2']).toEqual({ x: 760, y: 480 });
    expect(positions['step-1']).toEqual({ x: 420, y: 260 });
    expect(positions['step-3']).toEqual({ x: 1110, y: 700 });
  });

  it('uses stable, offset branch anchors instead of aligned quest rows', () => {
    const space = {
      id: 'space-1',
      name: 'Ma quête',
      quests: [
        {
          id: 'quest-1',
          title: 'Courir 10 km',
          color: '#a78bfa',
          steps: [{ id: 'step-1', title: 'Sortie longue', status: 'active' as const }],
        },
        {
          id: 'quest-2',
          title: 'Lire',
          color: '#55d9bd',
          steps: [{ id: 'step-2', title: 'Choisir un livre', status: 'active' as const }],
        },
      ],
    };

    const first = buildQuestGraph(space);
    const second = buildQuestGraph(space);

    expect(first.nodes).toEqual(second.nodes);
    expect(first.nodes[1].position).toEqual({ x: 360, y: 790 });
    expect(first.nodes[0].position.y).not.toBe(first.nodes[1].position.y);
  });
});
