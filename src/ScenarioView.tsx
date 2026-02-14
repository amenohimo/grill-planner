import { useCallback, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { DisplayModeToggle } from "@/components/Settings/DisplayModeToggle";
import { HazardLevelInput } from "@/components/Settings/HazardLevelInput";
import { MemoSection } from "@/components/Settings/MemoSection";
import { DirectionStatsTable } from "@/components/Statistics/DirectionStatsTable";
import { TargetOrderTable } from "@/components/Statistics/TargetOrderTable";
import { Timeline } from "@/components/Timeline";
import { useScenario } from "@/hooks/ScenarioContext";
import { useGrillCalculation } from "@/hooks/useGrillCalculation";
import {
  COLOR_THEMES,
  type ColorThemeKey,
  useColorTheme,
  useDisplayMode,
  useZoom,
  ZOOM_OPTIONS,
} from "@/hooks/useZoom";
import type { HazardConfigData, SpecialMaster, WeaponMaster } from "@/types";
import { calculateSpawns, generateDefaultDirections, getHazardConfig } from "@/utils/calculations";
import { exportScenario, importScenarioFromFile, importScenarioFromFileObject } from "@/utils/fileIO";

interface ScenarioViewProps {
  hazardConfigData: HazardConfigData;
  weapons: readonly WeaponMaster[];
  specials: readonly SpecialMaster[];
}

export function ScenarioView({ hazardConfigData, weapons, specials }: ScenarioViewProps) {
  const { state, dispatch } = useScenario();
  const { hazardConfig, spawns, directionStats, totalGrillCount } = useGrillCalculation(state, hazardConfigData);
  const { zoomX, zoomY, scaleX, scaleY, setZoomX, setZoomY } = useZoom();
  const { themeKey, setThemeKey, theme } = useColorTheme();
  const { displayMode, setDisplayMode } = useDisplayMode();
  const prevDirCountRef = useRef(state.directions.length);

  const handleHazardChange = useCallback(
    (value: number) => {
      dispatch({ type: "SET_HAZARD_LEVEL", payload: value });

      const newConfig = getHazardConfig(value, hazardConfigData);
      const newDirTimes = generateDefaultDirections(newConfig.directionInterval);

      // 方面数が変わったらデフォルト名にリセット、同じなら名前を保持
      let newDirs: typeof newDirTimes;
      if (newDirTimes.length === prevDirCountRef.current) {
        newDirs = newDirTimes.map((d, i) => ({
          ...d,
          direction: state.directions[i]?.direction ?? d.direction,
        }));
      } else {
        newDirs = newDirTimes;
        prevDirCountRef.current = newDirTimes.length;
      }
      dispatch({ type: "SET_DIRECTIONS", payload: newDirs });

      // B枠消失時はB枠撃破を削除
      if (newConfig.bSlotOpenFrame < 0) {
        const bDefeats = state.defeats.filter((d) => d.slot === "B");
        if (bDefeats.length > 0) {
          dispatch({ type: "REMOVE_DEFEATS", payload: bDefeats.map((d) => d.id) });
        }
      }

      // 不整合な撃破点を削除
      const testSpawns = calculateSpawns(newConfig, newDirs, state.defeats);
      const invalidIds = state.defeats
        .filter((defeat) => {
          const slotSpawns = testSpawns.filter((s) => s.slot === defeat.slot);
          const hasValidSpawn = slotSpawns.some((s) => s.frameTime >= defeat.frameTime);
          return !hasValidSpawn;
        })
        .map((d) => d.id);

      if (invalidIds.length > 0) {
        dispatch({ type: "REMOVE_DEFEATS", payload: invalidIds });
      }
    },
    [dispatch, hazardConfigData, state.directions, state.defeats],
  );

  const handleSetScenarioCode = useCallback(
    (code: string) => dispatch({ type: "SET_SCENARIO_CODE", payload: code }),
    [dispatch],
  );
  const handleSetWeapon = useCallback(
    (index: number, rowId: string) => dispatch({ type: "SET_WEAPON", payload: { index, rowId } }),
    [dispatch],
  );
  const handleSetSpecial = useCallback(
    (index: number, rowId: string) => dispatch({ type: "SET_SPECIAL", payload: { index, rowId } }),
    [dispatch],
  );
  const handleSetSnatchers = useCallback(
    (value: string) => dispatch({ type: "SET_SNATCHERS", payload: value }),
    [dispatch],
  );
  const handleSetFreeNote = useCallback(
    (value: string) => dispatch({ type: "SET_FREE_NOTE", payload: value }),
    [dispatch],
  );
  const handleSetDirectionPreset = useCallback(
    (index: 0 | 1 | 2, name: string) => dispatch({ type: "SET_DIRECTION_PRESET", payload: { index, name } }),
    [dispatch],
  );
  const handleSetTargetOrderEntry = useCallback(
    (index: number, value: string) => dispatch({ type: "SET_TARGET_ORDER_ENTRY", payload: { index, value } }),
    [dispatch],
  );
  const handleShiftTargetOrder = useCallback(
    (direction: "up" | "down") => dispatch({ type: "SHIFT_TARGET_ORDER", payload: direction }),
    [dispatch],
  );

  // ファイル I/O
  const [ioError, setIoError] = useState<string | null>(null);
  const [ioWarnings, setIoWarnings] = useState<string[]>([]);

  const handleExport = useCallback(() => {
    exportScenario(state);
  }, [state]);

  const handleImportResult = useCallback(
    (result: { success: boolean; scenario?: import("@/types").ScenarioData; error?: string; warnings?: string[] }) => {
      if (result.success && result.scenario) {
        dispatch({ type: "LOAD_SCENARIO", payload: result.scenario });
        setIoError(null);
        if (result.warnings && result.warnings.length > 0) {
          setIoWarnings(result.warnings);
          setTimeout(() => setIoWarnings([]), 5000);
        } else {
          setIoWarnings([]);
        }
      } else {
        setIoError(result.error ?? "インポートに失敗しました");
        setTimeout(() => setIoError(null), 3000);
      }
    },
    [dispatch],
  );

  const handleImport = useCallback(async () => {
    const result = await importScenarioFromFile(hazardConfigData, weapons, specials);
    handleImportResult(result);
  }, [hazardConfigData, weapons, specials, handleImportResult]);

  const handleFileDrop = useCallback(
    async (file: File) => {
      const result = await importScenarioFromFileObject(file, hazardConfigData, weapons, specials);
      handleImportResult(result);
    },
    [hazardConfigData, weapons, specials, handleImportResult],
  );

  return (
    <div
      className="flex h-screen flex-col bg-bg"
      style={
        {
          "--color-dir-0": theme.colors[0],
          "--color-dir-1": theme.colors[1],
          "--color-dir-2": theme.colors[2],
        } as React.CSSProperties
      }
    >
      {/* ヘッダー — 固定 */}
      <Header onExport={handleExport} onImport={handleImport} />

      {/* I/O エラー表示 */}
      {ioError && <div className="shrink-0 bg-danger px-4 py-2 text-sm text-white">{ioError}</div>}

      {/* I/O 警告表示 */}
      {ioWarnings.length > 0 && (
        <div className="shrink-0 bg-primary px-4 py-2 text-sm text-white">
          {ioWarnings.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
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

              <div className="ml-auto flex items-center gap-4 text-xs text-text-muted">
                <DisplayModeToggle value={displayMode} onChange={setDisplayMode} />
                <label className="flex items-center gap-1">
                  方面カラー
                  <select
                    value={themeKey}
                    onChange={(e) => setThemeKey(e.target.value as ColorThemeKey)}
                    className="rounded-sm border border-border bg-surface px-1 py-0.5 text-xs text-text"
                  >
                    {Object.entries(COLOR_THEMES).map(([key, { label }]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <span>ズーム:</span>
                <label className="flex items-center gap-1">
                  横
                  <select
                    value={zoomX}
                    onChange={(e) => setZoomX(Number(e.target.value))}
                    className="rounded-sm border border-border bg-surface px-1 py-0.5 text-xs text-text"
                  >
                    {ZOOM_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}%
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-1">
                  縦
                  <select
                    value={zoomY}
                    onChange={(e) => setZoomY(Number(e.target.value))}
                    className="rounded-sm border border-border bg-surface px-1 py-0.5 text-xs text-text"
                  >
                    {ZOOM_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}%
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <MemoSection
              memo={state.memo}
              weapons={weapons}
              specials={specials}
              directionPresets={state.directionPresets}
              onSetScenarioCode={handleSetScenarioCode}
              onSetWeapon={handleSetWeapon}
              onSetSpecial={handleSetSpecial}
              onSetSnatchers={handleSetSnatchers}
              onSetFreeNote={handleSetFreeNote}
              onSetDirectionPreset={handleSetDirectionPreset}
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
              targetOrder={state.memo.targetOrder}
              weapons={state.memo.weapons}
              weaponMaster={weapons}
              displayMode={displayMode}
              scaleX={scaleX}
              scaleY={scaleY}
              onFileDrop={handleFileDrop}
            />
          </div>
        </div>

        {/* 右ペイン — 独立スクロール */}
        <div className="max-w-80 shrink-0 overflow-y-auto border-l border-border bg-surface p-4">
          <DirectionStatsTable
            stats={directionStats}
            totalGrillCount={totalGrillCount}
            presetNames={state.directionPresets}
          />
          <div className="mt-4 border-t border-border pt-4">
            <TargetOrderTable
              order={state.memo.targetOrder}
              weapons={state.memo.weapons}
              weaponMaster={weapons}
              onSetEntry={handleSetTargetOrderEntry}
              onShift={handleShiftTargetOrder}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
