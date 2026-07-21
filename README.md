# Quest Web

La carte interactive Quest. Elle affiche un atlas plein écran, permet de créer une quête locale et prépare la lecture de l’API NestJS.

## Démarrer

```bash
cp .env.example .env.local
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000). L’API est configurée avec `NEXT_PUBLIC_API_URL` et utilise `http://localhost:3001` par défaut.

Tant que l’API n’est pas disponible, l’interface affiche automatiquement un atlas de démonstration local ; elle reste donc explorabile sans service backend.

## Commandes

```bash
npm run dev       # serveur de développement
npm run test      # tests Vitest
npm run lint      # ESLint
npm run build     # build de production Next.js
npm run validate  # tests + lint + build
```

## Contrat de lecture API

Au chargement, le client tente successivement :

1. `GET /spaces`
2. `GET /spaces/:spaceId/map` pour le premier espace retourné

Les appels HTTP sont concentrés dans `src/lib/api/client.ts`; les composants de rendu ne communiquent pas directement avec l’API.

## Vérification manuelle rapide

- Faites glisser le fond vide : la carte se déplace puis conserve une légère inertie.
- Utilisez molette, pincement ou les contrôles pour zoomer.
- Cliquez un nœud : l’inspecteur de droite se met à jour.
- Créez une quête depuis le panneau gauche : sa première étape apparaît immédiatement.
- Interagissez avec les panneaux : aucun déplacement de carte ne doit partir de ces zones.
