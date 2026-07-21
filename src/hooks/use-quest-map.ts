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
  const [selectedQuestId, setSelectedQuestId] = useState(fallbackSpace.quests[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const client = new QuestApiClient(API_URL);
    client
      .loadFirstMap()
      .then((apiSpace) => {
        if (!active) return;
        setSpace(apiSpace);
        setSelectedId(apiSpace.quests[0]?.steps[0]?.id ?? '');
        setSelectedQuestId(apiSpace.quests[0]?.id ?? '');
        setSource('api');
      })
      .catch(() => {
        // The interactive demo remains useful before the Nest API is running.
      });

    return () => {
      active = false;
    };
  }, []);

  const visibleSpace = useMemo(() => ({
    ...space,
    quests: space.quests.filter((quest) => quest.id === selectedQuestId),
  }), [selectedQuestId, space]);
  const graph = useMemo(() => buildQuestGraph(visibleSpace), [visibleSpace]);
  const selectedNode = graph.nodes.find((node) => node.id === selectedId) ?? graph.nodes[0];

  const createQuest = useCallback(async (title: string, firstStepTitle: string): Promise<boolean> => {
    const cleanTitle = title.trim();
    const cleanStepTitle = firstStepTitle.trim() || 'Définir la première étape';
    if (!cleanTitle) return false;

    if (source === 'api') {
      try {
        const newQuest = await new QuestApiClient(API_URL).createQuest(space.id, {
          title: cleanTitle,
          steps: [cleanStepTitle],
        });
        setSpace((current) => ({ ...current, quests: [...current.quests, newQuest] }));
        setSelectedId(newQuest.steps[0]?.id ?? '');
        setSelectedQuestId(newQuest.id);
        setError(null);
        return true;
      } catch {
        setError('La quête n’a pas été enregistrée. Vérifie que l’API est bien lancée.');
        return false;
      }
    }

    const id = `local-${Date.now()}`;
    const newQuest: Quest = {
      id,
      title: cleanTitle,
      color: ['#7dd3fc', '#f9a8d4', '#c4b5fd'][space.quests.length % 3],
      steps: [{ id: `${id}-step-1`, title: cleanStepTitle, status: 'active' }],
    };

    setSpace((current) => ({ ...current, quests: [...current.quests, newQuest] }));
    setSelectedId(newQuest.steps[0].id);
    setSelectedQuestId(newQuest.id);
    setError(null);
    return true;
  }, [source, space.id, space.quests.length]);

  const createStep = useCallback(async (title: string): Promise<boolean> => {
    const cleanTitle = title.trim();
    if (!cleanTitle || !selectedNode) return false;

    const quest = space.quests.find((candidate) => candidate.id === selectedNode.data.questId);
    if (!quest) return false;

    if (source === 'api') {
      try {
        const newStep = await new QuestApiClient(API_URL).createStep(quest.id, {
          title: cleanTitle,
          order: quest.steps.length,
        });
        setSpace((current) => ({
          ...current,
          quests: current.quests.map((candidate) => candidate.id === quest.id
            ? { ...candidate, steps: [...candidate.steps, newStep] }
            : candidate),
        }));
        setSelectedId(newStep.id);
        setError(null);
        return true;
      } catch {
        setError('L’étape n’a pas été enregistrée. Réessaie dans un instant.');
        return false;
      }
    }

    const newStep = { id: `local-step-${Date.now()}`, title: cleanTitle, status: 'locked' as const };
    setSpace((current) => ({
      ...current,
      quests: current.quests.map((candidate) => candidate.id === quest.id
        ? { ...candidate, steps: [...candidate.steps, newStep] }
        : candidate),
    }));
    setSelectedId(newStep.id);
    setError(null);
    return true;
  }, [selectedNode, source, space.quests]);

  return {
    graph,
    selectedId,
    selectedNode,
    selectNode: setSelectedId,
    selectedQuestId,
    selectQuest: (questId: string) => {
      setSelectedQuestId(questId);
      setSelectedId(`objective-${questId}`);
    },
    objectives: space.quests.map((quest) => ({ id: quest.id, title: quest.title })),
    createQuest,
    createStep,
    source,
    error,
    spaceName: space.name,
  };
}
