import type { FrameTime } from '@/types';
import { frameToPixelX, ACTIVITY_BAR_HEIGHT } from './coordinates';

interface ActivePeriodProps {
  spawnFrame: FrameTime;
  defeatFrame: FrameTime | null; // null = 未撃破（0秒まで活動）
  slot: 'A' | 'B';
}

export function ActivePeriod({ spawnFrame, defeatFrame, slot }: ActivePeriodProps) {
  const leftX = frameToPixelX(spawnFrame);
  const rightX = defeatFrame !== null ? frameToPixelX(defeatFrame) : frameToPixelX(0);
  const width = rightX - leftX;

  if (width <= 0) return null;

  const bgColor = slot === 'A' ? 'var(--color-slot-a-light)' : 'var(--color-slot-b-light)';

  return (
    <div
      className="absolute"
      style={{
        left: leftX,
        bottom: 4,
        width,
        height: ACTIVITY_BAR_HEIGHT,
        backgroundColor: bgColor,
        borderRadius: 2,
        zIndex: 1,
      }}
    />
  );
}
