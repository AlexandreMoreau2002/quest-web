# CLAUDE.md — Quest Web

Lire `../CLAUDE.md` et `../rules/quality.md` avant de travailler.

## Stack et commandes attendues

- Next.js, React, TypeScript et React Flow.
- `npm run dev`, `npm run test`, `npm run lint`, `npm run build` doivent être décrits dans `README.md`.

## Règles frontend

- Aucun appel HTTP direct dans un composant de présentation : utiliser le client API et un hook ou provider dédié.
- Garder les données de carte, les calculs de graphes et l’inertie de pan dans des modules distincts.
- Les panneaux superposés à la carte portent `data-map-overlay` pour ne jamais déclencher un déplacement.
- Chaque story web crée `docs/story-<id>-<slug>.md` et sa recette manuelle racine.
