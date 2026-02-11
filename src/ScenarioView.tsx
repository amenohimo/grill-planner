import { useScenario } from '@/hooks/ScenarioContext'
import { useGrillCalculation } from '@/hooks/useGrillCalculation'
import { getHazardConfig, generateDefaultDirections } from '@/utils/calculations'
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
      // 方面設定を再生成
      const newConfig = getHazardConfig(value, hazardConfigData)
      const newDirs = generateDefaultDirections(newConfig.directionInterval)
      dispatch({ type: 'SET_DIRECTIONS', payload: newDirs })
    }
  }

  return (
    <div className="min-h-screen bg-bg p-8">
      <h1 className="mb-6 text-2xl font-bold text-text">
        グリルプランナー — Phase 3
      </h1>

      <div className="mb-6 flex items-center gap-4">
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

      <div className="grid max-w-2xl gap-4">
        <div className="rounded-sm border border-border bg-surface p-4">
          <p className="text-sm text-text-muted">方面区間数</p>
          <p className="text-3xl font-bold text-text">{state.directions.length}</p>
          <p className="mt-1 text-xs text-text-muted">
            interval: {hazardConfig.directionInterval.toFixed(1)}s / WaveChangeNum: {hazardConfig.waveChangeNum}
          </p>
        </div>

        <div className="rounded-sm border border-border bg-surface p-4">
          <p className="text-sm text-text-muted">湧き点</p>
          <p className="text-3xl font-bold text-text">{spawns.length}</p>
          <p className="mt-1 text-xs text-text-muted">
            B枠: {hazardConfig.bSlotOpenFrame >= 0 ? '有' : '無'}
          </p>
        </div>

        <div className="rounded-sm border border-border bg-surface p-4">
          <p className="text-sm text-text-muted">グリル合計</p>
          <p className="text-3xl font-bold text-text">{totalGrillCount}</p>
          <div className="mt-1 text-xs text-text-muted">
            {directionStats.map((s, i) => (
              <span key={i} className="mr-2">{s.direction}:{s.count}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
