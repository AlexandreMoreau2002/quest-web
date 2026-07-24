import { describe, expect, it } from 'vitest';

import { buildQuestGraph } from './graph';

describe('buildQuestGraph', () => {
  it('renders the quest objective as a hub for its project steps', () => {
    const graph = buildQuestGraph({
      id: 'space-1',
      name: 'Revenus',
      quests: [
        {
          id: 'goal-1',
          title: 'Gagner beaucoup d’argent',
          color: '#a78bfa',
          steps: [
            { id: 'freelance', title: 'Développer mon activité freelance', status: 'active' },
            { id: 'cloudbreak', title: 'Lancer Cloudbreak', status: 'locked' },
          ],
        },
      ],
    });

    expect(graph.nodes).toContainEqual(expect.objectContaining({
      id: 'objective-goal-1',
      data: expect.objectContaining({ title: 'Gagner beaucoup d’argent', isObjective: true }),
    }));
    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'objective-goal-1', target: 'freelance' }),
      expect.objectContaining({ source: 'objective-goal-1', target: 'cloudbreak' }),
    ]));
  });

  it('keeps a clear card-sized gap between every generated step', () => {
    const graph = buildQuestGraph({
      id: 'space-1',
      name: 'Atlas',
      quests: Array.from({ length: 10 }, (_, index) => ({
        id: `quest-${index}`,
        title: `Quête ${index}`,
        color: '#a78bfa',
        steps: [
          { id: `step-${index}-a`, title: 'Préparer', status: 'done' as const },
          { id: `step-${index}-b`, title: 'Avancer', status: 'active' as const },
        ],
      })),
    });

    for (const [index, node] of graph.nodes.entries()) {
      for (const other of graph.nodes.slice(index + 1)) {
        expect(Math.abs(node.position.x - other.position.x) >= 274 || Math.abs(node.position.y - other.position.y) >= 168).toBe(true);
      }
    }
  });

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

    expect(graph.nodes).toHaveLength(3);
    expect(graph.nodes[0]).toMatchObject({ id: 'objective-quest-1', selected: true });
    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'edge-objective-quest-1-step-1',
        source: 'objective-quest-1',
        sourceHandle: 'source-right',
        target: 'step-1',
        targetHandle: 'target-left',
      }),
    ]));
  });

  it('anchors a leftward branch to the matching card boundaries', () => {
    const graph = buildQuestGraph({
      id: 'space-1',
      name: 'Ma quête',
      quests: [
        {
          id: 'quest-1',
          title: 'Lire',
          color: '#55d9bd',
          steps: [
            { id: 'step-1', title: 'Choisir un livre', status: 'locked' },
            { id: 'step-2', title: 'Lire le premier chapitre', status: 'locked' },
          ],
        },
        {
          id: 'quest-2',
          title: 'Courir',
          color: '#a78bfa',
          steps: [{ id: 'step-3', title: 'Sortie longue', status: 'active' }],
        },
      ],
    });

    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'objective-quest-1', target: 'step-1' }),
      expect.objectContaining({ source: 'objective-quest-1', target: 'step-2' }),
    ]));
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

    expect(positions['objective-quest-1']).toEqual({ x: 760, y: 480 });
    expect(positions['step-1']).not.toEqual(positions['step-2']);
    expect(positions['step-3']).not.toEqual(positions['step-2']);
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
    expect(first.nodes.find((node) => node.id === 'objective-quest-2')?.position).toEqual({ x: 360, y: 790 });
    expect(first.nodes.find((node) => node.id === 'objective-quest-1')?.position.y).not.toBe(first.nodes.find((node) => node.id === 'objective-quest-2')?.position.y);
  });

  it('connects a step to its actual parent step, not the objective, when parentStepId is set', () => {
    const graph = buildQuestGraph({
      id: 'space-1',
      name: 'Ma quête',
      quests: [
        {
          id: 'quest-1',
          title: 'Courir 10 km',
          color: '#a78bfa',
          steps: [
            { id: 'step-1', title: 'Choisir un plan', status: 'active' },
            { id: 'step-2', title: 'Sous-étape du plan', status: 'locked', parentStepId: 'step-1' },
          ],
        },
      ],
    });

    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'objective-quest-1', target: 'step-1' }),
      expect.objectContaining({ source: 'step-1', target: 'step-2' }),
    ]));
    expect(graph.edges).not.toContainEqual(expect.objectContaining({ source: 'objective-quest-1', target: 'step-2' }));
  });
});
