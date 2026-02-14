import { type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTimelineDrag } from "@/hooks/useTimelineDrag";
import type { DefeatPoint, DisplayMode, FrameTime, GrillSlot, SpawnPoint } from "@/types";
import { secondsToFrames } from "@/utils/calculations";
import { ActivePeriod } from "./ActivePeriod";
import { LANE_WIDTH, scaledFrameToPixelY, scaledPixelYToFrame, TIMELINE_HEIGHT } from "./coordinates";
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
  onLinkedMoveDefeats?: (moves: ReadonlyArray<{ defeatId: string; frameTime: FrameTime }>) => void;
  onRemoveDefeat?: (defeatId: string) => void;
  validateMoveDefeat?: (defeatId: string, frameTime: FrameTime) => boolean;
  validateLinkedMove?: (moves: ReadonlyArray<{ defeatId: string; frameTime: FrameTime }>) => boolean;
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
  onLinkedMoveDefeats,
  onRemoveDefeat,
  validateMoveDefeat,
  validateLinkedMove,
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

  // Shift ホバーハイライト
  const [shiftHeld, setShiftHeld] = useState(false);
  const [hoveredDefeatId, setHoveredDefeatId] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShiftHeld(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShiftHeld(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const linkedHighlightIds = useMemo(() => {
    if (!shiftHeld || !hoveredDefeatId) return new Set<string>();
    const target = slotDefeats.find((d) => d.id === hoveredDefeatId);
    if (!target) return new Set<string>();
    return new Set(
      slotDefeats.filter((d) => d.id !== hoveredDefeatId && d.frameTime < target.frameTime).map((d) => d.id),
    );
  }, [shiftHeld, hoveredDefeatId, slotDefeats]);

  // ドラッグ
  const validatePosition = useCallback(
    (defeatId: string, frameTime: FrameTime) => {
      return validateMoveDefeat?.(defeatId, frameTime) ?? true;
    },
    [validateMoveDefeat],
  );

  const validateLinkedPosition = useCallback(
    (moves: ReadonlyArray<{ defeatId: string; frameTime: FrameTime }>) => {
      return validateLinkedMove?.(moves) ?? true;
    },
    [validateLinkedMove],
  );

  const handleDragEnd = useCallback(
    (defeatId: string, frameTime: FrameTime) => {
      onMoveDefeat?.(defeatId, frameTime);
    },
    [onMoveDefeat],
  );

  const handleLinkedDragEnd = useCallback(
    (moves: ReadonlyArray<{ defeatId: string; frameTime: FrameTime }>) => {
      onLinkedMoveDefeats?.(moves);
    },
    [onLinkedMoveDefeats],
  );

  const getLinkedDefeats = useCallback(
    (defeatId: string) => {
      const target = slotDefeats.find((d) => d.id === defeatId);
      if (!target) return [];
      return slotDefeats.filter((d) => d.id !== defeatId && d.frameTime < target.frameTime);
    },
    [slotDefeats],
  );

  const scaledPixelYToFrameFn = useCallback((pixelY: number) => scaledPixelYToFrame(pixelY, scaleY), [scaleY]);

  const { dragState, startDragCandidate, justFinishedDragRef } = useTimelineDrag(
    scaledPixelYToFrameFn,
    validatePosition,
    validateLinkedPosition,
    handleDragEnd,
    handleLinkedDragEnd,
    getLinkedDefeats,
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
    (defeatId: string, startY: number, shiftKey: boolean) => {
      const defeat = slotDefeats.find((d) => d.id === defeatId);
      startDragCandidate(defeatId, startY, shiftKey, defeat?.frameTime ?? 0);
    },
    [startDragCandidate, slotDefeats],
  );

  const handleDefeatContextMenu = useCallback(
    (defeatId: string) => {
      onRemoveDefeat?.(defeatId);
    },
    [onRemoveDefeat],
  );

  const handleDefeatTimeEdit = useCallback(
    (defeatId: string, newSeconds: number, isLinked: boolean): boolean => {
      const frameTime = secondsToFrames(newSeconds);
      const valid = validateMoveDefeat?.(defeatId, frameTime) ?? true;
      if (!valid) return false;

      if (isLinked) {
        const target = slotDefeats.find((d) => d.id === defeatId);
        if (!target) return false;
        const delta = frameTime - target.frameTime;
        const linked = slotDefeats.filter((d) => d.id !== defeatId && d.frameTime < target.frameTime);
        const allMoves = [
          { defeatId, frameTime },
          ...linked.map((d) => ({ defeatId: d.id, frameTime: d.frameTime + delta })),
        ];
        const allValid = allMoves.every((m) => {
          if (m.frameTime <= 0 || m.frameTime >= 6000) return false;
          return validateMoveDefeat?.(m.defeatId, m.frameTime) ?? true;
        });
        if (!allValid) return false;
        onLinkedMoveDefeats?.(allMoves);
      } else {
        onMoveDefeat?.(defeatId, frameTime);
      }
      return true;
    },
    [validateMoveDefeat, onMoveDefeat, onLinkedMoveDefeats, slotDefeats],
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
            scaleX={scaleX}
            scaleY={scaleY}
            onTimeEdit={handleDefeatTimeEdit}
          />
        );
      })}

      {/* 撃破マーカー */}
      {slotDefeats.map((defeat) => {
        const isLinkedPreview =
          dragState.isLinkedMode && dragState.linkedDefeats.some((lp) => lp.defeatId === defeat.id);
        const linkedPreviewFrame = isLinkedPreview
          ? (dragState.linkedDefeats.find((lp) => lp.defeatId === defeat.id)?.newFrameTime ?? null)
          : null;

        return (
          <DefeatMarker
            key={defeat.id}
            defeat={defeat}
            isDragging={dragState.isDragging && dragState.dragDefeatId === defeat.id}
            dragFrameTime={dragState.dragDefeatId === defeat.id ? dragState.dragFrameTime : null}
            isValidPosition={dragState.dragDefeatId === defeat.id ? dragState.isValidPosition : true}
            isLinkedPreview={isLinkedPreview}
            linkedPreviewFrameTime={linkedPreviewFrame}
            isLinkedHighlight={linkedHighlightIds.has(defeat.id)}
            scaleX={scaleX}
            scaleY={scaleY}
            onMouseDown={handleDefeatMouseDown}
            onContextMenu={handleDefeatContextMenu}
            onTimeEdit={handleDefeatTimeEdit}
            onHoverChange={(hovered) => setHoveredDefeatId(hovered ? defeat.id : null)}
          />
        );
      })}

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
