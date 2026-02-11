import { useCallback, useState, type MouseEvent } from 'react';
import type { DefeatPoint, FrameTime } from '@/types';
import { framesToSeconds } from '@/utils/calculations';
import { frameToPixelY, MARKER_SIZE } from './coordinates';

interface DefeatMarkerProps {
  defeat: DefeatPoint;
  isDragging?: boolean;
  dragFrameTime?: FrameTime | null;
  isValidPosition?: boolean;
  onMouseDown?: (defeatId: string, startY: number) => void;
  onContextMenu?: (defeatId: string) => void;
}

export function DefeatMarker({
  defeat,
  isDragging = false,
  dragFrameTime,
  isValidPosition = true,
  onMouseDown,
  onContextMenu,
}: DefeatMarkerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const displayFrame = isDragging && dragFrameTime != null ? dragFrameTime : defeat.frameTime;
  const pixelY = frameToPixelY(displayFrame);
  const borderColor = defeat.slot === 'A' ? 'var(--color-slot-a)' : 'var(--color-slot-b)';
  const seconds = framesToSeconds(displayFrame);

  // 色の決定
  let bgColor = isHovered && !isDragging ? 'var(--color-defeat-hover)' : 'var(--color-defeat)';
  let cursor = 'grab';
  let shadow = '';
  let borderStyle = 'solid';
  if (isDragging) {
    if (isValidPosition) {
      bgColor = 'var(--color-defeat-drag)';
      cursor = 'grabbing';
      shadow = '0 2px 8px rgba(0,0,0,0.3)';
    } else {
      bgColor = 'var(--color-defeat-invalid)';
      cursor = 'grabbing';
      borderStyle = 'dashed';
    }
  }

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (e.button !== 0) return; // 左クリックのみ
      e.stopPropagation(); // レーンのクリックハンドラを抑止
      onMouseDown?.(defeat.id, e.clientY);
    },
    [defeat.id, onMouseDown],
  );

  const handleClick = useCallback((e: MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu?.(defeat.id);
    },
    [defeat.id, onContextMenu],
  );

  return (
    <div
      className="absolute flex items-center"
      style={{
        top: pixelY,
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: isDragging ? 10 : 4,
        cursor,
        animation: 'marker-in 150ms ease-out',
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* マーカー（ダイヤモンド形） */}
      <div
        className="shrink-0"
        style={{
          width: MARKER_SIZE,
          height: MARKER_SIZE,
          backgroundColor: bgColor,
          border: `2px ${borderStyle} ${borderColor}`,
          borderRadius: 3,
          transform: 'rotate(45deg)',
          boxShadow: shadow,
          transition: isDragging ? 'none' : 'background-color 0.15s',
        }}
      />

      {/* 右側ラベル（時刻） */}
      <span
        className="select-none whitespace-nowrap"
        style={{
          marginLeft: 4,
          fontSize: 9,
          color: 'var(--color-text-muted)',
          backgroundColor: 'rgba(255,255,255,0.85)',
          padding: '1px 4px',
          borderRadius: 2,
        }}
      >
        {seconds}s
      </span>
    </div>
  );
}
