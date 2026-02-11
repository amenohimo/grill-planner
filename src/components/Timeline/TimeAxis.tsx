import { useState, useCallback, useRef, type MouseEvent } from 'react';
import { GAME_DURATION_SECONDS } from '@/constants';
import { PIXELS_PER_SECOND, TIMELINE_WIDTH, TIME_AXIS_HEIGHT } from './coordinates';

// ============================================================
// 時間軸の目盛り（静的データ、毎レンダーで再計算不要）
// ============================================================

interface Tick {
  second: number;
  pixelX: number;
  type: 'major' | 'minor' | 'micro';
}

const ticks: Tick[] = [];
for (let s = 0; s <= GAME_DURATION_SECONDS; s++) {
  const pixelX = (GAME_DURATION_SECONDS - s) * PIXELS_PER_SECOND;
  let type: Tick['type'] = 'micro';
  if (s % 10 === 0) type = 'major';
  else if (s % 5 === 0) type = 'minor';
  ticks.push({ second: s, pixelX, type });
}

export function TimeAxis() {
  const axisRef = useRef<HTMLDivElement>(null);
  const [hoverInfo, setHoverInfo] = useState<{ x: number; seconds: string } | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!axisRef.current) return;
    const rect = axisRef.current.getBoundingClientRect();
    const pixelX = e.clientX - rect.left;
    const seconds = GAME_DURATION_SECONDS - pixelX / PIXELS_PER_SECOND;
    if (seconds < 0 || seconds > GAME_DURATION_SECONDS) {
      setHoverInfo(null);
      return;
    }
    setHoverInfo({ x: pixelX, seconds: seconds.toFixed(1) });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverInfo(null);
  }, []);

  return (
    <div
      ref={axisRef}
      className="relative border-b border-border"
      style={{ width: TIMELINE_WIDTH, height: TIME_AXIS_HEIGHT }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {ticks.map((tick) => (
        <div
          key={tick.second}
          className="absolute top-0"
          style={{ left: tick.pixelX, height: '100%' }}
        >
          {tick.type === 'major' && (
            <>
              <div
                className="absolute bottom-0 bg-text"
                style={{ width: 1, height: 12 }}
              />
              <span
                className="absolute select-none text-text-muted"
                style={{ bottom: 13, left: -10, fontSize: 10, whiteSpace: 'nowrap' }}
              >
                {tick.second}s
              </span>
            </>
          )}
          {tick.type === 'minor' && (
            <div
              className="absolute bottom-0 bg-text-muted"
              style={{ width: 1, height: 8 }}
            />
          )}
          {tick.type === 'micro' && (
            <div
              className="absolute bottom-0 bg-border"
              style={{ width: 1, height: 4 }}
            />
          )}
        </div>
      ))}

      {/* ホバー時刻表示 */}
      {hoverInfo && (
        <div
          className="pointer-events-none absolute rounded-sm bg-text px-1.5 py-0.5 text-xs text-surface"
          style={{
            left: hoverInfo.x,
            top: -20,
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
          }}
        >
          {hoverInfo.seconds}s
        </div>
      )}
    </div>
  );
}
