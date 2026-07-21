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

type Point = { x: number; y: number };

const ATLAS_FOCUS: Point = { x: 760, y: 480 };
const BRANCH_LAYOUTS: Array<{ offset: Point; direction: Point }> = [
  { offset: { x: 0, y: 0 }, direction: { x: 350, y: 220 } },
  { offset: { x: -400, y: 310 }, direction: { x: -250, y: 250 } },
  { offset: { x: 420, y: -300 }, direction: { x: 300, y: -220 } },
  { offset: { x: -470, y: -300 }, direction: { x: -300, y: -210 } },
  { offset: { x: 490, y: 290 }, direction: { x: 280, y: 240 } },
];

function branchLayout(slot: number): { offset: Point; direction: Point } {
  const knownLayout = BRANCH_LAYOUTS[slot];
  if (knownLayout) return knownLayout;

  const angle = ((slot - 1) * 137.5 * Math.PI) / 180;
  return {
    offset: { x: Math.round(Math.cos(angle) * 620), y: Math.round(Math.sin(angle) * 470) },
    direction: { x: Math.round(Math.cos(angle) * 290), y: Math.round(Math.sin(angle) * 230) },
  };
}

function branchSlot(questIndex: number, focusQuestIndex: number): number {
  if (questIndex === focusQuestIndex) return 0;
  return questIndex < focusQuestIndex ? questIndex + 1 : questIndex;
}

export function buildQuestGraph(space: QuestSpace): {
  nodes: QuestGraphNode[];
  edges: QuestGraphEdge[];
} {
  const nodes: QuestGraphNode[] = [];
  const edges: QuestGraphEdge[] = [];
  const focusQuestIndex = Math.max(space.quests.findIndex((quest) => quest.steps.some((step) => step.status === 'active')), 0);

  space.quests.forEach((quest, questIndex) => {
    const activeStepIndex = Math.max(quest.steps.findIndex((step) => step.status === 'active'), 0);
    const layout = branchLayout(branchSlot(questIndex, focusQuestIndex));
    const anchor = {
      x: ATLAS_FOCUS.x + layout.offset.x,
      y: ATLAS_FOCUS.y + layout.offset.y,
    };

    quest.steps.forEach((step, stepIndex) => {
      const distance = stepIndex - activeStepIndex;
      const position = distance === 0
        ? anchor
        : {
            x: anchor.x + layout.direction.x * distance + (distance < 0 ? 10 : 0),
            y: anchor.y + layout.direction.y * distance,
          };

      nodes.push({
        id: step.id,
        position,
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
