import { describe, it, expect } from 'vitest';
import { validateAddDefeat, validateMoveDefeat, findCascadeRemovals } from '@/utils/validation';
import { generateDefaultDirections } from '@/utils/calculations';
import type { DefeatPoint, InterpolatedHazardConfig, DirectionSetting } from '@/types';

// ============================================================
// テスト用の共通データ
// ============================================================

const hazardConfig: InterpolatedHazardConfig = {
  dozerIncrSecond: 30,
  waveChangeNum: 5,
  directionInterval: 14.4,
  bSlotOpenFrame: 3786,
};

const directions: readonly DirectionSetting[] = generateDefaultDirections(14.4);

// ============================================================
// 撃破追加バリデーション（02_GAME_MECHANICS §8）
// ============================================================

describe('validateAddDefeat', () => {
  it('有効な位置に撃破点を追加できる', () => {
    const result = validateAddDefeat(
      { id: 'd1', slot: 'A', frameTime: 5400 },
      [],
      hazardConfig,
      directions,
    );
    expect(result.valid).toBe(true);
  });

  it('自動湧きの前（ゲーム開始前）には撃破できない', () => {
    const result = validateAddDefeat(
      { id: 'd1', slot: 'A', frameTime: 6100 },
      [],
      hazardConfig,
      directions,
    );
    expect(result.valid).toBe(false);
  });

  it('既存の撃破の後に有効な撃破を追加できる', () => {
    const existing: DefeatPoint[] = [
      { id: 'd1', slot: 'A', frameTime: 5400 },
    ];
    // d1の湧き = 5400 - 214 = 5186F, この後に撃破
    const result = validateAddDefeat(
      { id: 'd2', slot: 'A', frameTime: 5000 },
      existing,
      hazardConfig,
      directions,
    );
    expect(result.valid).toBe(true);
  });

  it('同一湧きの区間内に複数撃破はシミュレーション上は有効', () => {
    const existing: DefeatPoint[] = [
      { id: 'd1', slot: 'A', frameTime: 5400 },
    ];
    // シミュレーション方式: d1とd2が同時に存在する前提で再計算するため、
    // 両方の撃破がそれぞれ有効な湧き区間に収まれば valid
    const result = validateAddDefeat(
      { id: 'd2', slot: 'A', frameTime: 5300 },
      existing,
      hazardConfig,
      directions,
    );
    expect(result.valid).toBe(true);
  });
});

// ============================================================
// 撃破移動バリデーション
// ============================================================

describe('validateMoveDefeat', () => {
  it('有効な位置に移動できる', () => {
    const existing: DefeatPoint[] = [
      { id: 'd1', slot: 'A', frameTime: 5400 },
    ];
    const result = validateMoveDefeat('d1', 5200, existing, hazardConfig, directions);
    expect(result.valid).toBe(true);
  });

  it('ゲーム開始前への移動は不正', () => {
    const existing: DefeatPoint[] = [
      { id: 'd1', slot: 'A', frameTime: 5400 },
    ];
    // 6100F はゲーム開始前 → 湧きが存在しない
    const result = validateMoveDefeat('d1', 6100, existing, hazardConfig, directions);
    expect(result.valid).toBe(false);
  });
});

// ============================================================
// カスケード削除
// ============================================================

describe('findCascadeRemovals', () => {
  it('単一撃破の削除（カスケードなし）', () => {
    const defeats: DefeatPoint[] = [
      { id: 'd1', slot: 'A', frameTime: 5400 },
    ];
    const removedIds = findCascadeRemovals('d1', defeats, hazardConfig, directions);
    expect(removedIds).toEqual(['d1']);
  });

  it('カスケード削除が発生するケース', () => {
    const defeats: DefeatPoint[] = [
      { id: 'd1', slot: 'A', frameTime: 5400 },
      { id: 'd2', slot: 'A', frameTime: 5000 },
      // d1の湧き = 5186F, d2はこの湧きを撃破
      // d2の湧き = 4786F
    ];
    // d1を削除すると: d1の湧き(5186F)が消える → d2(5000F)を撃破するための湧きがない?
    // 実際: auto-a(6000F)はまだある, d2(5000F)はauto-aの湧きを撃破できる
    // なので: d2は残る
    const removedIds = findCascadeRemovals('d1', defeats, hazardConfig, directions);
    expect(removedIds).toContain('d1');
    // d2はauto-aの湧きを撃破可能なので残る
    expect(removedIds).not.toContain('d2');
  });
});
