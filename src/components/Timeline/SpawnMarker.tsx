import type { DisplayMode, SpawnPoint } from "@/types";
import { framesToSeconds } from "@/utils/calculations";
import { frameToPixelY, MARKER_CENTER_RATIO, MARKER_SIZE } from "./coordinates";

export interface SpawnDisplayInfo {
  directionName: string;
  targetLabel: string | null;
  targetIcon: string | null;
}

interface SpawnMarkerProps {
  spawn: SpawnPoint;
  displayInfo?: SpawnDisplayInfo;
  displayMode: DisplayMode;
}

export function SpawnMarker({ spawn, displayInfo, displayMode }: SpawnMarkerProps) {
  const pixelY = frameToPixelY(spawn.frameTime);
  const borderColor = spawn.slot === "A" ? "var(--color-slot-a)" : "var(--color-slot-b)";
  const seconds = framesToSeconds(spawn.frameTime);

  const dirName = displayInfo?.directionName ?? String(spawn.direction);
  const targetLabel = displayInfo?.targetLabel;
  const targetIcon = displayInfo?.targetIcon;

  return (
    <div
      className="absolute flex items-center"
      style={{
        top: pixelY,
        left: `${MARKER_CENTER_RATIO * 100}%`,
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

      {/* フキダシ（時刻+方面+ターゲットテキスト）— アイコンは含まない */}
      <span
        className="inline-flex items-center select-none whitespace-nowrap"
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
        {seconds}s {dirName}
        {targetLabel && displayMode !== "icon" && <> {targetLabel}</>}
      </span>

      {/* ブキアイコン（フキダシの右外、独立背景付き） */}
      {targetIcon && displayMode !== "text" && (
        <div
          style={{
            marginLeft: 3,
            padding: 2,
            backgroundColor: "rgba(255,255,255,0.85)",
            border: "1px solid var(--color-border)",
            borderRadius: 4,
            lineHeight: 0,
          }}
        >
          <img src={targetIcon} alt="" style={{ width: 28, height: 28, display: "block" }} />
        </div>
      )}
    </div>
  );
}
