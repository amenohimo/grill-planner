import type { FrameTime } from "@/types";
import { ACTIVITY_BAR_WIDTH, MARKER_CENTER_RATIO, scaledFrameToPixelY } from "./coordinates";

interface ActivePeriodProps {
  spawnFrame: FrameTime;
  defeatFrame: FrameTime | null; // null = 未撃破（0秒まで活動）
  slot: "A" | "B";
  scaleX: number;
  scaleY: number;
}

export function ActivePeriod({ spawnFrame, defeatFrame, slot, scaleX, scaleY }: ActivePeriodProps) {
  const topY = scaledFrameToPixelY(spawnFrame, scaleY);
  const bottomY = defeatFrame !== null ? scaledFrameToPixelY(defeatFrame, scaleY) : scaledFrameToPixelY(0, scaleY);
  const height = bottomY - topY;

  if (height <= 0) return null;

  const bgColor = slot === "A" ? "var(--color-slot-a-light)" : "var(--color-slot-b-light)";
  const barWidth = Math.max(ACTIVITY_BAR_WIDTH * scaleX, 4);

  return (
    <div
      className="absolute"
      style={{
        top: topY,
        left: `${MARKER_CENTER_RATIO * 100}%`,
        transform: "translateX(-50%)",
        height,
        width: barWidth,
        backgroundColor: bgColor,
        borderRadius: 2,
        zIndex: 1,
      }}
    />
  );
}
