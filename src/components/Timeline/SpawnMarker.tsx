import type { DisplayMode, SpawnPoint } from "@/types";
import { framesToSeconds } from "@/utils/calculations";
import { MARKER_CENTER_RATIO, MARKER_SIZE, scaledFrameToPixelY } from "./coordinates";

export interface SpawnDisplayInfo {
  directionName: string;
  targetLabel: string | null;
  targetIcon: string | null;
}

interface SpawnMarkerProps {
  spawn: SpawnPoint;
  displayInfo?: SpawnDisplayInfo;
  displayMode: DisplayMode;
  scaleX: number;
  scaleY: number;
}

export function SpawnMarker({ spawn, displayInfo, displayMode, scaleX, scaleY }: SpawnMarkerProps) {
  const pixelY = scaledFrameToPixelY(spawn.frameTime, scaleY);
  const borderColor = spawn.slot === "A" ? "var(--color-slot-a)" : "var(--color-slot-b)";
  const isSuppressed = spawn.isSuppressed === true;
  const seconds = framesToSeconds(spawn.frameTime);

  const markerSize = Math.max(MARKER_SIZE * scaleX, 8);
  const minScale = Math.min(scaleX, scaleY);
  const fontSize = Math.max(14 * minScale, 9);
  const iconSize = Math.max(28 * scaleX, 14);

  const dirName = displayInfo?.directionName ?? String(spawn.direction);
  const targetLabel = displayInfo?.targetLabel;
  const targetIcon = displayInfo?.targetIcon;
  return (
    <div
      className="absolute flex items-center"
      style={{
        top: pixelY,
        left: `${MARKER_CENTER_RATIO * 100}%`,
        transform: `translateX(-${markerSize / 2}px) translateY(-50%)`,
        zIndex: 3,
        animation: "marker-in 150ms ease-out",
      }}
    >
      {/* マーカー円 */}
      <div
        className="shrink-0 rounded-full"
        style={{
          width: markerSize,
          height: markerSize,
          backgroundColor: "var(--color-spawn)",
          border: `2px ${isSuppressed ? "dashed" : "solid"} ${borderColor}`,
        }}
      />

      {/* フキダシ（時刻+方面+ターゲットテキスト）— アイコンは含まない */}
      <span
        className="inline-flex items-center select-none whitespace-nowrap"
        style={{
          marginLeft: 4,
          fontSize,
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
          <img src={targetIcon} alt="" style={{ width: iconSize, height: iconSize, display: "block" }} />
        </div>
      )}
    </div>
  );
}
