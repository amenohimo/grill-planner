import type {
  DefeatPoint,
  DirectionId,
  HazardConfigData,
  SaveData,
  ScenarioData,
  SpecialMaster,
  WeaponMaster,
} from "@/types";
import { generateDefaultDirections, getHazardConfig } from "./calculations";
import { findAllInvalidDefeats } from "./validation";

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
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `grill-plan-${formatDate()}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

function formatDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
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

/**
 * File オブジェクトからシナリオをインポートする
 * （ドラッグ&ドロップ、または直接ファイル参照時に使用）
 */
export function importScenarioFromFileObject(
  file: File,
  hazardConfigData: HazardConfigData,
  weapons: readonly WeaponMaster[],
  specials: readonly SpecialMaster[],
): Promise<ImportResult> {
  return new Promise((resolve) => {
    if (!file.name.endsWith(".json")) {
      resolve({ success: false, error: "JSONファイルのみ対応しています" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      if (typeof text !== "string") {
        resolve({ success: false, error: "ファイルの読み込みに失敗しました" });
        return;
      }
      resolve(parseAndValidate(text, hazardConfigData, weapons, specials));
    };
    reader.onerror = () => {
      resolve({ success: false, error: "ファイルの読み込みに失敗しました" });
    };
    reader.readAsText(file);
  });
}

export function importScenarioFromFile(
  hazardConfigData: HazardConfigData,
  weapons: readonly WeaponMaster[],
  specials: readonly SpecialMaster[],
): Promise<ImportResult> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve({ success: false, error: "ファイルが選択されませんでした" });
        return;
      }
      resolve(await importScenarioFromFileObject(file, hazardConfigData, weapons, specials));
    };

    input.click();
  });
}

function parseAndValidate(
  json: string,
  hazardConfigData: HazardConfigData,
  weapons: readonly WeaponMaster[],
  specials: readonly SpecialMaster[],
): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { success: false, error: "JSONの解析に失敗しました" };
  }

  if (!isObject(data)) {
    return { success: false, error: "不正なデータ形式です" };
  }

  // version チェック
  if (!("version" in data) || data.version !== CURRENT_VERSION) {
    return {
      success: false,
      error: `未対応のバージョンです（version: ${String((data as Record<string, unknown>).version ?? "不明")}）`,
    };
  }

  if (!("scenario" in data) || !isObject(data.scenario)) {
    return { success: false, error: "scenario フィールドがありません" };
  }

  const scenario = data.scenario as Record<string, unknown>;

  // hazardLevel
  if (typeof scenario.hazardLevel !== "number" || scenario.hazardLevel < 20 || scenario.hazardLevel > 333) {
    return { success: false, error: "hazardLevel が不正です（20〜333）" };
  }

  // directions
  if (!Array.isArray(scenario.directions)) {
    return { success: false, error: "directions が不正です" };
  }
  for (const dir of scenario.directions) {
    if (!isObject(dir) || typeof (dir as Record<string, unknown>).frameTime !== "number") {
      return { success: false, error: "directions の要素が不正です" };
    }
    const dirVal = (dir as Record<string, unknown>).direction;
    if (typeof dirVal !== "number" && typeof dirVal !== "string") {
      return { success: false, error: "directions の要素が不正です" };
    }
  }

  // direction: 旧形式（文字列）→ 内部ID（数値）に変換
  const presets: readonly [string, string, string] =
    isObject(scenario.memo) && Array.isArray((scenario as Record<string, unknown>).directionPresets)
      ? ((scenario as Record<string, unknown>).directionPresets as [string, string, string])
      : ["左", "正面", "右"];

  scenario.directions = (scenario.directions as Array<Record<string, unknown>>).map((dir) => {
    const dirVal = dir.direction;
    if (typeof dirVal === "number" && [0, 1, 2].includes(dirVal)) {
      return dir; // already DirectionId
    }
    if (typeof dirVal === "string") {
      const idx = presets.indexOf(dirVal);
      dir.direction = (idx >= 0 && idx <= 2 ? idx : 1) as DirectionId;
    } else {
      dir.direction = 1 as DirectionId;
    }
    return dir;
  });

  // defeats
  if (!Array.isArray(scenario.defeats)) {
    return { success: false, error: "defeats が不正です" };
  }
  for (const defeat of scenario.defeats) {
    if (!isObject(defeat)) {
      return { success: false, error: "defeats の要素が不正です" };
    }
    const d = defeat as Record<string, unknown>;
    if (typeof d.id !== "string" || typeof d.frameTime !== "number" || (d.slot !== "A" && d.slot !== "B")) {
      return { success: false, error: "defeats の要素が不正です" };
    }
  }

  // memo フィールドの補完
  const defaultMemo = {
    scenarioCode: "",
    weapons: [] as string[],
    specials: [] as string[],
    targetOrder: [] as string[],
    snatchers: "",
    freeNote: "",
  };

  const rawMemo = isObject(scenario.memo) ? (scenario.memo as Record<string, unknown>) : {};
  const mergedMemo = { ...defaultMemo, ...rawMemo };

  // memo.weapons / memo.specials: number[] → string[] (RowId) 後方互換変換
  if (Array.isArray(mergedMemo.weapons)) {
    mergedMemo.weapons = (mergedMemo.weapons as unknown[]).map((v) => {
      if (typeof v === "number") {
        const found = weapons.find((w) => w.id === v);
        return found?.rowId ?? "";
      }
      return typeof v === "string" ? v : "";
    });
  }
  if (Array.isArray(mergedMemo.specials)) {
    mergedMemo.specials = (mergedMemo.specials as unknown[]).map((v) => {
      if (typeof v === "number") {
        const found = specials.find((s) => s.id === v);
        return found?.rowId ?? "";
      }
      return typeof v === "string" ? v : "";
    });
  }

  // targetOrder の補完・バリデーション（旧形式 { mode, order } と新形式 string[] の両方を受け入れ）
  const VALID_TARGETS = new Set(["1P", "2P", "3P", "4P", "-"]);
  if (Array.isArray(mergedMemo.targetOrder)) {
    mergedMemo.targetOrder = (mergedMemo.targetOrder as unknown[]).map((v) =>
      typeof v === "string" && VALID_TARGETS.has(v) ? v : "-",
    );
  } else if (isObject(mergedMemo.targetOrder)) {
    // 旧形式: { mode, order } → order 配列だけ抽出
    const to = mergedMemo.targetOrder as Record<string, unknown>;
    if (Array.isArray(to.order)) {
      mergedMemo.targetOrder = (to.order as unknown[]).map((v) =>
        typeof v === "string" && VALID_TARGETS.has(v) ? v : "-",
      );
    } else {
      mergedMemo.targetOrder = [];
    }
  } else {
    mergedMemo.targetOrder = [];
  }

  // freeNote / snatchers / scenarioCode の型安全性
  if (typeof mergedMemo.freeNote !== "string") mergedMemo.freeNote = "";
  if (typeof mergedMemo.snatchers !== "string") mergedMemo.snatchers = "";
  if (typeof mergedMemo.scenarioCode !== "string") mergedMemo.scenarioCode = "";

  scenario.memo = mergedMemo;

  // directionPresets の補完
  if (!Array.isArray(scenario.directionPresets) || (scenario.directionPresets as unknown[]).length !== 3) {
    scenario.directionPresets = ["左", "正面", "右"];
  }

  // displayMode の補完
  if (scenario.displayMode !== "icon" && scenario.displayMode !== "text" && scenario.displayMode !== "both") {
    scenario.displayMode = "both";
  }

  // スキーマチェック通過 → 撃破点の整合性チェック
  const parsed = scenario as unknown as ScenarioData;
  const hazardConfig = getHazardConfig(parsed.hazardLevel, hazardConfigData);
  const directions =
    parsed.directions.length > 0 ? parsed.directions : generateDefaultDirections(hazardConfig.directionInterval);

  const warnings: string[] = [];

  // チェーン検証で不正な撃破点を検出（湧き消費の1対1マッチング）
  const invalidDefeatIds = findAllInvalidDefeats(parsed.defeats, hazardConfig, directions);

  if (invalidDefeatIds.length > 0) {
    warnings.push(`不整合な撃破点 ${invalidDefeatIds.length} 件を除外しました`);
  }

  // 不整合な撃破点を除外
  const invalidIds = new Set(invalidDefeatIds);
  const validDefeats = parsed.defeats.filter((d: DefeatPoint) => !invalidIds.has(d.id));

  return {
    success: true,
    scenario: { ...parsed, defeats: validDefeats },
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
