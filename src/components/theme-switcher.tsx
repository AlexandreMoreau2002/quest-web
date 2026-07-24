'use client';

import type { ThemeId } from '@/hooks/use-theme';

const THEMES: { id: ThemeId; label: string }[] = [
  { id: 'nocturne', label: 'Atlas Nocturne' },
  { id: 'pirate', label: 'Pirate' },
  { id: 'futurist', label: 'Ville futuriste' },
];

interface ThemeSwitcherProps {
  activeTheme: ThemeId;
  onSelect: (theme: ThemeId) => void;
}

export function ThemeSwitcher({ activeTheme, onSelect }: ThemeSwitcherProps) {
  return (
    <div className="theme-switcher" role="group" aria-label="Choix du thème">
      {THEMES.map((theme) => (
        <button
          key={theme.id}
          type="button"
          className="theme-dot"
          data-theme={theme.id}
          aria-label={theme.label}
          aria-pressed={activeTheme === theme.id}
          onClick={() => onSelect(theme.id)}
        />
      ))}
    </div>
  );
}
