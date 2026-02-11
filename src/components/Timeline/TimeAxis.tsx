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
  return (
    <div
      className="relative border-b border-border"
      style={{ width: TIMELINE_WIDTH, height: TIME_AXIS_HEIGHT }}
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
    </div>
  );
}
