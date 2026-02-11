import { useMemo } from 'react';
import type { ScenarioData, HazardConfigData, InterpolatedHazardConfig, SpawnPoint, DirectionStats } from '@/types';
import { getHazardConfig, calculateSpawns } from '@/utils/calculations';
import { calculateDirectionStats } from '@/utils/statistics';

export interface GrillCalculationResult {
  hazardConfig: InterpolatedHazardConfig;
  spawns: readonly SpawnPoint[];
  directionStats: readonly DirectionStats[];
  totalGrillCount: number;
}

export function useGrillCalculation(
  scenario: ScenarioData,
  hazardConfigData: HazardConfigData,
): GrillCalculationResult {
  return useMemo(() => {
    const hazardConfig = getHazardConfig(scenario.hazardLevel, hazardConfigData);
    const spawns = calculateSpawns(hazardConfig, scenario.directions, scenario.defeats);
    const stats = calculateDirectionStats(spawns, scenario.defeats, scenario.directions);
    const totalGrillCount = stats.reduce((sum, s) => sum + s.count, 0);

    return { hazardConfig, spawns, directionStats: stats, totalGrillCount };
  }, [scenario.hazardLevel, scenario.directions, scenario.defeats, hazardConfigData]);
}
