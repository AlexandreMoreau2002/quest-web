export type StepStatus = 'done' | 'active' | 'locked';

export interface QuestStep {
  id: string;
  title: string;
  status: StepStatus;
  parentStepId?: string | null;
}

export interface Quest {
  id: string;
  title: string;
  color?: string;
  steps: QuestStep[];
}

export interface QuestNodeData extends QuestStep, Record<string, unknown> {
  questId: string;
  questTitle: string;
  color: string;
  isObjective?: boolean;
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
  sourceHandle: 'source-left' | 'source-right';
  target: string;
  targetHandle: 'target-left' | 'target-right';
}

type Point = { x: number; y: number };

const ATLAS_FOCUS: Point = { x: 760, y: 480 };
const OBJECTIVE_WIDTH = 272;
const OBJECTIVE_HEIGHT = 132;
const CARD_GAP = 64;
const CARD_CLEARANCE = { x: OBJECTIVE_WIDTH + CARD_GAP, y: OBJECTIVE_HEIGHT + CARD_GAP };
const QUEST_COLORS = ['#b49cff', '#55d9bd', '#f6ae6e', '#7dd3fc', '#f9a8d4'];
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

function cardsOverlap(first: Point, second: Point): boolean {
  return Math.abs(first.x - second.x) < CARD_CLEARANCE.x
    && Math.abs(first.y - second.y) < CARD_CLEARANCE.y;
}

function findOpenPosition(position: Point, placedNodes: QuestGraphNode[]): Point {
  if (!placedNodes.some((node) => cardsOverlap(position, node.position))) {
    return position;
  }

  const directions = [
    { x: 1, y: 1 },
    { x: -1, y: 1 },
    { x: 1, y: -1 },
    { x: -1, y: -1 },
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  for (let ring = 1; ring <= 12; ring += 1) {
    for (const direction of directions) {
      const candidate = {
        x: position.x + direction.x * CARD_CLEARANCE.x * ring,
        y: position.y + direction.y * CARD_CLEARANCE.y * ring,
      };
      if (!placedNodes.some((node) => cardsOverlap(candidate, node.position))) {
        return candidate;
      }
    }
  }

  return position;
}

function projectPosition(anchor: Point, direction: Point, index: number, total: number): Point {
  const baseAngle = Math.atan2(direction.y, direction.x);
  const spread = (index - (total - 1) / 2) * 0.78;
  const radius = 410;
  return {
    x: Math.round(anchor.x + Math.cos(baseAngle + spread) * radius),
    y: Math.round(anchor.y + Math.sin(baseAngle + spread) * radius),
  };
}

export function buildQuestGraph(space: QuestSpace): {
  nodes: QuestGraphNode[];
  edges: QuestGraphEdge[];
} {
  const nodes: QuestGraphNode[] = [];
  const edges: QuestGraphEdge[] = [];
  const focusQuestIndex = Math.max(space.quests.findIndex((quest) => quest.steps.some((step) => step.status === 'active')), 0);

  space.quests.forEach((quest, questIndex) => {
    const layout = branchLayout(branchSlot(questIndex, focusQuestIndex));
    const anchor = {
      x: ATLAS_FOCUS.x + layout.offset.x,
      y: ATLAS_FOCUS.y + layout.offset.y,
    };
    const color = quest.color ?? QUEST_COLORS[questIndex % QUEST_COLORS.length]!;
    const objectiveNode: QuestGraphNode = {
      id: `objective-${quest.id}`,
      position: findOpenPosition(anchor, nodes),
      selected: nodes.length === 0,
      data: {
        id: `objective-${quest.id}`,
        title: quest.title,
        status: 'active',
        questId: quest.id,
        questTitle: space.name,
        color,
        isObjective: true,
      },
    };
    nodes.push(objectiveNode);

    // Steps attach to their actual parent (another step, via parentStepId) rather
    // than always to the objective — a step created by dragging a branch from
    // another step must connect to that step, not silently re-attach to the hub.
    const childrenByParentId = new Map<string | null, QuestStep[]>();
    quest.steps.forEach((step) => {
      const key = step.parentStepId ?? null;
      const siblings = childrenByParentId.get(key) ?? [];
      siblings.push(step);
      childrenByParentId.set(key, siblings);
    });

    type QueueEntry = { parentNode: QuestGraphNode; parentStepId: string | null };
    const queue: QueueEntry[] = [{ parentNode: objectiveNode, parentStepId: null }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { parentNode, parentStepId } = queue.shift()!;
      const children = childrenByParentId.get(parentStepId) ?? [];

      children.forEach((step, stepIndex) => {
        if (visited.has(step.id)) return; // guards against a corrupted/cyclic parentStepId
        visited.add(step.id);

        const position = projectPosition(parentNode.position, layout.direction, stepIndex, children.length);
        const node: QuestGraphNode = {
          id: step.id,
          position: findOpenPosition(position, nodes),
          selected: nodes.length === 0,
          data: {
            ...step,
            questId: quest.id,
            questTitle: quest.title,
            color,
          },
        };
        nodes.push(node);

        const flowsRight = parentNode.position.x <= node.position.x;
        edges.push({
          id: `edge-${parentNode.id}-${node.id}`,
          source: parentNode.id,
          sourceHandle: flowsRight ? 'source-right' : 'source-left',
          target: node.id,
          targetHandle: flowsRight ? 'target-left' : 'target-right',
        });

        queue.push({ parentNode: node, parentStepId: step.id });
      });
    }
  });

  return { nodes, edges };
}
