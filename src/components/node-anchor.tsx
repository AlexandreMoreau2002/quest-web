'use client';

interface NodeAnchorProps {
  x: number;
  y: number;
  variant: 'grow' | 'used';
  label: string;
  onActivate: () => void;
}

export function NodeAnchor({ x, y, variant, label, onActivate }: NodeAnchorProps) {
  return (
    <button
      type="button"
      className={`node-anchor ${variant === 'grow' ? 'node-anchor--grow' : ''}`}
      style={{ left: x, top: y }}
      aria-label={label}
      onClick={onActivate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onActivate();
        }
      }}
    >
      {variant === 'grow' ? '+' : ''}
    </button>
  );
}
