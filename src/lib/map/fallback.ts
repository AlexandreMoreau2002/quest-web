import type { QuestSpace } from './graph';

export const fallbackSpace: QuestSpace = {
  id: 'local-atlas',
  name: 'L’atlas d’Alex',
  quests: [
    {
      id: 'forge',
      title: 'Forger une force calme',
      color: '#b49cff',
      steps: [
        { id: 'forge-1', title: 'Choisir le programme', status: 'done' },
        { id: 'forge-2', title: '3 séances régulières', status: 'active' },
        { id: 'forge-3', title: 'Valider le premier cycle', status: 'locked' },
      ],
    },
    {
      id: 'summit',
      title: 'Atteindre le sommet',
      color: '#55d9bd',
      steps: [
        { id: 'summit-1', title: 'Tracer l’itinéraire', status: 'done' },
        { id: 'summit-2', title: 'Sortie d’endurance', status: 'active' },
        { id: 'summit-3', title: 'Jour d’ascension', status: 'locked' },
      ],
    },
    {
      id: 'studio',
      title: 'Créer chaque semaine',
      color: '#f6ae6e',
      steps: [
        { id: 'studio-1', title: 'Installer le rituel', status: 'done' },
        { id: 'studio-2', title: 'Publier une note', status: 'active' },
      ],
    },
  ],
};
