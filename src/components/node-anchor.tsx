'use client';

interface NodeAnchorProps {
  x: number;
  y: number;
  variant: 'grow' | 'used';
  label: string;
  onActivate: () => void;
  onKeyboardActivate?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function NodeAnchor({ x, y, variant, label, onActivate, onKeyboardActivate, onMouseEnter, onMouseLeave }: NodeAnchorProps) {
  return (
    <button
      type="button"
      className={`node-anchor ${variant === 'grow' ? 'node-anchor--grow' : ''}`}
      style={{ left: x, top: y }}
      aria-label={label}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      // Start the drag on pointerdown, not click: 'click' only fires after
      // the mouse button has already been released, so by the time it ran
      // the drag had no real pointerdown->pointermove->pointerup sequence
      // left to track — it silently waited for an unrelated future pointerup
      // anywhere on the page to "end" it, which is what made this feel broken.
      onPointerDown={(event) => {
        event.preventDefault();
        console.debug('[NodeAnchor] pointerdown → startDrag', { x, y });
        onActivate();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          console.debug('[NodeAnchor] keydown → openMenuAt', { key: event.key, x, y });
          (onKeyboardActivate ?? onActivate)();
        }
      }}
    >
      {variant === 'grow' ? '+' : ''}
    </button>
  );
}
