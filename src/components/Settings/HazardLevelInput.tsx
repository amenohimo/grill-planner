import { MIN_HAZARD_LEVEL, MAX_HAZARD_LEVEL } from '@/constants';

interface HazardLevelInputProps {
  value: number;
  onChange: (value: number) => void;
}

export function HazardLevelInput({ value, onChange }: HazardLevelInputProps) {
  const handleChange = (newValue: number) => {
    const clamped = Math.max(MIN_HAZARD_LEVEL, Math.min(MAX_HAZARD_LEVEL, newValue));
    onChange(clamped);
  };

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-text">キケン度:</label>
      <input
        type="number"
        min={MIN_HAZARD_LEVEL}
        max={MAX_HAZARD_LEVEL}
        value={value}
        onChange={(e) => handleChange(Number(e.target.value))}
        className="w-16 rounded-sm border border-border bg-surface px-2 py-1 text-sm text-text"
      />
      <span className="text-sm text-text-muted">%</span>
    </div>
  );
}
