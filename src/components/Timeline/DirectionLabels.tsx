import { useState, useCallback, useRef, useEffect, useMemo, type KeyboardEvent } from 'react';
import type { DirectionSetting } from '@/types';
import { frameToPixelY, TIMELINE_HEIGHT, DIRECTION_LABEL_WIDTH, DIR_BAND_COLORS } from './coordinates';

const PRESET_NAMES = ['左', '正面', '右'] as const;

interface DirectionLabelsProps {
  directions: readonly DirectionSetting[];
  onUpdateName?: (index: number, name: string) => void;
}

export function DirectionLabels({ directions, onUpdateName }: DirectionLabelsProps) {
  const sortedDirs = directions
    .map((dir, originalIndex) => ({ ...dir, originalIndex }))
    .sort((a, b) => b.frameTime - a.frameTime);

  // 他の区間で使われている名前を収集（プリセット候補に使用）
  const usedNames = useMemo(() => {
    const names = new Set(directions.map((d) => d.direction));
    // プリセットに含まれる名前は除外
    for (const preset of PRESET_NAMES) {
      names.delete(preset);
    }
    return [...names];
  }, [directions]);

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

        return (
          <DirectionLabel
            key={index}
            top={top}
            height={height}
            bgColor={color}
            name={dir.direction}
            originalIndex={dir.originalIndex}
            usedNames={usedNames}
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
  usedNames: readonly string[];
  onUpdateName?: (index: number, name: string) => void;
}

function DirectionLabel({ top, height, bgColor, name, originalIndex, usedNames, onUpdateName }: DirectionLabelProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  // ポップオーバー外のクリックで閉じる
  useEffect(() => {
    if (!editing) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        confirmEdit();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  });

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

  const selectPreset = useCallback(
    (presetName: string) => {
      setEditing(false);
      if (presetName !== name) {
        onUpdateName?.(originalIndex, presetName);
      }
    },
    [name, originalIndex, onUpdateName],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        confirmEdit();
      } else if (e.key === 'Escape') {
        setEditing(false);
        setEditValue(name);
      }
    },
    [confirmEdit, name],
  );

  // 自分の名前以外の使用済み名前（追加プリセット候補）
  const extraPresets = usedNames.filter((n) => n !== name);

  return (
    <div
      className="absolute flex items-center justify-center overflow-visible"
      style={{
        top,
        height,
        width: DIRECTION_LABEL_WIDTH,
        backgroundColor: bgColor,
        left: 0,
      }}
    >
      <span
        className="cursor-pointer select-none truncate px-1 text-xs font-medium text-text hover:underline"
        onClick={startEdit}
        title={name}
      >
        {name}
      </span>

      {/* 編集ポップオーバー */}
      {editing && (
        <div
          ref={popoverRef}
          className="absolute flex items-center gap-1 rounded border border-border bg-surface p-1 shadow-sm"
          style={{
            left: DIRECTION_LABEL_WIDTH + 4,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 20,
            whiteSpace: 'nowrap',
          }}
        >
          {/* プリセットボタン */}
          {PRESET_NAMES.map((preset) => (
            <button
              key={preset}
              type="button"
              className="rounded px-1.5 py-0.5 text-xs hover:bg-primary hover:text-white"
              style={{
                backgroundColor: preset === name ? 'var(--color-primary)' : undefined,
                color: preset === name ? 'white' : undefined,
              }}
              onClick={() => selectPreset(preset)}
            >
              {preset}
            </button>
          ))}

          {/* 他区間で使用中の名前（追加プリセット） */}
          {extraPresets.map((extra) => (
            <button
              key={extra}
              type="button"
              className="rounded px-1.5 py-0.5 text-xs text-text-muted hover:bg-primary hover:text-white"
              onClick={() => selectPreset(extra)}
            >
              {extra}
            </button>
          ))}

          {/* 自由入力 */}
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={20}
            className="w-16 rounded border border-border bg-surface px-1 py-0.5 text-xs text-text outline-none"
            placeholder="入力"
          />
        </div>
      )}
    </div>
  );
}
