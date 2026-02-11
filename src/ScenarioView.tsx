import { useScenario } from '@/hooks/ScenarioContext'
import { useGrillCalculation } from '@/hooks/useGrillCalculation'
import { getHazardConfig, generateDefaultDirections } from '@/utils/calculations'
import { Timeline } from '@/components/Timeline'
import type { HazardConfigData } from '@/types'

interface ScenarioViewProps {
  hazardConfigData: HazardConfigData;
}

export function ScenarioView({ hazardConfigData }: ScenarioViewProps) {
  const { state, dispatch } = useScenario()
  const { hazardConfig, spawns, directionStats, totalGrillCount } = useGrillCalculation(state, hazardConfigData)

  const handleHazardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value)
    if (value >= 20 && value <= 333) {
      dispatch({ type: 'SET_HAZARD_LEVEL', payload: value })
      const newConfig = getHazardConfig(value, hazardConfigData)
      const newDirs = generateDefaultDirections(newConfig.directionInterval)
      dispatch({ type: 'SET_DIRECTIONS', payload: newDirs })
    }
  }

  return (
    <div className="min-h-screen bg-bg p-8">
      <h1 className="mb-6 text-2xl font-bold text-text">
        グリルプランナー
      </h1>

      {/* キケン度スライダー */}
      <div className="mb-4 flex items-center gap-4">
        <label className="text-sm font-medium text-text">キケン度:</label>
        <input
          type="range"
          min={20}
          max={333}
          value={state.hazardLevel}
          onChange={handleHazardChange}
          className="w-64"
        />
        <input
          type="number"
          min={20}
          max={333}
          value={state.hazardLevel}
          onChange={handleHazardChange}
          className="w-20 rounded-sm border border-border bg-surface px-2 py-1 text-text"
        />
        <span className="text-text-muted">{state.hazardLevel}%</span>
      </div>

      {/* 統計サマリ */}
      <div className="mb-4 flex flex-wrap gap-3 text-sm text-text-muted">
        <span>方面: {state.directions.length}</span>
        <span>湧き点: {spawns.length}</span>
        <span>グリル合計: {totalGrillCount}</span>
        <span className="text-border">|</span>
        {directionStats.map((s, i) => (
          <span key={i}>{s.direction}: {s.count}</span>
        ))}
      </div>

      {/* タイムライン */}
      <Timeline
        spawns={spawns}
        defeats={state.defeats}
        directions={state.directions}
        hazardConfig={hazardConfig}
      />
    </div>
  )
}
