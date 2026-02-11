import { useCallback } from 'react';
import type { SpawnPoint, DefeatPoint, DirectionSetting, InterpolatedHazardConfig, GrillSlot, FrameTime } from '@/types';
import { useScenario } from '@/hooks/ScenarioContext';
import { useValidation } from '@/hooks/useValidation';
import { getAffectedDefeats, findCascadeRemovals } from '@/utils/validation';
import { TimeAxis } from './TimeAxis';
import { DirectionBands } from './DirectionBands';
import { DirectionLabels } from './DirectionLabels';
import { GrillSlotLane } from './GrillSlotLane';
import { TIMELINE_PADDING, LANE_WIDTH, LANE_SPACING } from './coordinates';

interface TimelineProps {
  spawns: readonly SpawnPoint[];
  defeats: readonly DefeatPoint[];
  directions: readonly DirectionSetting[];
  hazardConfig: InterpolatedHazardConfig;
}

let defeatCounter = 0;

export function Timeline({ spawns, defeats, directions, hazardConfig }: TimelineProps) {
  const { dispatch } = useScenario();
  const { canAddDefeat, canMoveDefeat } = useValidation(defeats, hazardConfig, directions);

  const showBSlot = hazardConfig.bSlotOpenFrame >= 0;
  const lanesWidth = showBSlot
    ? LANE_WIDTH * 2 + LANE_SPACING
    : LANE_WIDTH;

  const handleAddDefeat = useCallback(
    (slot: GrillSlot, frameTime: number): boolean => {
      const id = `defeat-${Date.now()}-${defeatCounter++}`;
      const newDefeat: DefeatPoint = { id, slot, frameTime };

      const result = canAddDefeat(newDefeat);
      if (!result.valid) return false;

      dispatch({ type: 'ADD_DEFEAT', payload: newDefeat });
      return true;
    },
    [canAddDefeat, dispatch],
  );

  const handleMoveDefeat = useCallback(
    (defeatId: string, frameTime: FrameTime) => {
      // 影響を受ける撃破点を取得してカスケード削除
      const affected = getAffectedDefeats(defeatId, frameTime, defeats);
      if (affected.length > 0) {
        dispatch({ type: 'REMOVE_DEFEATS', payload: affected.map((d) => d.id) });
      }
      dispatch({ type: 'MOVE_DEFEAT', payload: { id: defeatId, frameTime } });
    },
    [defeats, dispatch],
  );

  const handleRemoveDefeat = useCallback(
    (defeatId: string) => {
      const cascadeIds = findCascadeRemovals(defeatId, defeats, hazardConfig, directions);
      dispatch({ type: 'REMOVE_DEFEATS', payload: cascadeIds });
    },
    [defeats, hazardConfig, directions, dispatch],
  );

  const handleUpdateDirectionName = useCallback(
    (index: number, name: string) => {
      dispatch({ type: 'UPDATE_DIRECTION_NAME', payload: { index, name } });
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

  return (
    <div className="h-full overflow-y-auto rounded-sm border border-border bg-surface">
      <div
        className="flex"
        style={{
          paddingTop: TIMELINE_PADDING,
          paddingBottom: TIMELINE_PADDING,
        }}
      >
        {/* 方面ラベル */}
        <DirectionLabels
          directions={directions}
          onUpdateName={handleUpdateDirectionName}
        />

        {/* 時間軸 */}
        <TimeAxis />

        {/* レーン領域（方面バンド背景付き） */}
        <div className="relative" style={{ width: lanesWidth }}>
          {/* 方面バンド（背景） */}
          <DirectionBands directions={directions} />

          {/* レーン（前面） */}
          <div className="relative flex" style={{ zIndex: 1 }}>
            <GrillSlotLane
              slot="A"
              spawns={spawns}
              defeats={defeats}
              onAddDefeat={handleAddDefeat}
              onMoveDefeat={handleMoveDefeat}
              onRemoveDefeat={handleRemoveDefeat}
              validateMoveDefeat={validateMoveDefeat}
            />
            {showBSlot && (
              <>
                <div style={{ width: LANE_SPACING }} />
                <GrillSlotLane
                  slot="B"
                  spawns={spawns}
                  defeats={defeats}
                  onAddDefeat={handleAddDefeat}
                  onMoveDefeat={handleMoveDefeat}
                  onRemoveDefeat={handleRemoveDefeat}
                  validateMoveDefeat={validateMoveDefeat}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
