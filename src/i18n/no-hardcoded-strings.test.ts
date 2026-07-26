import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const MIGRATED_FILES = [
  'src/components/quest-map.tsx',
  'src/hooks/use-quest-map.ts',
];

const FORBIDDEN_LITERALS = [
  'EXPÉDITION ACTIVE',
  'Créer l’objectif',
  'Ajouter l’étape',
  'CARTE VIDE',
  'Ajouter un objectif lié',
  'La quête n’a pas été enregistrée',
];

describe('no hardcoded strings regression guard', () => {
  it.each(MIGRATED_FILES)('%s does not contain any known-migrated literal string', (relativePath) => {
    const content = readFileSync(join(process.cwd(), relativePath), 'utf-8');
    for (const literal of FORBIDDEN_LITERALS) {
      expect(content).not.toContain(literal);
    }
  });
});
