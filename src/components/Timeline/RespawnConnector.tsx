import type { FrameTime } from "@/types";
import { calculateSpawnerDecisionTime } from "@/utils/calculations";
import { LANE_WIDTH, MARKER_CENTER_RATIO, MARKER_SIZE, scaledFrameToPixelY } from "./coordinates";

interface RespawnConnectorProps {
  defeatFrame: FrameTime;
  spawnFrame: FrameTime;
  scaleX: number;
  scaleY: number;
}

export function RespawnConnector({ defeatFrame, spawnFrame, scaleX, scaleY }: RespawnConnectorProps) {
  const spawnerDecisionFrame = calculateSpawnerDecisionTime(defeatFrame);

  const defeatY = scaledFrameToPixelY(defeatFrame, scaleY);
  const decisionY = scaledFrameToPixelY(spawnerDecisionFrame, scaleY);
  const spawnY = scaledFrameToPixelY(spawnFrame, scaleY);

  const x = LANE_WIDTH * scaleX * MARKER_CENTER_RATIO;
  const strokeW = Math.max(1 * scaleX, 0.5);
  const markerSize = Math.max(MARKER_SIZE * scaleX, 8);

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      style={{ width: "100%", height: "100%", zIndex: 2, overflow: "visible" }}
    >
      {/* 撃破 → スポナー決定（実線） */}
      <line x1={x} y1={defeatY} x2={x} y2={decisionY} stroke="var(--color-respawn-line)" strokeWidth={strokeW} />

      {/* スポナー決定マーク（小●） */}
      <circle
        cx={x}
        cy={decisionY}
        r={markerSize * 0.25}
        fill="var(--color-spawner-decision)"
        stroke="var(--color-respawn-line)"
        strokeWidth={Math.max(0.5 * scaleX, 0.5)}
      />

      {/* スポナー決定 → 湧き（破線） */}
      <line
        x1={x}
        y1={decisionY}
        x2={x}
        y2={spawnY}
        stroke="var(--color-respawn-line)"
        strokeWidth={strokeW}
        strokeDasharray="4 3"
      />
    </svg>
  );
}
