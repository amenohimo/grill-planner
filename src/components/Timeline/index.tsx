import { useCallback, useMemo, useRef, useState } from "react";
import { getWeaponIconPath } from "@/constants";
import { useScenario } from "@/hooks/ScenarioContext";
import { useValidation } from "@/hooks/useValidation";
import type {
  DefeatPoint,
  DirectionId,
  DirectionSetting,
  DisplayMode,
  FrameTime,
  GrillSlot,
  InterpolatedHazardConfig,
  SpawnPoint,
  WeaponMaster,
} from "@/types";
import { findCascadeRemovals, getAffectedDefeats } from "@/utils/validation";
import { LANE_SPACING, LANE_WIDTH, TIMELINE_PADDING } from "./coordinates";
import { DirectionBands } from "./DirectionBands";
import { DirectionLabels } from "./DirectionLabels";
import { GrillSlotLane } from "./GrillSlotLane";
import type { SpawnDisplayInfo } from "./SpawnMarker";
import { TimeAxis } from "./TimeAxis";

interface TimelineProps {
  spawns: readonly SpawnPoint[];
  defeats: readonly DefeatPoint[];
  directions: readonly DirectionSetting[];
  hazardConfig: InterpolatedHazardConfig;
  directionPresets: readonly [string, string, string];
  targetOrder: readonly string[];
  weapons: readonly string[];
  weaponMaster: readonly WeaponMaster[];
  displayMode: DisplayMode;
  scaleX: number;
  scaleY: number;
  onFileDrop?: (file: File) => void;
}

