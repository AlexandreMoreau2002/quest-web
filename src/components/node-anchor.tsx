'use client';

interface NodeAnchorProps {
  x: number;
  y: number;
  variant: 'grow' | 'used';
  label: string;
  onActivate: () => void;
  onKeyboardActivate?: () => void;
}

export function NodeAnchor({ x, y, variant, label, onActivate, onKeyboardActivate }: NodeAnchorProps) {
  return (
    <button
      type="button"
      className={`node-anchor ${variant === 'grow' ? 'node-anchor--grow' : ''}`}
      style={{ left: x, top: y }}
      aria-label={label}
      onClick={(event) => {
        // A native <button> fires 'click' for both a real pointer click and
        // a keyboard Enter/Space activation (event.detail is 0 for the
        // latter). Keyboard use has no pointerup to end a click-drag with,
        // so it opens the branch menu directly instead of starting a drag.
        if (event.detail === 0) {
          (onKeyboardActivate ?? onActivate)();
        } else {
          onActivate();
        }
      }}
    >
      {variant === 'grow' ? '+' : ''}
    </button>
  );
}
