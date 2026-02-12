import type { DisplayMode } from '@/types';
import { ButtonGroup } from '@/components/ButtonGroup';

interface DisplayModeToggleProps {
  value: DisplayMode;
  onChange: (mode: DisplayMode) => void;
}

const modes = [
  { value: 'icon' as const, label: 'アイコン' },
  { value: 'text' as const, label: 'テキスト' },
  { value: 'both' as const, label: '両方' },
];

export function DisplayModeToggle({ value, onChange }: DisplayModeToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-text-muted">表示:</span>
      <ButtonGroup options={modes} selected={value} onChange={onChange} />
    </div>
  );
}
