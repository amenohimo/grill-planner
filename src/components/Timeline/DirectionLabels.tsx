import { useState, useCallback, useRef, type MouseEvent } from 'react';
import type { DirectionId, DirectionSetting } from '@/types';
import { frameToPixelY, TIMELINE_HEIGHT, DIRECTION_LABEL_WIDTH, getDirectionColorMap } from './coordinates';

interface DirectionLabelsProps {
  directions: readonly DirectionSetting[];
  presetNames: readonly [string, string, string];
  onUpdateDirection?: (index: number, directionId: DirectionId) => void;
}

export function DirectionLabels({ directions, presetNames, onUpdateDirection }: DirectionLabelsProps) {
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
        const displayName = presetNames[dir.direction] ?? `方面${dir.direction + 1}`;

        return (
          <DirectionLabel
            key={index}
            top={top}
            height={height}
            bgColor={color}
            directionId={dir.direction}
            displayName={displayName}
            originalIndex={dir.originalIndex}
            presetNames={presetNames}
            onUpdateDirection={onUpdateDirection}
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
  directionId: DirectionId;
  displayName: string;
  originalIndex: number;
  presetNames: readonly [string, string, string];
  onUpdateDirection?: (index: number, directionId: DirectionId) => void;
}

function DirectionLabel({ top, height, bgColor, directionId, displayName, originalIndex, presetNames, onUpdateDirection }: DirectionLabelProps) {
  const [hovered, setHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectPreset = useCallback(
    (presetId: DirectionId) => {
      if (presetId !== directionId) {
        onUpdateDirection?.(originalIndex, presetId);
      }
      setHovered(false);
    },
    [directionId, originalIndex, onUpdateDirection],
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
      onMouseEnter={() => onUpdateDirection && setHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      <span
        className="select-none truncate px-1 text-sm font-medium text-text"
        title={displayName}
      >
        {displayName}
      </span>

      {/* ホバー時フロート */}
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
          {presetNames.map((preset, presetId) => (
            <button
              key={presetId}
              type="button"
              className="rounded px-1.5 py-0.5 text-xs hover:bg-primary hover:text-white"
              style={{
                backgroundColor: presetId === directionId ? 'var(--color-primary)' : undefined,
                color: presetId === directionId ? 'white' : undefined,
              }}
              onClick={() => selectPreset(presetId as DirectionId)}
            >
              {preset}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