export function Timeline({
  spawns,
  defeats,
  directions,
  hazardConfig,
  directionPresets,
  targetOrder,
  weapons,
  weaponMaster,
  displayMode,
  scaleX,
  scaleY,
  onFileDrop,
}: TimelineProps) {
  const { dispatch } = useScenario();
  const { canAddDefeat, canMoveDefeat } = useValidation(defeats, hazardConfig, directions);
  const defeatCounterRef = useRef(0);

  const showBSlot = hazardConfig.bSlotOpenFrame >= 0;
  const scaledLaneWidth = LANE_WIDTH * scaleX;
  const scaledLaneSpacing = Math.max(LANE_SPACING * scaleX, 2);
  const scaledPadding = Math.max(TIMELINE_PADDING * scaleY, 8);
  const lanesWidth = showBSlot ? scaledLaneWidth * 2 + scaledLaneSpacing : scaledLaneWidth;

  // 湧きの通し番号（A枠+B枠合わせてframeTime降順）
  const spawnDisplayMap: ReadonlyMap<string, SpawnDisplayInfo> = useMemo(() => {
    const allSpawns = [...spawns].filter((s) => s.frameTime > 0).sort((a, b) => b.frameTime - a.frameTime);

    const map = new Map<string, SpawnDisplayInfo>();
    for (let i = 0; i < allSpawns.length; i++) {
      const spawn = allSpawns[i]!;
      const directionName = directionPresets[spawn.direction] ?? `方面${spawn.direction + 1}`;

      let targetLabel: string | null = null;
      let targetIcon: string | null = null;
      const targetEntry = targetOrder[i];
      if (targetEntry && targetEntry !== "-") {
        targetLabel = targetEntry;
        const playerIndex = Number.parseInt(targetEntry[0]!, 10) - 1;
        const weaponRowId = weapons[playerIndex];
        if (weaponRowId) {
          const weapon = weaponMaster.find((w) => w.rowId === weaponRowId);
          targetIcon = weapon ? getWeaponIconPath(weapon.id) : null;
        }
      }

      map.set(spawn.id, { directionName, targetLabel, targetIcon });
    }
    return map;
  }, [spawns, directionPresets, targetOrder, weapons, weaponMaster]);

  const handleAddDefeat = useCallback(
    (slot: GrillSlot, frameTime: number): boolean => {
      const id = `defeat-${Date.now()}-${defeatCounterRef.current++}`;
      const newDefeat: DefeatPoint = { id, slot, frameTime };

      const result = canAddDefeat(newDefeat);
      if (!result.valid) return false;

      dispatch({ type: "ADD_DEFEAT", payload: newDefeat });
      return true;
    },
    [canAddDefeat, dispatch],
  );

  const handleMoveDefeat = useCallback(
    (defeatId: string, frameTime: FrameTime) => {
      const affected = getAffectedDefeats(defeatId, frameTime, defeats);
      if (affected.length > 0) {
        dispatch({ type: "REMOVE_DEFEATS", payload: affected.map((d) => d.id) });
      }
      dispatch({ type: "MOVE_DEFEAT", payload: { id: defeatId, frameTime } });
    },
    [defeats, dispatch],
  );

  const handleRemoveDefeat = useCallback(
    (defeatId: string) => {
      const cascadeIds = findCascadeRemovals(defeatId, defeats, hazardConfig, directions);
      dispatch({ type: "REMOVE_DEFEATS", payload: cascadeIds });
    },
    [defeats, hazardConfig, directions, dispatch],
  );

  const handleUpdateDirection = useCallback(
    (index: number, directionId: DirectionId) => {
      dispatch({ type: "UPDATE_DIRECTION", payload: { index, directionId } });
    },
    [dispatch],
  );

  const validateMoveDefeat = useCallback(
    (defeatId: string, frameTime: FrameTime): boolean => {
      const result = canMoveDefeat(defeatId, frameTime);
      return result.valid;
    },
    [canMoveDefeat],
  );

  const validateLinkedMove = useCallback(
    (moves: ReadonlyArray<{ defeatId: string; frameTime: FrameTime }>): boolean => {
      return moves.every((m) => m.frameTime > 0 && m.frameTime < 6000 && canMoveDefeat(m.defeatId, m.frameTime).valid);
    },
    [canMoveDefeat],
  );

  const handleLinkedMoveDefeats = useCallback(
    (moves: ReadonlyArray<{ defeatId: string; frameTime: FrameTime }>) => {
      dispatch({
        type: "MOVE_DEFEATS_BATCH",
        payload: moves.map((m) => ({ id: m.defeatId, frameTime: m.frameTime })),
      });
    },
    [dispatch],
  );

  // ドラッグ&ドロップ
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        onFileDrop?.(file);
      }
    },
    [onFileDrop],
  );

  return (
    <div
      className="relative rounded-sm border border-border bg-surface"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ドラッグオーバー時のオーバーレイ */}
      {isDragOver && (
        <div
          className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center rounded-sm"
          style={{
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            border: "2px dashed var(--color-primary)",
          }}
        >
          <span className="rounded-md bg-surface px-4 py-2 text-sm font-medium text-primary shadow-sm">
            ドロップしてインポート
          </span>
        </div>
      )}
      <div
        className="flex"
        style={{
          paddingTop: scaledPadding,
          paddingBottom: scaledPadding,
        }}
      >
        {/* 方面ラベル */}
        <DirectionLabels
          directions={directions}
          presetNames={directionPresets}
          onUpdateDirection={handleUpdateDirection}
          scaleX={scaleX}
          scaleY={scaleY}
        />

        {/* 時間軸 */}
        <TimeAxis scaleX={scaleX} scaleY={scaleY} />

        {/* レーン領域（方面バンド背景付き） */}
        <div className="relative" style={{ width: lanesWidth }}>
          {/* 方面バンド（背景） */}
          <DirectionBands directions={directions} scaleY={scaleY} />

          {/* 操作説明（レーン右側） */}
          <div
            className="pointer-events-none absolute select-none"
            style={{
              left: lanesWidth + 20,
              top: 8,
              zIndex: 0,
            }}
          >
            <div
              className="rounded-md border border-border px-3 py-2"
              style={{
                fontSize: 11,
                color: "var(--color-text-muted)",
                lineHeight: 1.6,
                backgroundColor: "var(--color-bg)",
                whiteSpace: "nowrap",
              }}
            >
              <div className="mb-1 text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                操作方法
              </div>
              <div>クリック: 撃破追加</div>
              <div>ドラッグ: 撃破移動</div>
              <div>Shift+ドラッグ: 後続撃破も連動移動</div>
              <div>Shift+Enter: 時間入力でも連動移動</div>
              <div>右クリック: 撃破削除</div>

              {/* 凡例 */}
              <div className="mt-2 border-t border-border pt-2">
                <div className="mb-1 text-xs font-medium">凡例</div>
                <div className="flex items-center gap-1.5">
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: "var(--color-spawn)",
                      border: "1px solid var(--color-border)",
                      flexShrink: 0,
                    }}
                  />
                  <span>湧き</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      backgroundColor: "var(--color-defeat)",
                      transform: "rotate(45deg)",
                      flexShrink: 0,
                    }}
                  />
                  <span>撃破</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        backgroundColor: "var(--color-spawner-decision)",
                        border: "1px solid var(--color-respawn-line)",
                      }}
                    />
                  </div>
                  <span>スポナー確定</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      border: "1px solid var(--color-border)",
                      background: `repeating-linear-gradient(
                        -45deg,
                        var(--color-spawn), var(--color-spawn) 2px,
                        rgba(255,255,255,0.6) 2px, rgba(255,255,255,0.6) 4px
                      )`,
                      flexShrink: 0,
                    }}
                  />
                  <span>湧き（抑制）</span>
                </div>
              </div>
            </div>
          </div>

          {/* レーン（前面） */}
          <div className="relative flex" style={{ zIndex: 1 }}>
            <GrillSlotLane
              slot="A"
              spawns={spawns}
              defeats={defeats}
              spawnDisplayMap={spawnDisplayMap}
              displayMode={displayMode}
              scaleX={scaleX}
              scaleY={scaleY}
              onAddDefeat={handleAddDefeat}
              onMoveDefeat={handleMoveDefeat}
              onLinkedMoveDefeats={handleLinkedMoveDefeats}
              onRemoveDefeat={handleRemoveDefeat}
              validateMoveDefeat={validateMoveDefeat}
              validateLinkedMove={validateLinkedMove}
            />
            {showBSlot && (
              <>
                <div style={{ width: scaledLaneSpacing }} />
                <GrillSlotLane
                  slot="B"
                  spawns={spawns}
                  defeats={defeats}
                  spawnDisplayMap={spawnDisplayMap}
                  displayMode={displayMode}
                  scaleX={scaleX}
                  scaleY={scaleY}
                  inactiveAboveFrame={hazardConfig.bSlotOpenFrame}
                  onAddDefeat={handleAddDefeat}
                  onMoveDefeat={handleMoveDefeat}
                  onLinkedMoveDefeats={handleLinkedMoveDefeats}
                  onRemoveDefeat={handleRemoveDefeat}
                  validateMoveDefeat={validateMoveDefeat}
                  validateLinkedMove={validateLinkedMove}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
