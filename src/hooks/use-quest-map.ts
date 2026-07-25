'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { QuestApiClient } from '@/lib/api/client';
import { fallbackSpace } from '@/lib/map/fallback';
import { buildQuestGraph, type Quest, type QuestSpace } from '@/lib/map/graph';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function useQuestMap() {
  const { t } = useTranslation();
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
        setError(t('errors.questNotSaved'));
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
  }, [source, space.id, space.quests.length, t]);

  const createStep = useCallback(async (title: string, parentNodeId?: string): Promise<boolean> => {
    const cleanTitle = title.trim();
    // Prefer an explicitly provided parent node (e.g. the card a branch was
    // dragged from) over the currently selected node, since `selectedId`
    // updates asynchronously and would otherwise still point at the
    // previous selection when this same event handler calls createStep.
    const targetNode = parentNodeId ? graph.nodes.find((node) => node.id === parentNodeId) : selectedNode;
    if (!cleanTitle || !targetNode) return false;

    const quest = space.quests.find((candidate) => candidate.id === targetNode.data.questId);
    if (!quest) return false;

    const parentStepId = targetNode.data.isObjective ? undefined : targetNode.id;

    if (source === 'api') {
      try {
        const newStep = await new QuestApiClient(API_URL).createStep(quest.id, {
          title: cleanTitle,
          order: quest.steps.length,
          parentStepId,
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
        setError(t('errors.stepNotSaved'));
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
  }, [selectedNode, source, space.quests, graph.nodes, t]);

  const reparentStep = useCallback(async (stepId: string, newParentQuestId: string): Promise<boolean> => {
    if (source !== 'api') {
      setError(t('errors.reparentRequiresApi'));
      return false;
    }
    try {
      await new QuestApiClient(API_URL).updateStep(stepId, { parentStepId: newParentQuestId });
      const refreshed = await new QuestApiClient(API_URL).loadFirstMap();
      setSpace(refreshed);
      setError(null);
      return true;
    } catch {
      setError(t('errors.reparentFailed'));
      return false;
    }
  }, [source, t]);

  const createLinkedGoal = useCallback((title: string) => createQuest(title, 'Première étape'), [createQuest]);

  const linkExisting = useCallback((existingNodeId: string, newParentNodeId: string) => reparentStep(existingNodeId, newParentNodeId), [reparentStep]);

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
    reparentStep,
    createLinkedGoal,
    linkExisting,
    source,
    error,
    spaceName: space.name,
  };
}
