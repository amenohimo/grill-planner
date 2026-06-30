import type { DefeatPoint, ScenarioData } from "@/types";
import type { FrameTime, GrillSlot } from "@/types/base";

// ──────────────────────────────────────────────
// Validation
// ──────────────────────────────────────────────

export function validatePartT(data: unknown): data is string[] {
  if (!Array.isArray(data)) return false;
  if (data.length !== 25) return false;
  const valid = new Set(["1P", "2P", "3P", "4P", "-"]);
  return data.every((e) => valid.has(e));
}

export function validatePartD(data: unknown): data is Array<[GrillSlot, FrameTime]> {
  if (!Array.isArray(data)) return false;
  return data.every((e) => {
    if (!Array.isArray(e) || e.length !== 2) return false;
    const slot = e[0];
    const ft = e[1];
    return (slot === "A" || slot === "B") && typeof ft === "number" && Number.isFinite(ft);
  });
}

export function validatePartS(data: unknown): data is Record<string, unknown> {
  return data !== null && typeof data === "object" && !Array.isArray(data);
}

// ──────────────────────────────────────────────
// Encoding
// ──────────────────────────────────────────────

/** JSON.stringify → encodeURIComponent → btoa → prefix "v1" */
function toBase64(obj: unknown): string {
  return "v1" + btoa(encodeURIComponent(JSON.stringify(obj)));
}

export function encodePartT(targetOrder: readonly string[]): string {
  return toBase64(targetOrder);
}

export function encodePartD(defeats: readonly DefeatPoint[]): string {
  const stripped: ReadonlyArray<[GrillSlot, FrameTime]> = defeats.map((d) => [d.slot, d.frameTime]);
  return toBase64(stripped);
}

export function encodePartS(scenario: ScenarioData): string {
  const { hazardLevel, directions, memo, directionPresets } = scenario;
  const { targetOrder: _omit, ...memoRest } = memo;
  const subset = { hazardLevel, directions, memo: memoRest, directionPresets };
  return toBase64(subset);
}

export function encodeAll(scenario: ScenarioData): string {
  const t = encodePartT(scenario.memo.targetOrder);
  const d = encodePartD(scenario.defeats);
  const s = encodePartS(scenario);
  return `${t}|${d}|${s}`;
}

// ──────────────────────────────────────────────
// Decoding
// ──────────────────────────────────────────────

function decodeCore(code: string): unknown {
  const trimmed = code.trim();
  if (trimmed.length === 0) throw new Error("マジックワードが空です");
  if (!trimmed.startsWith("v1")) throw new Error("未知のバージョン形式です");

  const payload = trimmed.slice(2);
  let json: string;
  try {
    json = atob(payload);
  } catch {
    throw new Error("Base64デコードに失敗しました");
  }
  try {
    return JSON.parse(decodeURIComponent(json));
  } catch {
    throw new Error("JSONの解析に失敗しました");
  }
}

export function decodePartT(code: string): string[] {
  const data = decodeCore(code);
  if (!validatePartT(data)) throw new Error("データ形式が違います");
  return data;
}

export function decodePartD(code: string): DefeatPoint[] {
  const data = decodeCore(code);
  if (!validatePartD(data)) throw new Error("データ形式が違います");
  return data.map(([slot, frameTime]) => ({
    id: "d-" + crypto.randomUUID(),
    slot,
    frameTime,
  }));
}

export function decodePartS(code: string): Partial<ScenarioData> {
  const data = decodeCore(code);
  if (!validatePartS(data)) throw new Error("データ形式が違います");
  return data as Partial<ScenarioData>;
}

export function decodeAll(code: string): { t: string[]; d: DefeatPoint[]; s: Partial<ScenarioData> } {
  const parts = code.split("|");
  if (parts.length !== 3) throw new Error("コードの形式が違います");
  return {
    t: decodePartT(parts[0]!),
    d: decodePartD(parts[1]!),
    s: decodePartS(parts[2]!),
  };
}
