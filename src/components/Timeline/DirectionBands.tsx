import type { DirectionSetting } from '@/types';
import { frameToPixelX, TIMELINE_WIDTH, DIR_BAND_COLORS } from './coordinates';

interface DirectionBandsProps {
  directions: readonly DirectionSetting[];
}

export function DirectionBands({ directions }: DirectionBandsProps) {
  const sortedDirs = [...directions].sort((a, b) => b.frameTime - a.frameTime);

  return (
    <>
      {sortedDirs.map((dir, index) => {
        const left = frameToPixelX(dir.frameTime);
        const nextDir = sortedDirs[index + 1];
        const right = nextDir ? frameToPixelX(nextDir.frameTime) : TIMELINE_WIDTH;
        const width = right - left;
        const color = DIR_BAND_COLORS[index % DIR_BAND_COLORS.length] ?? DIR_BAND_COLORS[0];

        return (
          <div
            key={index}
            className="absolute inset-y-0"
            style={{
              left,
              width,
              backgroundColor: color,
            }}
          />
        );
      })}
    </>
  );
}
