import { useCallback } from "react";
import type { DefeatPoint, DirectionSetting, InterpolatedHazardConfig } from "@/types";
import { validateAddDefeat, validateMoveDefeat } from "@/utils/validation";

export function useValidation(
  defeats: readonly DefeatPoint[],
  hazardConfig: InterpolatedHazardConfig,
  directions: readonly DirectionSetting[],
) {
  const canAddDefeat = useCallback(
    (newDefeat: DefeatPoint) => {
      return validateAddDefeat(newDefeat, defeats, hazardConfig, directions);
    },
    [defeats, hazardConfig, directions],
  );

  const canMoveDefeat = useCallback(
    (defeatId: string, newFrameTime: number) => {
      return validateMoveDefeat(defeatId, newFrameTime, defeats, hazardConfig, directions);
    },
    [defeats, hazardConfig, directions],
  );

  return { canAddDefeat, canMoveDefeat };
}
