export type StepStatus = 'done' | 'active' | 'locked';

export interface QuestStep {
  id: string;
  title: string;
  status: StepStatus;
}

export interface Quest {
  id: string;
  title: string;
  color: string;
  steps: QuestStep[];
}

export interface QuestNodeData extends QuestStep, Record<string, unknown> {
  questTitle: string;
  color: string;
}

export interface QuestSpace {
  id: string;
  name: string;
  quests: Quest[];
}

export interface QuestGraphNode {
  id: string;
  position: { x: number; y: number };
  selected: boolean;
  data: QuestNodeData;
}

export interface QuestGraphEdge {
  id: string;
  source: string;
  target: string;
}

export function buildQuestGraph(space: QuestSpace): {
  nodes: QuestGraphNode[];
  edges: QuestGraphEdge[];
} {
  const nodes: QuestGraphNode[] = [];
  const edges: QuestGraphEdge[] = [];

  space.quests.forEach((quest, questIndex) => {
    quest.steps.forEach((step, stepIndex) => {
      nodes.push({
        id: step.id,
        position: { x: 160 + stepIndex * 280, y: 180 + questIndex * 230 },
        selected: nodes.length === 0,
        data: { ...step, questTitle: quest.title, color: quest.color },
      });

      const previousStep = quest.steps[stepIndex - 1];
      if (previousStep) {
        edges.push({
          id: `edge-${previousStep.id}-${step.id}`,
          source: previousStep.id,
          target: step.id,
        });
      }
    });
  });

  return { nodes, edges };
}
