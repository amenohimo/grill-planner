import { useCallback, useRef, useState } from 'react'
import { useScenario } from '@/hooks/ScenarioContext'
import { useGrillCalculation } from '@/hooks/useGrillCalculation'
import { getHazardConfig, generateDefaultDirections, calculateSpawns } from '@/utils/calculations'
import { exportScenario, importScenarioFromFile } from '@/utils/fileIO'
import { Header } from '@/components/Header'
import { HazardLevelInput } from '@/components/Settings/HazardLevelInput'
import { DisplayModeToggle } from '@/components/Settings/DisplayModeToggle'
import { MemoSection } from '@/components/Settings/MemoSection'
import { DirectionStatsTable } from '@/components/Statistics/DirectionStatsTable'
import { Timeline } from '@/components/Timeline'
import type { HazardConfigData, WeaponMaster, SpecialMaster, TargetMode, DisplayMode } from '@/types'

interface ScenarioViewProps {
  hazardConfigData: HazardConfigData;
  weapons: readonly WeaponMaster[];
  specials: readonly SpecialMaster[];
}

export function ScenarioView({ hazardConfigData, weapons, specials }: ScenarioViewProps) {
  const { state, dispatch } = useScenario()
  const { hazardConfig, spawns, directionStats, totalGrillCount } = useGrillCalculation(state, hazardConfigData)
  const prevDirCountRef = useRef(state.directions.length)

  const handleHazardChange = useCallback(
    (value: number) => {
      dispatch({ type: 'SET_HAZARD_LEVEL', payload: value })

      const newConfig = getHazardConfig(value, hazardConfigData)
      const newDirTimes = generateDefaultDirections(newConfig.directionInterval)

      // 方面数が変わったらデフォルト名にリセット、同じなら名前を保持
      let newDirs: typeof newDirTimes
      if (newDirTimes.length === prevDirCountRef.current) {
        newDirs = newDirTimes.map((d, i) => ({
          ...d,
          direction: state.directions[i]?.direction ?? d.direction,
        }))
      } else {
        newDirs = newDirTimes
        prevDirCountRef.current = newDirTimes.length
      }
      dispatch({ type: 'SET_DIRECTIONS', payload: newDirs })

      // B枠消失時はB枠撃破を削除
      if (newConfig.bSlotOpenFrame < 0) {
        const bDefeats = state.defeats.filter((d) => d.slot === 'B')
        if (bDefeats.length > 0) {
          dispatch({ type: 'REMOVE_DEFEATS', payload: bDefeats.map((d) => d.id) })
        }
      }

      // 不整合な撃破点を削除
      const testSpawns = calculateSpawns(newConfig, newDirs, state.defeats)
      const invalidIds = state.defeats
        .filter((defeat) => {
          const slotSpawns = testSpawns.filter((s) => s.slot === defeat.slot)
          const hasValidSpawn = slotSpawns.some((s) => s.frameTime >= defeat.frameTime)
          return !hasValidSpawn
        })
        .map((d) => d.id)

      if (invalidIds.length > 0) {
        dispatch({ type: 'REMOVE_DEFEATS', payload: invalidIds })
      }
    },
    [dispatch, hazardConfigData, state.directions, state.defeats],
  )

  const handleDisplayModeChange = useCallback(
    (mode: DisplayMode) => {
      dispatch({ type: 'SET_DISPLAY_MODE', payload: mode })
    },
    [dispatch],
  )

  const handleSetScenarioCode = useCallback(
    (code: string) => dispatch({ type: 'SET_SCENARIO_CODE', payload: code }),
    [dispatch],
  )
  const handleSetWeapon = useCallback(
    (index: number, weaponId: number) => dispatch({ type: 'SET_WEAPON', payload: { index, weaponId } }),
    [dispatch],
  )
  const handleSetSpecial = useCallback(
    (index: number, specialId: number) => dispatch({ type: 'SET_SPECIAL', payload: { index, specialId } }),
    [dispatch],
  )
  const handleSetTargetMode = useCallback(
    (mode: TargetMode) => dispatch({ type: 'SET_TARGET_MODE', payload: mode }),
    [dispatch],
  )
  const handleSetSnatchers = useCallback(
    (value: string) => dispatch({ type: 'SET_SNATCHERS', payload: value }),
    [dispatch],
  )

  // ファイル I/O
  const [ioError, setIoError] = useState<string | null>(null)

  const handleExport = useCallback(() => {
    exportScenario(state)
  }, [state])

  const handleImport = useCallback(async () => {
    const result = await importScenarioFromFile()
    if (result.success && result.scenario) {
      dispatch({ type: 'LOAD_SCENARIO', payload: result.scenario })
      setIoError(null)
    } else {
      setIoError(result.error ?? 'インポートに失敗しました')
      setTimeout(() => setIoError(null), 3000)
    }
  }, [dispatch])

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {/* ヘッダー */}
      <Header onExport={handleExport} onImport={handleImport} />

      {/* I/O エラー表示 */}
      {ioError && (
        <div className="bg-danger px-4 py-2 text-sm text-white">
          {ioError}
        </div>
      )}

      {/* 設定パネル */}
      <div className="border-b border-border bg-surface px-4 py-3">
        <div className="flex flex-wrap items-center gap-6">
          <HazardLevelInput value={state.hazardLevel} onChange={handleHazardChange} />
          <DisplayModeToggle value={state.displayMode} onChange={handleDisplayModeChange} />
          <div className="text-xs text-text-muted">
            方面: {state.directions.length} | 湧き: {spawns.length} | グリル: {totalGrillCount}
          </div>
        </div>
        <MemoSection
          memo={state.memo}
          weapons={weapons}
          specials={specials}
          displayMode={state.displayMode}
          onSetScenarioCode={handleSetScenarioCode}
          onSetWeapon={handleSetWeapon}
          onSetSpecial={handleSetSpecial}
          onSetTargetMode={handleSetTargetMode}
          onSetSnatchers={handleSetSnatchers}
        />
      </div>

      {/* メインエリア（タイムライン + 統計） */}
      <div className="flex min-h-0 flex-1 gap-4 p-4">
        <div className="min-h-0 flex-1">
          <Timeline
            spawns={spawns}
            defeats={state.defeats}
            directions={state.directions}
            hazardConfig={hazardConfig}
          />
        </div>
        <div className="w-70 shrink-0 overflow-y-auto rounded-sm border border-border bg-surface p-4">
          <DirectionStatsTable stats={directionStats} totalGrillCount={totalGrillCount} />
        </div>
      </div>
    </div>
  )
}
