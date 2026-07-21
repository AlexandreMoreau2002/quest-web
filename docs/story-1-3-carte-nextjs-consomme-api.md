# Story 1.3 — Carte Next.js consomme API

## Portée livrée

- Application Next.js TypeScript avec carte React Flow en plein viewport.
- Fond dégradé étoilé, création locale de quête à gauche et inspecteur de sélection à droite.
- Déplacement, zoom molette/pinch/contrôles et inertie amortie après un drag rapide.
- Client API configurable par `NEXT_PUBLIC_API_URL`, lisant `GET /spaces` puis `GET /spaces/:spaceId/map`.
- Atlas local de secours quand l’API est indisponible.

## Structure

- `src/lib/api/client.ts` : contrat HTTP de lecture.
- `src/lib/map/graph.ts` : transformation `Space → nodes + edges` testée.
- `src/hooks/use-quest-map.ts` : chargement API et état de carte.
- `src/hooks/use-momentum-pan.ts` : inertie, séparée du rendu.
- `src/components/quest-map.tsx` : composition visuelle de la carte.

## Vérification

`npm run validate` exécute les tests, ESLint et le build Next.js.
