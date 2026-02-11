import type { SpawnPoint } from '@/types';
import { framesToSeconds } from '@/utils/calculations';
import { frameToPixelY, MARKER_SIZE } from './coordinates';

interface SpawnMarkerProps {
  spawn: SpawnPoint;
}

export function SpawnMarker({ spawn }: SpawnMarkerProps) {
  const pixelY = frameToPixelY(spawn.frameTime);
  const borderColor = spawn.slot === 'A' ? 'var(--color-slot-a)' : 'var(--color-slot-b)';
  const seconds = framesToSeconds(spawn.frameTime);

  return (
    <div
      className="absolute flex flex-col items-center"
      style={{
        top: pixelY,
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 3,
      }}
    >
      {/* 時刻ラベル */}
      <span
        className="select-none whitespace-nowrap text-text-muted"
        style={{ fontSize: 9, marginBottom: 1 }}
      >
        {seconds}s
      </span>

      {/* マーカー円 */}
      <div
        className="rounded-full"
        style={{
          width: MARKER_SIZE,
          height: MARKER_SIZE,
          backgroundColor: 'var(--color-spawn)',
          border: `2px solid ${borderColor}`,
        }}
      />

      {/* 方面ラベル */}
      <span
        className="select-none whitespace-nowrap text-text-muted"
        style={{ fontSize: 9, marginTop: 1 }}
      >
        {spawn.direction}
      </span>
    </div>
  );
}
