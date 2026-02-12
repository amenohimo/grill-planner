import type { SpawnPoint } from "@/types";
import { framesToSeconds } from "@/utils/calculations";
import { frameToPixelY, MARKER_SIZE } from "./coordinates";

interface SpawnMarkerProps {
  spawn: SpawnPoint;
}

export function SpawnMarker({ spawn }: SpawnMarkerProps) {
  const pixelY = frameToPixelY(spawn.frameTime);
  const borderColor = spawn.slot === "A" ? "var(--color-slot-a)" : "var(--color-slot-b)";
  const seconds = framesToSeconds(spawn.frameTime);

  return (
    <div
      className="absolute flex items-center"
      style={{
        top: pixelY,
        left: "50%",
        transform: `translateX(-${MARKER_SIZE / 2}px) translateY(-50%)`,
        zIndex: 3,
        animation: "marker-in 150ms ease-out",
      }}
    >
      {/* マーカー円 */}
      <div
        className="shrink-0 rounded-full"
        style={{
          width: MARKER_SIZE,
          height: MARKER_SIZE,
          backgroundColor: "var(--color-spawn)",
          border: `2px solid ${borderColor}`,
        }}
      />

      {/* 右側ラベル（時刻+方面） */}
      <span
        className="select-none whitespace-nowrap"
        style={{
          marginLeft: 4,
          fontSize: 11,
          color: "var(--color-text-muted)",
          backgroundColor: "rgba(255,255,255,0.85)",
          padding: "1px 4px",
          borderRadius: 2,
          lineHeight: 1.3,
        }}
      >
        {seconds}s {spawn.direction}
      </span>
    </div>
  );
}
