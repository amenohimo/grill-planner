import { type MouseEvent, useCallback, useMemo, useRef, useState } from "react";
import { ButtonGroup } from "@/components/ButtonGroup";
import type { DirectionId, DirectionSetting } from "@/types";
import { DIRECTION_LABEL_WIDTH, getDirectionColor, scaledFrameToPixelY, TIMELINE_HEIGHT } from "./coordinates";

interface DirectionLabelsProps {
  directions: readonly DirectionSetting[];
  presetNames: readonly [string, string, string];
  onUpdateDirection?: (index: number, directionId: DirectionId) => void;
  scaleX: number;
  scaleY: number;
}

export function DirectionLabels({ directions, presetNames, onUpdateDirection, scaleX, scaleY }: DirectionLabelsProps) {
  const sortedDirs = directions
    .map((dir, originalIndex) => ({ ...dir, originalIndex }))
    .sort((a, b) => b.frameTime - a.frameTime);
  const scaledWidth = Math.max(DIRECTION_LABEL_WIDTH * scaleX, 40);
  const scaledHeight = TIMELINE_HEIGHT * scaleY;
  const minScale = Math.min(scaleX, scaleY);
  const fontSize = Math.max(14 * minScale, 9);
  return (
    <div className="relative" style={{ width: scaledWidth, height: scaledHeight }}>
      {sortedDirs.map((dir, index) => {
        const top = scaledFrameToPixelY(dir.frameTime, scaleY);
        const nextDir = sortedDirs[index + 1];
        const bottom = nextDir ? scaledFrameToPixelY(nextDir.frameTime, scaleY) : scaledHeight;
        const height = bottom - top;
        const color = getDirectionColor(dir.direction);
        const displayName = presetNames[dir.direction] ?? `方面${dir.direction + 1}`;

        return (
          <DirectionLabel
            key={index}
            top={top}
            height={height}
            width={scaledWidth}
            fontSize={fontSize}
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
  width: number;
  fontSize: number;
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
  width,
  fontSize,
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
        width,
        backgroundColor: bgColor,
        left: 0,
      }}
      onMouseEnter={() => onUpdateDirection && setHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      <span className="select-none truncate px-1 font-medium text-text" style={{ fontSize }} title={displayName}>
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
