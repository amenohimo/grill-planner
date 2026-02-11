import type { DirectionSetting } from '@/types';
import { frameToPixelY, TIMELINE_HEIGHT, getDirectionColorMap } from './coordinates';

interface DirectionBandsProps {
  directions: readonly DirectionSetting[];
}

export function DirectionBands({ directions }: DirectionBandsProps) {
  const sortedDirs = [...directions].sort((a, b) => b.frameTime - a.frameTime);
  const colorMap = getDirectionColorMap(directions);

  return (
    <>
      {sortedDirs.map((dir, index) => {
        const top = frameToPixelY(dir.frameTime);
        const nextDir = sortedDirs[index + 1];
        const bottom = nextDir ? frameToPixelY(nextDir.frameTime) : TIMELINE_HEIGHT;
        const height = bottom - top;
        const color = colorMap.get(dir.direction) ?? 'var(--color-dir-1)';

        return (
          <div
            key={index}
            className="absolute inset-x-0"
            style={{
              top,
              height,
              backgroundColor: color,
              borderTop: index > 0 ? '1px dashed var(--color-border)' : 'none',
            }}
          />
        );
      })}
    </>
  );
}
