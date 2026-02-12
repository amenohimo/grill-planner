import { describe, expect, it } from "vitest";
import type { DefeatPoint, InterpolatedHazardConfig } from "@/types";
import { generateDefaultDirections } from "@/utils/calculations";
import { findCascadeRemovals, validateAddDefeat, validateMoveDefeat } from "@/utils/validation";

// ============================================================
// テスト用の共通データ
// ============================================================

const hazardConfig: InterpolatedHazardConfig = {
  dozerIncrSecond: 30,
  waveChangeNum: 5,
  directionInterval: 14.4,
  bSlotOpenFrame: 3786,
};

const directions = generateDefaultDirections(14.4);

// ============================================================
// 撃破追加バリデーション（02_GAME_MECHANICS §8）
// ============================================================

describe("validateAddDefeat", () => {
  it("有効な位置に撃破点を追加できる", () => {
    const result = validateAddDefeat({ id: "d1", slot: "A", frameTime: 5400 }, [], hazardConfig, directions);
    expect(result.valid).toBe(true);
  });

  it("自動湧きの前（ゲーム開始前）には撃破できない", () => {
    const result = validateAddDefeat({ id: "d1", slot: "A", frameTime: 6100 }, [], hazardConfig, directions);
    expect(result.valid).toBe(false);
  });

  it("撃破後の再湧き以降に次の撃破を追加できる", () => {
    const existing: DefeatPoint[] = [{ id: "d1", slot: "A", frameTime: 5400 }];
    // d1の湧き = 5400 - 214 = 5186F → 5100Fはその後なので有効
    const result = validateAddDefeat({ id: "d2", slot: "A", frameTime: 5100 }, existing, hazardConfig, directions);
    expect(result.valid).toBe(true);
  });

  it("湧きが消費済みの区間には撃破を追加できない", () => {
    const existing: DefeatPoint[] = [{ id: "d1", slot: "A", frameTime: 5400 }];
    // auto-a=6000F → d1=5400Fで撃破、次の湧き=5186F
    // 5300Fは5186Fより過去（5300 > 5186）→ まだ再湧きしていない
    const result = validateAddDefeat({ id: "d2", slot: "A", frameTime: 5300 }, existing, hazardConfig, directions);
    expect(result.valid).toBe(false);
  });

  it("前の撃破で湧きが消費済みの区間には撃破を追加できない（3800F問題）", () => {
    const existing: DefeatPoint[] = [{ id: "d1", slot: "A", frameTime: 4000 }];
    // auto-a=6000F → d1=4000Fで撃破、次の湧き=4000-214=3786F
    // 3800Fは3786Fより過去（3800 > 3786）→ まだ再湧きしていない
    const result = validateAddDefeat({ id: "d2", slot: "A", frameTime: 3800 }, existing, hazardConfig, directions);
    expect(result.valid).toBe(false);
  });
});

// ============================================================
// 撃破移動バリデーション
// ============================================================

describe("validateMoveDefeat", () => {
  it("有効な位置に移動できる", () => {
    const existing: DefeatPoint[] = [{ id: "d1", slot: "A", frameTime: 5400 }];
    const result = validateMoveDefeat("d1", 5200, existing, hazardConfig, directions);
    expect(result.valid).toBe(true);
  });

  it("ゲーム開始前への移動は不正", () => {
    const existing: DefeatPoint[] = [{ id: "d1", slot: "A", frameTime: 5400 }];
    // 6100F はゲーム開始前 → 湧きが存在しない
    const result = validateMoveDefeat("d1", 6100, existing, hazardConfig, directions);
    expect(result.valid).toBe(false);
  });
});

// ============================================================
// カスケード削除
// ============================================================

describe("findCascadeRemovals", () => {
  it("単一撃破の削除（カスケードなし）", () => {
    const defeats: DefeatPoint[] = [{ id: "d1", slot: "A", frameTime: 5400 }];
    const removedIds = findCascadeRemovals("d1", defeats, hazardConfig, directions);
    expect(removedIds).toEqual(["d1"]);
  });

  it("カスケード削除が発生するケース", () => {
    const defeats: DefeatPoint[] = [
      { id: "d1", slot: "A", frameTime: 5400 },
      { id: "d2", slot: "A", frameTime: 5000 },
      // d1の湧き = 5186F, d2はこの湧きを撃破
      // d2の湧き = 4786F
    ];
    // d1を削除すると: d1の湧き(5186F)が消える → d2(5000F)を撃破するための湧きがない?
    // 実際: auto-a(6000F)はまだある, d2(5000F)はauto-aの湧きを撃破できる
    // なので: d2は残る
    const removedIds = findCascadeRemovals("d1", defeats, hazardConfig, directions);
    expect(removedIds).toContain("d1");
    // d2はauto-aの湧きを撃破可能なので残る
    expect(removedIds).not.toContain("d2");
  });
});
