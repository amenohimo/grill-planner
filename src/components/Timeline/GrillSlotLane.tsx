import { type MouseEvent, useCallback, useMemo, useRef, useState } from "react";
import { useTimelineDrag } from "@/hooks/useTimelineDrag";
import type { DefeatPoint, DisplayMode, FrameTime, GrillSlot, SpawnPoint } from "@/types";
import { secondsToFrames } from "@/utils/calculations";
import { ActivePeriod } from "./ActivePeriod";
import {
  getDirectionColor,
  LANE_WIDTH,
  scaledFrameToPixelY,
  scaledPixelYToFrame,
  TIMELINE_HEIGHT,
} from "./coordinates";
import { DefeatMarker } from "./DefeatMarker";
import { ElapsedTimeLabel } from "./ElapsedTimeLabel";
import { RespawnConnector } from "./RespawnConnector";
import type { SpawnDisplayInfo } from "./SpawnMarker";
import { SpawnMarker } from "./SpawnMarker";

interface GrillSlotLaneProps {
  slot: GrillSlot;
  spawns: readonly SpawnPoint[];
  defeats: readonly DefeatPoint[];
  spawnDisplayMap: ReadonlyMap<string, SpawnDisplayInfo>;
  displayMode: DisplayMode;
  scaleX: number;
  scaleY: number;
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
  spawnDisplayMap,
  displayMode,
  scaleX,
  scaleY,
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
  const slotColor = slot === "A" ? "var(--color-slot-a)" : "var(--color-slot-b)";
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

  const scaledPixelYToFrameFn = useCallback((pixelY: number) => scaledPixelYToFrame(pixelY, scaleY), [scaleY]);

  const { dragState, startDragCandidate, justFinishedDragRef } = useTimelineDrag(
    scaledPixelYToFrameFn,
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
      const frameTime = scaledPixelYToFrame(pixelY, scaleY);

      const success = onAddDefeat(slot, frameTime);
      if (!success) {
        setInvalidClick({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setTimeout(() => setInvalidClick(null), 500);
      }
    },
    [slot, scaleY, onAddDefeat, justFinishedDragRef],
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
  const respawnSpawns = useMemo(() => slotSpawns.filter((s) => !s.isAuto && s.defeatId), [slotSpawns]);

  const scaledLaneWidth = LANE_WIDTH * scaleX;
  const scaledTimelineHeight = TIMELINE_HEIGHT * scaleY;

  return (
    <div
      ref={laneRef}
      className="relative cursor-crosshair overflow-visible"
      style={{
        width: scaledLaneWidth,
        height: scaledTimelineHeight,
        borderTop: `3px solid ${slotColor}`,
      }}
      onClick={handleClick}
    >
      {/* 活動期間バー（frameTime > 0 のみ） */}
      {spawnDefeatPairs
        .filter(({ spawn }) => spawn.frameTime > 0)
        .map(({ spawn, defeat }) => (
          <ActivePeriod
            key={`active-${spawn.id}`}
            spawnFrame={spawn.frameTime}
            defeatFrame={defeat?.frameTime ?? null}
            slot={slot}
            scaleX={scaleX}
            scaleY={scaleY}
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
              scaleX={scaleX}
              scaleY={scaleY}
            />
          );
        })}

      {/* 湧きマーカー（frameTime > 0 のみ） */}
      {slotSpawns
        .filter((spawn) => spawn.frameTime > 0)
        .map((spawn) => (
          <SpawnMarker
            key={spawn.id}
            spawn={spawn}
            displayInfo={spawnDisplayMap.get(spawn.id)}
            displayMode={displayMode}
            scaleX={scaleX}
            scaleY={scaleY}
          />
        ))}

      {/* 経過時間ラベル */}
      {spawnDefeatPairs.map(({ spawn, defeat }) => {
        if (spawn.frameTime <= 0 || !defeat) return null;
        return (
          <ElapsedTimeLabel
            key={`elapsed-${spawn.id}`}
            spawnFrame={spawn.frameTime}
            defeatFrame={defeat.frameTime}
            defeatId={defeat.id}
            directionColor={getDirectionColor(spawn.direction)}
            scaleX={scaleX}
            scaleY={scaleY}
            onTimeEdit={handleDefeatTimeEdit}
          />
        );
      })}

      {/* 撃破マーカー */}
      {slotDefeats.map((defeat) => (
        <DefeatMarker
          key={defeat.id}
          defeat={defeat}
          isDragging={dragState.isDragging && dragState.dragDefeatId === defeat.id}
          dragFrameTime={dragState.dragDefeatId === defeat.id ? dragState.dragFrameTime : null}
          isValidPosition={dragState.dragDefeatId === defeat.id ? dragState.isValidPosition : true}
          scaleX={scaleX}
          scaleY={scaleY}
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
            height: scaledFrameToPixelY(inactiveAboveFrame, scaleY),
            backgroundColor: "rgba(128, 128, 128, 0.3)",
            zIndex: 2,
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
            transform: "translate(-50%, -50%)",
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          ✕
        </div>
      )}
    </div>
  );
}
