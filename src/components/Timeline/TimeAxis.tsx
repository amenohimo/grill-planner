import { type MouseEvent, useCallback, useMemo, useRef, useState } from "react";
import { GAME_DURATION_SECONDS } from "@/constants";
import { PIXELS_PER_SECOND, TIME_AXIS_WIDTH, TIMELINE_HEIGHT } from "./coordinates";

interface Tick {
  second: number;
  pixelY: number;
  type: "major" | "minor" | "micro";
}

interface TimeAxisProps {
  scaleX: number;
  scaleY: number;
}

export function TimeAxis({ scaleX, scaleY }: TimeAxisProps) {
  const axisRef = useRef<HTMLDivElement>(null);
  const [hoverInfo, setHoverInfo] = useState<{ y: number; seconds: string } | null>(null);

  const scaledTicks = useMemo(() => {
    const result: Tick[] = [];
    for (let s = 0; s <= GAME_DURATION_SECONDS; s++) {
      const pixelY = (GAME_DURATION_SECONDS - s) * PIXELS_PER_SECOND * scaleY;
      let type: Tick["type"] = "micro";
      if (s % 10 === 0) type = "major";
      else if (s % 5 === 0) type = "minor";
      result.push({ second: s, pixelY, type });
    }
    return result;
  }, [scaleY]);

  const scaledWidth = Math.max(TIME_AXIS_WIDTH * scaleX, 20);
  const scaledHeight = TIMELINE_HEIGHT * scaleY;
  const minScale = Math.min(scaleX, scaleY);
  const fontSize = Math.max(14 * minScale, 9);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!axisRef.current) return;
      const rect = axisRef.current.getBoundingClientRect();
      const pixelY = e.clientY - rect.top;
      const seconds = GAME_DURATION_SECONDS - pixelY / (PIXELS_PER_SECOND * scaleY);
      if (seconds < 0 || seconds > GAME_DURATION_SECONDS) {
        setHoverInfo(null);
        return;
      }
      setHoverInfo({ y: pixelY, seconds: seconds.toFixed(1) });
    },
    [scaleY],
  );

  const handleMouseLeave = useCallback(() => {
    setHoverInfo(null);
  }, []);

  return (
    <div
      ref={axisRef}
      className="relative border-r border-border"
      style={{ width: scaledWidth, height: scaledHeight }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {scaledTicks.map((tick) => (
        <div key={tick.second} className="absolute left-0" style={{ top: tick.pixelY, width: "100%" }}>
          {tick.type === "major" && (
            <>
              <div className="absolute right-0 bg-text" style={{ width: 12, height: 1 }} />
              <span
                className="absolute select-none text-text-muted"
                style={{ right: 14, top: -7, fontSize, whiteSpace: "nowrap" }}
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
