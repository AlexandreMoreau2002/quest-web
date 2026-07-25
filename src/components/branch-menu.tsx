'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export type BranchMenuChoice =
  | { kind: 'linked-goal'; title: string }
  | { kind: 'step'; title: string }
  | { kind: 'existing'; nodeId: string };

interface ExistingOption {
  id: string;
  title: string;
}

interface BranchMenuProps {
  x: number;
  y: number;
  existingOptions: ExistingOption[];
  onChoose: (choice: BranchMenuChoice) => void;
  onDismiss: () => void;
}

export function BranchMenu({ x, y, existingOptions, onChoose, onDismiss }: BranchMenuProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'menu' | 'linked-goal' | 'step' | 'existing'>('menu');
  const [title, setTitle] = useState('');
  const [search, setSearch] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Click-outside-to-dismiss. 'pointerdown' (not 'click') so it reacts as
  // soon as the user presses down elsewhere, matching how the menu itself
  // opened (on a pointerdown/keydown, not a full click). Attached in an
  // effect, which only runs after the gesture that opened the menu has
  // already finished, so it can't immediately dismiss itself.
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onDismiss();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [onDismiss]);

  const filteredOptions = existingOptions.filter((option) => option.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="branch-menu glass-panel" style={{ left: x, top: y }} data-map-overlay role="menu" ref={menuRef}>
      {mode === 'menu' && (
        <>
          <button type="button" onClick={() => setMode('linked-goal')}>{t('branchMenu.addLinkedGoal')}</button>
          <button type="button" onClick={() => setMode('step')}>{t('branchMenu.addStep')}</button>
          <button type="button" onClick={() => setMode('existing')}>{t('branchMenu.linkExisting')}</button>
        </>
      )}
      {(mode === 'linked-goal' || mode === 'step') && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!title.trim()) return;
            onChoose(mode === 'linked-goal' ? { kind: 'linked-goal', title: title.trim() } : { kind: 'step', title: title.trim() });
          }}
        >
          <label htmlFor="branch-menu-title">{mode === 'linked-goal' ? t('branchMenu.linkedGoalTitleLabel') : t('branchMenu.stepTitleLabel')}</label>
          <input id="branch-menu-title" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
          <button type="submit">{t('branchMenu.create')}</button>
        </form>
      )}
      {mode === 'existing' && (
        <>
          <label htmlFor="branch-menu-search">{t('branchMenu.searchLabel')}</label>
          <input id="branch-menu-search" value={search} onChange={(event) => setSearch(event.target.value)} autoFocus />
          {filteredOptions.map((option) => (
            <button key={option.id} type="button" onClick={() => onChoose({ kind: 'existing', nodeId: option.id })}>
              {option.title}
            </button>
          ))}
        </>
      )}
    </div>
  );
}
