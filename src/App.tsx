import { useEffect } from 'react'
import { useDataLoader } from '@/hooks/useDataLoader'
import { getHazardConfig, generateDefaultDirections, calculateSpawns, framesToSeconds } from '@/utils/calculations'
import { validateAddDefeat } from '@/utils/validation'
import { calculateDirectionStats } from '@/utils/statistics'
import type { DefeatPoint } from '@/types'

/**
 * Phase 2 検証用 App
 * ブラウザコンソールで計算結果を確認する
 */
function App() {
  const { data, isLoading, error, retry } = useDataLoader()

  useEffect(() => {
    if (!data) return

    // === §7.2: キケン度100% 計算例 ===
    console.group('=== Hazard 100% (§7.2) ===')
    const config100 = getHazardConfig(100, data.hazardConfigData)
    console.log('Config:', config100)
    console.log('B-slot open:', framesToSeconds(config100.bSlotOpenFrame), 's')

    const dirs100 = generateDefaultDirections(config100.directionInterval)
    const defeats100: DefeatPoint[] = [
      { id: 'd1', slot: 'A', frameTime: 5700 },
      { id: 'd2', slot: 'A', frameTime: 5280 },
      { id: 'd3', slot: 'B', frameTime: 3600 },
    ]
    const spawns100 = calculateSpawns(config100, dirs100, defeats100)
    for (const s of spawns100) {
      console.log(`${s.slot}枠 ${framesToSeconds(s.frameTime)}s ${s.direction} auto:${s.isAuto}`)
    }
    const stats100 = calculateDirectionStats(spawns100, defeats100, dirs100)
    console.log('Stats:', stats100.map(s => `${s.direction}:${s.count}`).join(', '))
    console.groupEnd()

    // === §11: キケン度200% 連鎖例 ===
    console.group('=== Hazard 200% (§11) ===')
    const config200 = getHazardConfig(200, data.hazardConfigData)
    const dirs200 = generateDefaultDirections(config200.directionInterval)
    const names = ['右', '左', '中央', '右', '左', '中央', '右']
    const dirs200Named = dirs200.map((d, i) => ({ ...d, direction: names[i] ?? `方面${i + 1}` }))
    const defeats200: DefeatPoint[] = [
      { id: 'd1', slot: 'A', frameTime: 5820 },
      { id: 'd2', slot: 'A', frameTime: 5400 },
      { id: 'd3', slot: 'B', frameTime: 4980 },
    ]
    const spawns200 = calculateSpawns(config200, dirs200Named, defeats200)
    for (const s of spawns200) {
      console.log(`${s.slot}枠 ${framesToSeconds(s.frameTime)}s ${s.direction} auto:${s.isAuto}`)
    }
    const stats200 = calculateDirectionStats(spawns200, defeats200, dirs200Named)
    console.log('Stats:', stats200.map(s => `${s.direction}:${s.count}`).join(', '))
    console.log('Total:', stats200.reduce((sum, s) => sum + s.count, 0))
    console.groupEnd()

    // === §8.4: バリデーション例 ===
    console.group('=== Validation (§8.4) ===')
    const dirsVal = generateDefaultDirections(config100.directionInterval)
    const v1 = validateAddDefeat({ id: 'v1', slot: 'A', frameTime: 5700 }, [], config100, dirsVal)
    console.log('5700F→empty:', v1.valid, '(expect: true)')
    const v2 = validateAddDefeat(
      { id: 'v2', slot: 'A', frameTime: 5500 },
      [{ id: 'v1', slot: 'A', frameTime: 5700 }], config100, dirsVal
    )
    console.log('5500F w/ d1@5700:', v2.valid, '(expect: false)')
    const v3 = validateAddDefeat(
      { id: 'v3', slot: 'A', frameTime: 5480 },
      [{ id: 'v1', slot: 'A', frameTime: 5700 }], config100, dirsVal
    )
    console.log('5480F w/ d1@5700:', v3.valid, '(expect: true)')
    console.groupEnd()

    // === §6.3: キケン度180% 補間 ===
    console.group('=== Hazard 180% interpolation (§6.3) ===')
    const config180 = getHazardConfig(180, data.hazardConfigData)
    console.log('dozerIncrSecond:', config180.dozerIncrSecond, '(expect: 14)')
    console.log('waveChangeNum:', config180.waveChangeNum, '(expect: 6)')
    console.log('directionInterval:', config180.directionInterval, '(expect: 12)')
    console.groupEnd()
  }, [data])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-lg text-text-muted">Loading data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg">
        <p className="text-lg text-danger">Error: {error}</p>
        <button
          onClick={retry}
          className="rounded-sm bg-primary px-4 py-2 text-white hover:bg-primary-hover"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="min-h-screen bg-bg p-8">
      <h1 className="mb-6 text-2xl font-bold text-text">
        グリルプランナー — Phase 2 検証
      </h1>
      <p className="text-text-muted">開発者ツール Console で計算結果を確認してください</p>
    </div>
  )
}

export default App
