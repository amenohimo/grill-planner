import { type MouseEvent, useCallback, useRef, useState } from "react";
import { GAME_DURATION_SECONDS } from "@/constants";
import { PIXELS_PER_SECOND, TIME_AXIS_WIDTH, TIMELINE_HEIGHT } from "./coordinates";

// ============================================================
// 時間軸の目盛り（静的データ、毎レンダーで再計算不要）
// ============================================================

interface Tick {
  second: number;
  pixelY: number;
  type: "major" | "minor" | "micro";
}

const ticks: Tick[] = [];
for (let s = 0; s <= GAME_DURATION_SECONDS; s++) {
  const pixelY = (GAME_DURATION_SECONDS - s) * PIXELS_PER_SECOND;
  let type: Tick["type"] = "micro";
  if (s % 10 === 0) type = "major";
  else if (s % 5 === 0) type = "minor";
  ticks.push({ second: s, pixelY, type });
}

export function TimeAxis() {
  const axisRef = useRef<HTMLDivElement>(null);
  const [hoverInfo, setHoverInfo] = useState<{ y: number; seconds: string } | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!axisRef.current) return;
    const rect = axisRef.current.getBoundingClientRect();
    const pixelY = e.clientY - rect.top;
    const seconds = GAME_DURATION_SECONDS - pixelY / PIXELS_PER_SECOND;
    if (seconds < 0 || seconds > GAME_DURATION_SECONDS) {
      setHoverInfo(null);
      return;
    }
    setHoverInfo({ y: pixelY, seconds: seconds.toFixed(1) });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverInfo(null);
  }, []);

  return (
    <div
      ref={axisRef}
      className="relative border-r border-border"
      style={{ width: TIME_AXIS_WIDTH, height: TIMELINE_HEIGHT }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {ticks.map((tick) => (
        <div key={tick.second} className="absolute left-0" style={{ top: tick.pixelY, width: "100%" }}>
          {tick.type === "major" && (
            <>
              <div className="absolute right-0 bg-text" style={{ width: 12, height: 1 }} />
              <span
                className="absolute select-none text-text-muted"
                style={{ right: 14, top: -7, fontSize: 12, whiteSpace: "nowrap" }}
              >
                {tick.second}s
              </span>
            </>
          )}
          {tick.type === "minor" && <div className="absolute right-0 bg-text-muted" style={{ width: 8, height: 1 }} />}
          {tick.type === "micro" && <div className="absolute right-0 bg-border" style={{ width: 4, height: 1 }} />}
        </div>
      ))}

      {/* ホバー時刻表示 */}
      {hoverInfo && (
        <div
          className="pointer-events-none absolute rounded-sm bg-text px-1.5 py-0.5 text-xs text-surface"
          style={{
            top: hoverInfo.y,
            right: -4,
            transform: "translate(100%, -50%)",
            whiteSpace: "nowrap",
            zIndex: 20,
          }}
        >
          {hoverInfo.seconds}s
        </div>
      )}
    </div>
  );
}
