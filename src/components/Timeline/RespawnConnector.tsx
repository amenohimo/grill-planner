import type { FrameTime } from '@/types';
import { calculateSpawnerDecisionTime } from '@/utils/calculations';
import { frameToPixelY, LANE_WIDTH } from './coordinates';

interface RespawnConnectorProps {
  defeatFrame: FrameTime;
  spawnFrame: FrameTime;
}

export function RespawnConnector({ defeatFrame, spawnFrame }: RespawnConnectorProps) {
  const spawnerDecisionFrame = calculateSpawnerDecisionTime(defeatFrame);

  const defeatY = frameToPixelY(defeatFrame);
  const decisionY = frameToPixelY(spawnerDecisionFrame);
  const spawnY = frameToPixelY(spawnFrame);

  const x = LANE_WIDTH / 2;

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      style={{ width: '100%', height: '100%', zIndex: 2, overflow: 'visible' }}
    >
      {/* 撃破 → スポナー決定（実線） */}
      <line
        x1={x}
        y1={defeatY}
        x2={x}
        y2={decisionY}
        stroke="var(--color-respawn-line)"
        strokeWidth={2}
      />

      {/* スポナー決定マーク（小◇） */}
      <polygon
        points={`${x},${decisionY - 3} ${x + 3},${decisionY} ${x},${decisionY + 3} ${x - 3},${decisionY}`}
        fill="var(--color-spawner-decision)"
        stroke="var(--color-respawn-line)"
        strokeWidth={1}
      />

      {/* スポナー決定 → 湧き（破線） */}
      <line
        x1={x}
        y1={decisionY}
        x2={x}
        y2={spawnY}
        stroke="var(--color-respawn-line)"
        strokeWidth={2}
        strokeDasharray="4 3"
      />
    </svg>
  );
}
