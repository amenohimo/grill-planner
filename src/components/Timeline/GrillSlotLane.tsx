import { useCallback, useMemo, useRef, useState, type MouseEvent } from 'react';
import type { SpawnPoint, DefeatPoint, GrillSlot, FrameTime } from '@/types';
import { secondsToFrames } from '@/utils/calculations';
import { useTimelineDrag } from '@/hooks/useTimelineDrag';
import { TIMELINE_HEIGHT, LANE_WIDTH, pixelYToFrame, frameToPixelY } from './coordinates';
import { SpawnMarker } from './SpawnMarker';
import { DefeatMarker } from './DefeatMarker';
import { RespawnConnector } from './RespawnConnector';
import { ActivePeriod } from './ActivePeriod';

interface GrillSlotLaneProps {
  slot: GrillSlot;
  spawns: readonly SpawnPoint[];
  defeats: readonly DefeatPoint[];
  inactiveAboveFrame?: FrameTime;
  onAddDefeat?: (slot: GrillSlot, frameTime: number) => boolean;
  onMoveDefeat?: (defeatId: string, frameTime: FrameTime) => void;
  onRemoveDefeat?: (defeatId: string) => void;
  validateMoveDefeat?: (defeatId: string, frameTime: FrameTime) => boolean;
}

export function GrillSlotLane({
  slot,
  spawns,
  defeats,
  inactiveAboveFrame,
  onAddDefeat,
  onMoveDefeat,
  onRemoveDefeat,
  validateMoveDefeat,
}: GrillSlotLaneProps) {
  const slotSpawns = useMemo(
    () => [...spawns.filter((s) => s.slot === slot)].sort((a, b) => b.frameTime - a.frameTime),
    [spawns, slot],
  );
  const slotDefeats = useMemo(
    () => [...defeats.filter((d) => d.slot === slot)].sort((a, b) => b.frameTime - a.frameTime),
    [defeats, slot],
  );
  const slotColor = slot === 'A' ? 'var(--color-slot-a)' : 'var(--color-slot-b)';
  const laneRef = useRef<HTMLDivElement>(null);

  // バリデーション失敗時のフィードバック
  const [invalidClick, setInvalidClick] = useState<{ x: number; y: number } | null>(null);

  // ドラッグ
  const validatePosition = useCallback(
    (defeatId: string, frameTime: FrameTime) => {
      return validateMoveDefeat?.(defeatId, frameTime) ?? true;
    },
    [validateMoveDefeat],
  );

  const handleDragEnd = useCallback(
    (defeatId: string, frameTime: FrameTime) => {
      onMoveDefeat?.(defeatId, frameTime);
    },
    [onMoveDefeat],
  );

  const { dragState, startDragCandidate, justFinishedDragRef } = useTimelineDrag(
    pixelYToFrame,
    validatePosition,
    handleDragEnd,
    laneRef,
  );

  const handleClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      // ドラッグ操作直後の click イベントを抑止（ref ベースで同期的に判定）
      if (justFinishedDragRef.current) return;
      if (!onAddDefeat || !laneRef.current) return;

      const rect = laneRef.current.getBoundingClientRect();
      const pixelY = e.clientY - rect.top;
      const frameTime = pixelYToFrame(pixelY);

      const success = onAddDefeat(slot, frameTime);
      if (!success) {
        setInvalidClick({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setTimeout(() => setInvalidClick(null), 500);
      }
    },
    [slot, onAddDefeat, justFinishedDragRef],
  );

  const handleDefeatMouseDown = useCallback(
    (defeatId: string, startY: number) => {
      startDragCandidate(defeatId, startY);
    },
    [startDragCandidate],
  );

  const handleDefeatContextMenu = useCallback(
    (defeatId: string) => {
      onRemoveDefeat?.(defeatId);
    },
    [onRemoveDefeat],
  );

  const handleDefeatTimeEdit = useCallback(
    (defeatId: string, newSeconds: number) => {
      const frameTime = secondsToFrames(newSeconds);
      const valid = validateMoveDefeat?.(defeatId, frameTime) ?? true;
      if (valid) {
        onMoveDefeat?.(defeatId, frameTime);
        return true;
      }
      return false;
    },
    [validateMoveDefeat, onMoveDefeat],
  );

  // 湧き-撃破ペアリング
  const spawnDefeatPairs = useMemo(() => {
    return slotSpawns.map((spawn, index) => ({
      spawn,
      defeat: slotDefeats[index] ?? null,
    }));
  }, [slotSpawns, slotDefeats]);

  // 撃破由来の湧き（RespawnConnector 用）
  const respawnSpawns = useMemo(
    () => slotSpawns.filter((s) => !s.isAuto && s.defeatId),
    [slotSpawns],
  );

  return (
    <div
      ref={laneRef}
      className="relative cursor-crosshair overflow-visible"
      style={{
        width: LANE_WIDTH,
        height: TIMELINE_HEIGHT,
        borderTop: `3px solid ${slotColor}`,
      }}
      onClick={handleClick}
    >
      {/* 枠ラベル */}
      <span
        className="absolute select-none text-sm font-bold"
        style={{ left: 4, top: 6, color: slotColor, zIndex: 5 }}
      >
        {slot}枠
      </span>

      {/* 活動期間バー（frameTime > 0 のみ） */}
      {spawnDefeatPairs
        .filter(({ spawn }) => spawn.frameTime > 0)
        .map(({ spawn, defeat }) => (
          <ActivePeriod
            key={`active-${spawn.id}`}
            spawnFrame={spawn.frameTime}
            defeatFrame={defeat?.frameTime ?? null}
            slot={slot}
          />
        ))}

      {/* リスポーン接続線（frameTime > 0 のみ） */}
      {respawnSpawns
        .filter((spawn) => spawn.frameTime > 0)
        .map((spawn) => {
          const defeat = defeats.find((d) => d.id === spawn.defeatId);
          if (!defeat) return null;
          return (
            <RespawnConnector
              key={`connector-${spawn.id}`}
              defeatFrame={defeat.frameTime}
              spawnFrame={spawn.frameTime}
            />
          );
        })}

      {/* 湧きマーカー（frameTime > 0 のみ） */}
      {slotSpawns
        .filter((spawn) => spawn.frameTime > 0)
        .map((spawn) => (
          <SpawnMarker key={spawn.id} spawn={spawn} />
        ))}

      {/* 撃破マーカー */}
      {slotDefeats.map((defeat) => (
        <DefeatMarker
          key={defeat.id}
          defeat={defeat}
          isDragging={dragState.isDragging && dragState.dragDefeatId === defeat.id}
          dragFrameTime={dragState.dragDefeatId === defeat.id ? dragState.dragFrameTime : null}
          isValidPosition={dragState.dragDefeatId === defeat.id ? dragState.isValidPosition : true}
          onMouseDown={handleDefeatMouseDown}
          onContextMenu={handleDefeatContextMenu}
          onTimeEdit={handleDefeatTimeEdit}
        />
      ))}

      {/* B枠の無効エリア（自動湧きより前） */}
      {inactiveAboveFrame != null && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0"
          style={{
            height: frameToPixelY(inactiveAboveFrame),
            backgroundColor: 'rgba(128, 128, 128, 0.3)',
            zIndex: 5,
          }}
        />
      )}

      {/* バリデーション失敗フィードバック */}
      {invalidClick && (
        <div
          className="absolute select-none text-lg font-bold text-danger"
          style={{
            left: invalidClick.x,
            top: invalidClick.y,
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          ✕
        </div>
      )}
    </div>
  );
}
