import type { FrameTime } from '@/types';
import { frameToPixelY, ACTIVITY_BAR_WIDTH } from './coordinates';

interface ActivePeriodProps {
  spawnFrame: FrameTime;
  defeatFrame: FrameTime | null; // null = 未撃破（0秒まで活動）
  slot: 'A' | 'B';
}

export function ActivePeriod({ spawnFrame, defeatFrame, slot }: ActivePeriodProps) {
  const topY = frameToPixelY(spawnFrame);
  const bottomY = defeatFrame !== null ? frameToPixelY(defeatFrame) : frameToPixelY(0);
  const height = bottomY - topY;

  if (height <= 0) return null;

  const bgColor = slot === 'A' ? 'var(--color-slot-a-light)' : 'var(--color-slot-b-light)';

  return (
    <div
      className="absolute"
      style={{
        top: topY,
        left: '50%',
        transform: 'translateX(-50%)',
        height,
        width: ACTIVITY_BAR_WIDTH,
        backgroundColor: bgColor,
        borderRadius: 2,
        zIndex: 1,
      }}
    />
  );
}
