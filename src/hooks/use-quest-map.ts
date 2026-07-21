'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { QuestApiClient } from '@/lib/api/client';
import { fallbackSpace } from '@/lib/map/fallback';
import { buildQuestGraph, type Quest, type QuestSpace } from '@/lib/map/graph';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function useQuestMap() {
  const [space, setSpace] = useState<QuestSpace>(fallbackSpace);
  const [source, setSource] = useState<'local' | 'api'>('local');
  const [selectedId, setSelectedId] = useState(fallbackSpace.quests[0]?.steps[0]?.id ?? '');

  useEffect(() => {
    let active = true;
    const client = new QuestApiClient(API_URL);
    client
      .loadFirstMap()
      .then((apiSpace) => {
        if (!active) return;
        setSpace(apiSpace);
        setSelectedId(apiSpace.quests[0]?.steps[0]?.id ?? '');
        setSource('api');
      })
      .catch(() => {
        // The interactive demo remains useful before the Nest API is running.
      });

    return () => {
      active = false;
    };
  }, []);

  const graph = useMemo(() => buildQuestGraph(space), [space]);
  const selectedNode = graph.nodes.find((node) => node.id === selectedId) ?? graph.nodes[0];

  const createQuest = useCallback((title: string) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    const id = `local-${Date.now()}`;
    const newQuest: Quest = {
      id,
      title: cleanTitle,
      color: ['#7dd3fc', '#f9a8d4', '#c4b5fd'][space.quests.length % 3],
      steps: [{ id: `${id}-step-1`, title: 'Définir la première étape', status: 'active' }],
    };

    setSpace((current) => ({ ...current, quests: [...current.quests, newQuest] }));
    setSelectedId(newQuest.steps[0].id);
    setSource('local');
  }, [space.quests.length]);

  return { graph, selectedId, selectedNode, selectNode: setSelectedId, createQuest, source, spaceName: space.name };
}
