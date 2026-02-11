import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from 'react';
import type { DirectionSetting } from '@/types';
import { frameToPixelX, TIMELINE_WIDTH, DIRECTION_LABEL_HEIGHT, DIR_BAND_COLORS } from './coordinates';

interface DirectionLabelsProps {
  directions: readonly DirectionSetting[];
  onUpdateName?: (index: number, name: string) => void;
}

export function DirectionLabels({ directions, onUpdateName }: DirectionLabelsProps) {
  const sortedDirs = [...directions].sort((a, b) => b.frameTime - a.frameTime);

  return (
    <div
      className="relative"
      style={{ width: TIMELINE_WIDTH, height: DIRECTION_LABEL_HEIGHT }}
    >
      {sortedDirs.map((dir, index) => {
        const left = frameToPixelX(dir.frameTime);
        const nextDir = sortedDirs[index + 1];
        const right = nextDir ? frameToPixelX(nextDir.frameTime) : TIMELINE_WIDTH;
        const width = right - left;
        const color = DIR_BAND_COLORS[index % DIR_BAND_COLORS.length] ?? DIR_BAND_COLORS[0];

        // 元のインデックスを見つける（directions配列内の位置）
        const originalIndex = directions.findIndex(
          (d) => d.frameTime === dir.frameTime && d.direction === dir.direction,
        );

        return (
          <DirectionLabel
            key={index}
            left={left}
            width={width}
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
  left: number;
  width: number;
  bgColor: string;
  name: string;
  originalIndex: number;
  onUpdateName?: (index: number, name: string) => void;
}

function DirectionLabel({ left, width, bgColor, name, originalIndex, onUpdateName }: DirectionLabelProps) {
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
        left,
        width,
        height: DIRECTION_LABEL_HEIGHT,
        backgroundColor: bgColor,
        top: 0,
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
          className="w-full bg-transparent px-1 text-center text-xs font-medium text-text outline-none"
          style={{ maxWidth: width - 4 }}
        />
      ) : (
        <span
          className="cursor-pointer select-none truncate px-1 text-xs font-medium text-text hover:underline"
          onClick={startEdit}
          title={name}
        >
          {name}
        </span>
      )}
    </div>
  );
}
