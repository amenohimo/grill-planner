import type { DirectionSetting } from "@/types";
import { getDirectionColor, scaledFrameToPixelY, TIMELINE_HEIGHT } from "./coordinates";

interface DirectionBandsProps {
  directions: readonly DirectionSetting[];
  scaleY: number;
}

export function DirectionBands({ directions, scaleY }: DirectionBandsProps) {
  const sortedDirs = [...directions].sort((a, b) => b.frameTime - a.frameTime);
  const scaledHeight = TIMELINE_HEIGHT * scaleY;

  return (
    <>
      {sortedDirs.map((dir, index) => {
        const top = scaledFrameToPixelY(dir.frameTime, scaleY);
        const nextDir = sortedDirs[index + 1];
        const bottom = nextDir ? scaledFrameToPixelY(nextDir.frameTime, scaleY) : scaledHeight;
        const height = bottom - top;

        return (
          <div
            key={index}
            className="absolute inset-x-0"
            style={{
              top,
              height,
              backgroundColor: getDirectionColor(dir.direction),
              borderTop: index > 0 ? "1px dashed var(--color-border)" : "none",
            }}
          />
        );
      })}
    </>
  );
}
