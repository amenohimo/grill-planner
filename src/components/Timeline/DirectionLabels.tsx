import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from 'react';
import type { DirectionSetting } from '@/types';
import { frameToPixelY, TIMELINE_HEIGHT, DIRECTION_LABEL_WIDTH, DIR_BAND_COLORS } from './coordinates';

interface DirectionLabelsProps {
  directions: readonly DirectionSetting[];
  onUpdateName?: (index: number, name: string) => void;
}

export function DirectionLabels({ directions, onUpdateName }: DirectionLabelsProps) {
  const sortedDirs = [...directions].sort((a, b) => b.frameTime - a.frameTime);

  return (
    <div
      className="relative"
      style={{ width: DIRECTION_LABEL_WIDTH, height: TIMELINE_HEIGHT }}
    >
      {sortedDirs.map((dir, index) => {
        const top = frameToPixelY(dir.frameTime);
        const nextDir = sortedDirs[index + 1];
        const bottom = nextDir ? frameToPixelY(nextDir.frameTime) : TIMELINE_HEIGHT;
        const height = bottom - top;
        const color = DIR_BAND_COLORS[index % DIR_BAND_COLORS.length] ?? DIR_BAND_COLORS[0];

        // 元のインデックスを見つける（directions配列内の位置）
        const originalIndex = directions.findIndex(
          (d) => d.frameTime === dir.frameTime && d.direction === dir.direction,
        );

        return (
          <DirectionLabel
            key={index}
            top={top}
            height={height}
            bgColor={color}
            name={dir.direction}
            originalIndex={originalIndex >= 0 ? originalIndex : index}
            onUpdateName={onUpdateName}
          />
        );
      })}
    </div>
  );
}

interface DirectionLabelProps {
  top: number;
  height: number;
  bgColor: string;
  name: string;
  originalIndex: number;
  onUpdateName?: (index: number, name: string) => void;
}

function DirectionLabel({ top, height, bgColor, name, originalIndex, onUpdateName }: DirectionLabelProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const startEdit = useCallback(() => {
    if (!onUpdateName) return;
    setEditValue(name);
    setEditing(true);
  }, [name, onUpdateName]);

  const confirmEdit = useCallback(() => {
    setEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== name) {
      onUpdateName?.(originalIndex, trimmed);
    }
  }, [editValue, name, originalIndex, onUpdateName]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setEditValue(name);
  }, [name]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        confirmEdit();
      } else if (e.key === 'Escape') {
        cancelEdit();
      }
    },
    [confirmEdit, cancelEdit],
  );

  return (
    <div
      className="absolute flex items-center justify-center overflow-hidden"
      style={{
        top,
        height,
        width: DIRECTION_LABEL_WIDTH,
        backgroundColor: bgColor,
        left: 0,
      }}
    >
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={confirmEdit}
          onKeyDown={handleKeyDown}
          maxLength={20}
          className="w-full bg-transparent px-0.5 text-center text-xs font-medium text-text outline-none"
        />
      ) : (
        <span
          className="cursor-pointer select-none truncate px-0.5 text-xs font-medium text-text hover:underline"
          onClick={startEdit}
          title={name}
        >
          {name}
        </span>
      )}
    </div>
  );
}
