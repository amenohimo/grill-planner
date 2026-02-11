import { useCallback, useEffect, useRef, useState, type MouseEvent, type KeyboardEvent } from 'react';
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
  onTimeEdit?: (defeatId: string, newSeconds: number) => boolean;
}

export function DefeatMarker({
  defeat,
  isDragging = false,
  dragFrameTime,
  isValidPosition = true,
  onMouseDown,
  onContextMenu,
  onTimeEdit,
}: DefeatMarkerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
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
      if (editing) return;
      if (e.button !== 0) return; // 左クリックのみ
      e.stopPropagation(); // レーンのクリックハンドラを抑止
      onMouseDown?.(defeat.id, e.clientY);
    },
    [defeat.id, onMouseDown, editing],
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

  // 編集モード開始
  const startEdit = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (!onTimeEdit) return;
      setEditValue(String(seconds));
      setEditing(true);
    },
    [seconds, onTimeEdit],
  );

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  // 確定処理
  const confirmEdit = useCallback(() => {
    setEditing(false);
    const newSeconds = parseFloat(editValue);
    if (isNaN(newSeconds) || newSeconds < 0 || newSeconds > 100) return;
    if (newSeconds === seconds) return;
    onTimeEdit?.(defeat.id, newSeconds);
  }, [editValue, seconds, defeat.id, onTimeEdit]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        confirmEdit();
      } else if (e.key === 'Escape') {
        setEditing(false);
      }
    },
    [confirmEdit],
  );

  const handleInputMouseDown = useCallback((e: MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      className="absolute flex items-center"
      style={{
        top: pixelY,
        left: '50%',
        transform: `translateX(-${MARKER_SIZE / 2}px) translateY(-50%)`,
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

      {/* 右側ラベル（時刻）/ 編集モード */}
      {editing ? (
        <input
          ref={inputRef}
          type="number"
          step={0.1}
          min={0}
          max={100}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={confirmEdit}
          onMouseDown={handleInputMouseDown}
          className="w-14 rounded-sm border border-border bg-surface px-1 text-center text-text"
          style={{ marginLeft: 4, fontSize: 11 }}
        />
      ) : (
        <span
          className="cursor-text select-none whitespace-nowrap"
          style={{
            marginLeft: 4,
            fontSize: 11,
            color: 'var(--color-text-muted)',
            backgroundColor: 'rgba(255,255,255,0.85)',
            padding: '1px 4px',
            borderRadius: 2,
          }}
          onClick={startEdit}
        >
          {seconds}s
        </span>
      )}
    </div>
  );
}
