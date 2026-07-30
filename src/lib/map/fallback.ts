import type { SpaceGraph } from './graph';

export const fallbackSpace: SpaceGraph = {
  id: 'local-atlas',
  name: 'L\'atlas d\'Alex',
  nodes: [
    { id: 'main', type: 'OBJECTIF', title: 'Gagner beaucoup d\'argent', status: 'active', positionX: 640, positionY: 80 },
    { id: 'freelance', type: 'OBJECTIF', title: 'Développer mon activité freelance', status: 'active', positionX: 160, positionY: 360 },
    { id: 'signer-clients', type: 'ETAPE', title: 'Signer 3 clients récurrents', status: 'active', positionX: 160, positionY: 600 },
    { id: 'cloudbreak', type: 'OBJECTIF', title: 'Lancer Cloudbreak', status: 'active', positionX: 640, positionY: 360 },
    { id: 'epargne-3000', type: 'ETAPE', title: 'Épargner 3 000 € de trésorerie', status: 'active', positionX: 900, positionY: 600 },
    { id: 'achat-revente', type: 'OBJECTIF', title: 'Démarrer l\'achat-revente de voitures', status: 'active', positionX: 1120, positionY: 360 },
  ],
  edges: [
    { id: 'e-freelance-main', sourceNodeId: 'freelance', targetNodeId: 'main' },
    { id: 'e-cloudbreak-main', sourceNodeId: 'cloudbreak', targetNodeId: 'main' },
    { id: 'e-achat-main', sourceNodeId: 'achat-revente', targetNodeId: 'main' },
    { id: 'e-signer-freelance', sourceNodeId: 'signer-clients', targetNodeId: 'freelance' },
    { id: 'e-epargne-cloudbreak', sourceNodeId: 'epargne-3000', targetNodeId: 'cloudbreak' },
    { id: 'e-epargne-achat', sourceNodeId: 'epargne-3000', targetNodeId: 'achat-revente' },
  ],
};
