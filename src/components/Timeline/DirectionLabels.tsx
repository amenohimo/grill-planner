import { type MouseEvent, useCallback, useMemo, useRef, useState } from "react";
import { ButtonGroup } from "@/components/ButtonGroup";
import type { DirectionId, DirectionSetting } from "@/types";
import { DIRECTION_LABEL_WIDTH, frameToPixelY, getDirectionColor, TIMELINE_HEIGHT } from "./coordinates";

interface DirectionLabelsProps {
  directions: readonly DirectionSetting[];
  presetNames: readonly [string, string, string];
  onUpdateDirection?: (index: number, directionId: DirectionId) => void;
}

export function DirectionLabels({ directions, presetNames, onUpdateDirection }: DirectionLabelsProps) {
  const sortedDirs = directions
    .map((dir, originalIndex) => ({ ...dir, originalIndex }))
    .sort((a, b) => b.frameTime - a.frameTime);
  return (
    <div className="relative" style={{ width: DIRECTION_LABEL_WIDTH, height: TIMELINE_HEIGHT }}>
      {sortedDirs.map((dir, index) => {
        const top = frameToPixelY(dir.frameTime);
        const nextDir = sortedDirs[index + 1];
        const bottom = nextDir ? frameToPixelY(nextDir.frameTime) : TIMELINE_HEIGHT;
        const height = bottom - top;
        const color = getDirectionColor(dir.direction);
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

function DirectionLabel({
  top,
  height,
  bgColor,
  directionId,
  displayName,
  originalIndex,
  presetNames,
  onUpdateDirection,
}: DirectionLabelProps) {
  const [hovered, setHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback(
    (value: string) => {
      const presetId = Number(value) as DirectionId;
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

  const options = useMemo(() => presetNames.map((preset, i) => ({ value: String(i), label: preset })), [presetNames]);

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
      <span className="select-none truncate px-1 text-sm font-medium text-text" title={displayName}>
        {displayName}
      </span>

      {/* ホバー時フロート */}
      {hovered && (
        <div
          className="absolute"
          style={{
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 20,
            whiteSpace: "nowrap",
          }}
        >
          <ButtonGroup options={options} selected={String(directionId)} onChange={handleSelect} />
        </div>
      )}
    </div>
  );
}
