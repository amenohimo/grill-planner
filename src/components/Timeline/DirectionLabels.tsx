import { useState, useCallback, useRef, type MouseEvent } from 'react';
import type { DirectionSetting } from '@/types';
import { frameToPixelY, TIMELINE_HEIGHT, DIRECTION_LABEL_WIDTH, getDirectionColorMap } from './coordinates';

const PRESET_NAMES = ['左', '正面', '右'] as const;

interface DirectionLabelsProps {
  directions: readonly DirectionSetting[];
  onUpdateName?: (index: number, name: string) => void;
}

export function DirectionLabels({ directions, onUpdateName }: DirectionLabelsProps) {
  const sortedDirs = directions
    .map((dir, originalIndex) => ({ ...dir, originalIndex }))
    .sort((a, b) => b.frameTime - a.frameTime);
  const colorMap = getDirectionColorMap(directions);

  return (
    <div
      className="relative"
      style={{ width: DIRECTION_LABEL_WIDTH, height: TIMELINE_HEIGHT }}
    >
      {sortedDirs.map((dir, index) => {
        const top = frameToPixelY(dir.frameTime);
        const nextDir = sortedDirs[index + 1];
        const bottom = nextDir ? frameToPixelY(nextDir.frameTime) : TIMELINE_HEIGHT;
        const height = bottom - top;
        const color = colorMap.get(dir.direction) ?? 'var(--color-dir-1)';

        return (
          <DirectionLabel
            key={index}
            top={top}
            height={height}
            bgColor={color}
            name={dir.direction}
            originalIndex={dir.originalIndex}
            onUpdateName={onUpdateName}
          />
        );
      })}
    </div>
  );
}

interface DirectionLabelProps {
  top: number;
  height: number;
  bgColor: string;
  name: string;
  originalIndex: number;
  onUpdateName?: (index: number, name: string) => void;
}

function DirectionLabel({ top, height, bgColor, name, originalIndex, onUpdateName }: DirectionLabelProps) {
  const [hovered, setHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectPreset = useCallback(
    (presetName: string) => {
      if (presetName !== name) {
        onUpdateName?.(originalIndex, presetName);
      }
      setHovered(false);
    },
    [name, originalIndex, onUpdateName],
  );

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    const related = e.relatedTarget as Node | null;
    if (containerRef.current?.contains(related)) return;
    setHovered(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute flex items-center justify-center overflow-visible"
      style={{
        top,
        height,
        width: DIRECTION_LABEL_WIDTH,
        backgroundColor: bgColor,
        left: 0,
      }}
      onMouseEnter={() => onUpdateName && setHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      <span
        className="select-none truncate px-1 text-sm font-medium text-text"
        title={name}
      >
        {name}
      </span>

      {/* ホバー時フロート — ラベルの中央に重ねて表示 */}
      {hovered && (
        <div
          className="absolute flex items-center gap-1 rounded border border-border bg-surface p-1 shadow-sm"
          style={{
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 20,
            whiteSpace: 'nowrap',
          }}
        >
          {PRESET_NAMES.map((preset) => (
            <button
              key={preset}
              type="button"
              className="rounded px-1.5 py-0.5 text-xs hover:bg-primary hover:text-white"
              style={{
                backgroundColor: preset === name ? 'var(--color-primary)' : undefined,
                color: preset === name ? 'white' : undefined,
              }}
              onClick={() => selectPreset(preset)}
            >
              {preset}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
