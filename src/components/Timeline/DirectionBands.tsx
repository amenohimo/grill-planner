import type { DirectionSetting } from '@/types';
import { frameToPixelY, TIMELINE_HEIGHT, DIR_BAND_COLORS } from './coordinates';

interface DirectionBandsProps {
  directions: readonly DirectionSetting[];
}

export function DirectionBands({ directions }: DirectionBandsProps) {
  const sortedDirs = [...directions].sort((a, b) => b.frameTime - a.frameTime);

  return (
    <>
      {sortedDirs.map((dir, index) => {
        const top = frameToPixelY(dir.frameTime);
        const nextDir = sortedDirs[index + 1];
        const bottom = nextDir ? frameToPixelY(nextDir.frameTime) : TIMELINE_HEIGHT;
        const height = bottom - top;
        const color = DIR_BAND_COLORS[index % DIR_BAND_COLORS.length] ?? DIR_BAND_COLORS[0];

        return (
          <div
            key={index}
            className="absolute inset-x-0"
            style={{
              top,
              height,
              backgroundColor: color,
            }}
          />
        );
      })}
    </>
  );
}
