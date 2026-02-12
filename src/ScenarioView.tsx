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
import { ButtonGroup } from '@/components/ButtonGroup'
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
    (index: number, rowId: string) => dispatch({ type: 'SET_WEAPON', payload: { index, rowId } }),
    [dispatch],
  )
  const handleSetSpecial = useCallback(
    (index: number, rowId: string) => dispatch({ type: 'SET_SPECIAL', payload: { index, rowId } }),
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
  const handleSetFreeNote = useCallback(
    (value: string) => dispatch({ type: 'SET_FREE_NOTE', payload: value }),
    [dispatch],
  )
  const handleSetDirectionPreset = useCallback(
    (index: 0 | 1 | 2, name: string) => dispatch({ type: 'SET_DIRECTION_PRESET', payload: { index, name } }),
    [dispatch],
  )

  // ファイル I/O
  const [ioError, setIoError] = useState<string | null>(null)
  const [ioWarnings, setIoWarnings] = useState<string[]>([])

  const handleExport = useCallback(() => {
    exportScenario(state)
  }, [state])

  const handleImport = useCallback(async () => {
    const result = await importScenarioFromFile(hazardConfigData, weapons, specials)
    if (result.success && result.scenario) {
      dispatch({ type: 'LOAD_SCENARIO', payload: result.scenario })
      setIoError(null)
      if (result.warnings && result.warnings.length > 0) {
        setIoWarnings(result.warnings)
        setTimeout(() => setIoWarnings([]), 5000)
      } else {
        setIoWarnings([])
      }
    } else {
      setIoError(result.error ?? 'インポートに失敗しました')
      setTimeout(() => setIoError(null), 3000)
    }
  }, [dispatch, hazardConfigData, weapons, specials])

  return (
    <div className="flex h-screen flex-col bg-bg">
      {/* ヘッダー — 固定 */}
      <Header onExport={handleExport} onImport={handleImport} />

      {/* I/O エラー表示 */}
      {ioError && (
        <div className="shrink-0 bg-danger px-4 py-2 text-sm text-white">
          {ioError}
        </div>
      )}

      {/* I/O 警告表示 */}
      {ioWarnings.length > 0 && (
        <div className="shrink-0 bg-primary px-4 py-2 text-sm text-white">
          {ioWarnings.map((w, i) => <div key={i}>{w}</div>)}
        </div>
      )}

      {/* メインエリア（左: 設定+タイムライン / 右: 統計サイドバー） */}
      <div className="flex min-h-0 flex-1">
        {/* 左ペイン — 独立スクロール */}
        <div className="flex-1 overflow-y-auto">
          {/* 設定パネル */}
          <div className="border-b border-border bg-surface px-4 py-3">
            <div className="flex flex-wrap items-center gap-6">
              <HazardLevelInput value={state.hazardLevel} onChange={handleHazardChange} />
              <DisplayModeToggle value={state.displayMode} onChange={handleDisplayModeChange} />
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-muted">ターゲット基準:</span>
                <ButtonGroup
                  options={[
                    { value: 'weapon' as TargetMode, label: 'ブキ' },
                    { value: 'player' as TargetMode, label: 'プレイヤー' },
                  ]}
                  selected={state.memo.targetOrder.mode}
                  onChange={handleSetTargetMode}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-muted">方面名:</span>
                {state.directionPresets.map((preset, i) => (
                  <input
                    key={i}
                    type="text"
                    value={preset}
                    onChange={(e) => handleSetDirectionPreset(i as 0 | 1 | 2, e.target.value)}
                    className="w-16 rounded-sm border border-border bg-surface px-1 py-0.5 text-center text-xs text-text"
                    maxLength={10}
                  />
                ))}
              </div>
            </div>
            <MemoSection
              memo={state.memo}
              weapons={weapons}
              specials={specials}
              onSetScenarioCode={handleSetScenarioCode}
              onSetWeapon={handleSetWeapon}
              onSetSpecial={handleSetSpecial}
              onSetSnatchers={handleSetSnatchers}
              onSetFreeNote={handleSetFreeNote}
            />
          </div>

          {/* タイムライン */}
          <div className="p-4">
            <Timeline
              spawns={spawns}
              defeats={state.defeats}
              directions={state.directions}
              hazardConfig={hazardConfig}
              directionPresets={state.directionPresets}
            />
          </div>
        </div>

        {/* 右ペイン — 独立スクロール */}
        <div className="w-70 shrink-0 overflow-y-auto border-l border-border bg-surface p-4">
          <DirectionStatsTable stats={directionStats} totalGrillCount={totalGrillCount} presetNames={state.directionPresets} />
        </div>
      </div>
    </div>
  )
}
