import type { ScenarioData, SaveData, HazardConfigData, DefeatPoint } from '@/types';
import { getHazardConfig, generateDefaultDirections, calculateSpawns } from './calculations';

const CURRENT_VERSION = 1;

// ============================================================
// エクスポート
// ============================================================

export function exportScenario(scenario: ScenarioData, filename?: string): void {
  const saveData: SaveData = {
    version: CURRENT_VERSION,
    createdAt: new Date().toISOString(),
    scenario,
  };

  const json = JSON.stringify(saveData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `grill-plan-${formatDate()}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

function formatDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${y}${m}${d}-${h}${min}`;
}

// ============================================================
// インポート
// ============================================================

export interface ImportResult {
  success: boolean;
  scenario?: ScenarioData;
  error?: string;
  warnings?: string[];
}

export function importScenarioFromFile(hazardConfigData: HazardConfigData): Promise<ImportResult> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve({ success: false, error: 'ファイルが選択されませんでした' });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result;
        if (typeof text !== 'string') {
          resolve({ success: false, error: 'ファイルの読み込みに失敗しました' });
          return;
        }
        resolve(parseAndValidate(text, hazardConfigData));
      };
      reader.onerror = () => {
        resolve({ success: false, error: 'ファイルの読み込みに失敗しました' });
      };
      reader.readAsText(file);
    };

    input.click();
  });
}

function parseAndValidate(json: string, hazardConfigData: HazardConfigData): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { success: false, error: 'JSONの解析に失敗しました' };
  }

  if (!isObject(data)) {
    return { success: false, error: '不正なデータ形式です' };
  }

  // version チェック
  if (!('version' in data) || data.version !== CURRENT_VERSION) {
    return { success: false, error: `未対応のバージョンです（version: ${String((data as Record<string, unknown>).version ?? '不明')}）` };
  }

  if (!('scenario' in data) || !isObject(data.scenario)) {
    return { success: false, error: 'scenario フィールドがありません' };
  }

  const scenario = data.scenario as Record<string, unknown>;

  // hazardLevel
  if (typeof scenario.hazardLevel !== 'number' || scenario.hazardLevel < 20 || scenario.hazardLevel > 333) {
    return { success: false, error: 'hazardLevel が不正です（20〜333）' };
  }

  // directions
  if (!Array.isArray(scenario.directions)) {
    return { success: false, error: 'directions が不正です' };
  }
  for (const dir of scenario.directions) {
    if (!isObject(dir) || typeof (dir as Record<string, unknown>).frameTime !== 'number' || typeof (dir as Record<string, unknown>).direction !== 'string') {
      return { success: false, error: 'directions の要素が不正です' };
    }
  }

  // defeats
  if (!Array.isArray(scenario.defeats)) {
    return { success: false, error: 'defeats が不正です' };
  }
  for (const defeat of scenario.defeats) {
    if (!isObject(defeat)) {
      return { success: false, error: 'defeats の要素が不正です' };
    }
    const d = defeat as Record<string, unknown>;
    if (typeof d.id !== 'string' || typeof d.frameTime !== 'number' || (d.slot !== 'A' && d.slot !== 'B')) {
      return { success: false, error: 'defeats の要素が不正です' };
    }
  }

  // memo（存在しない場合はデフォルトで補完）
  if (scenario.memo !== undefined && !isObject(scenario.memo)) {
    return { success: false, error: 'memo が不正です' };
  }

  // displayMode
  if (scenario.displayMode !== undefined &&
      scenario.displayMode !== 'icon' &&
      scenario.displayMode !== 'text' &&
      scenario.displayMode !== 'both') {
    return { success: false, error: 'displayMode が不正です' };
  }

  // スキーマチェック通過 → 撃破点の整合性チェック
  const parsed = scenario as unknown as ScenarioData;
  const hazardConfig = getHazardConfig(parsed.hazardLevel, hazardConfigData);
  const directions = parsed.directions.length > 0
    ? parsed.directions
    : generateDefaultDirections(hazardConfig.directionInterval);

  const spawns = calculateSpawns(hazardConfig, directions, parsed.defeats);
  const warnings: string[] = [];

  // 各撃破点について、対応する湧きが存在するかチェック
  const invalidDefeats = parsed.defeats.filter((defeat: DefeatPoint) => {
    // B枠が存在しないキケン度でのB枠撃破
    if (hazardConfig.bSlotOpenFrame < 0 && defeat.slot === 'B') return true;
    // 対応する湧き点が存在しない
    const slotSpawns = spawns.filter((s) => s.slot === defeat.slot);
    return !slotSpawns.some((s) => s.frameTime >= defeat.frameTime);
  });

  if (invalidDefeats.length > 0) {
    warnings.push(`不整合な撃破点 ${invalidDefeats.length} 件を除外しました`);
  }

  // 不整合な撃破点を除外
  const invalidIds = new Set(invalidDefeats.map((d: DefeatPoint) => d.id));
  const validDefeats = parsed.defeats.filter((d: DefeatPoint) => !invalidIds.has(d.id));

  return {
    success: true,
    scenario: { ...parsed, defeats: validDefeats },
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
