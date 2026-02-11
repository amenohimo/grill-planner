import type { FrameTime } from '@/types';
import { calculateSpawnerDecisionTime } from '@/utils/calculations';
import { frameToPixelX, LANE_HEIGHT } from './coordinates';

interface RespawnConnectorProps {
  defeatFrame: FrameTime;
  spawnFrame: FrameTime;
}

export function RespawnConnector({ defeatFrame, spawnFrame }: RespawnConnectorProps) {
  const spawnerDecisionFrame = calculateSpawnerDecisionTime(defeatFrame);

  const defeatX = frameToPixelX(defeatFrame);
  const decisionX = frameToPixelX(spawnerDecisionFrame);
  const spawnX = frameToPixelX(spawnFrame);

  const y = LANE_HEIGHT / 2;

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      style={{ width: '100%', height: '100%', zIndex: 1, overflow: 'visible' }}
    >
      {/* 撃破 → スポナー決定（実線） */}
      <line
        x1={defeatX}
        y1={y}
        x2={decisionX}
        y2={y}
        stroke="var(--color-respawn-line)"
        strokeWidth={2}
      />

      {/* スポナー決定マーク（小◇） */}
      <polygon
        points={`${decisionX},${y - 4} ${decisionX + 4},${y} ${decisionX},${y + 4} ${decisionX - 4},${y}`}
        fill="var(--color-spawner-decision)"
        stroke="var(--color-respawn-line)"
        strokeWidth={1}
      />

      {/* スポナー決定 → 湧き（破線） */}
      <line
        x1={decisionX}
        y1={y}
        x2={spawnX}
        y2={y}
        stroke="var(--color-respawn-line)"
        strokeWidth={2}
        strokeDasharray="4 3"
      />
    </svg>
  );
}
