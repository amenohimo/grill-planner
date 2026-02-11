import type { DisplayMode } from '@/types';

interface DisplayModeToggleProps {
  value: DisplayMode;
  onChange: (mode: DisplayMode) => void;
}

const modes: { value: DisplayMode; label: string }[] = [
  { value: 'icon', label: 'アイコン' },
  { value: 'text', label: 'テキスト' },
  { value: 'both', label: '両方' },
];

export function DisplayModeToggle({ value, onChange }: DisplayModeToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-text-muted">表示:</span>
      {modes.map((mode) => (
        <button
          key={mode.value}
          onClick={() => onChange(mode.value)}
          className={`rounded-sm px-2 py-0.5 text-xs ${
            value === mode.value
              ? 'bg-primary text-white'
              : 'border border-border bg-surface text-text hover:bg-bg'
          }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
