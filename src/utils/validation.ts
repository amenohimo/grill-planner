import { RESPAWN_FRAMES } from "@/constants";
import type { DefeatPoint, DirectionSetting, FrameTime, InterpolatedHazardConfig, SpawnPoint } from "@/types";
import { calculateSpawns } from "./calculations";

// ============================================================
// 撃破可能条件バリデーション（02_GAME_MECHANICS §8）
// シミュレーション方式: 仮追加 → 再計算 → チェーン検証
// ============================================================

export interface ValidationResult {
  readonly valid: boolean;
  readonly reason?: string;
}

/**
 * 撃破点の追加を検証する
 * ※ 「現在のspawnsで判定」ではなく、仮追加後に再計算して検証（P0バグ回避）
 */
export function validateAddDefeat(
  newDefeat: DefeatPoint,
  existingDefeats: readonly DefeatPoint[],
  hazardConfig: InterpolatedHazardConfig,
  directions: readonly DirectionSetting[],
): ValidationResult {
  const testDefeats = [...existingDefeats, newDefeat];
  return validateAllDefeats(testDefeats, hazardConfig, directions);
}

/**
 * 撃破点の移動を検証する
 */
export function validateMoveDefeat(
  defeatId: string,
  newFrameTime: FrameTime,
  existingDefeats: readonly DefeatPoint[],
  hazardConfig: InterpolatedHazardConfig,
  directions: readonly DirectionSetting[],
): ValidationResult {
  const testDefeats = existingDefeats.map((d) => (d.id === defeatId ? { ...d, frameTime: newFrameTime } : d));
  return validateAllDefeats(testDefeats, hazardConfig, directions);
}

/**
 * 全撃破点の整合性を枠単位のチェーン検証で判定する。
 * 1つの湧きは1つの撃破にしか対応できないため、枠ごとに1対1マッチングを行う。
 */
function validateAllDefeats(
  defeats: readonly DefeatPoint[],
  hazardConfig: InterpolatedHazardConfig,
  directions: readonly DirectionSetting[],
): ValidationResult {
  const testSpawns = calculateSpawns(hazardConfig, directions, defeats);

  for (const slot of ["A", "B"] as const) {
    const slotSpawns = testSpawns.filter((s) => s.slot === slot).sort((a, b) => b.frameTime - a.frameTime); // 降順
    const slotDefeats = defeats.filter((d) => d.slot === slot).sort((a, b) => b.frameTime - a.frameTime); // 降順

    if (!validateSlotChain(slotSpawns, slotDefeats)) {
      return {
        valid: false,
        reason: `${slot}枠の湧き-撃破チェーンが不整合`,
      };
    }
  }

  return { valid: true };
}

/**
 * 枠内の湧き-撃破チェーンの整合性を検証する。
 * 1つの湧きは1つの撃破にしか対応できないため、降順に1対1マッチングを行う。
 * @param sortedSpawns 降順ソート済み（大きい frameTime = ゲーム開始寄り が先頭）
 * @param sortedDefeats 降順ソート済み（大きい frameTime = ゲーム開始寄り が先頭）
 */
function validateSlotChain(sortedSpawns: readonly SpawnPoint[], sortedDefeats: readonly DefeatPoint[]): boolean {
  let spawnIdx = 0;

  for (const defeat of sortedDefeats) {
    // この撃破に対応する湧きを探す（defeat.frameTime 以上の湧き）
    while (spawnIdx < sortedSpawns.length && sortedSpawns[spawnIdx]!.frameTime < defeat.frameTime) {
      spawnIdx++;
    }

    if (spawnIdx >= sortedSpawns.length) {
      return false; // 対応する湧きがない
    }

    // この湧きはこの撃破で消費 → 次へ
    spawnIdx++;
  }

  return true;
}

// ============================================================
// 撃破削除時のカスケード判定
// ============================================================

/**
 * 撃破点の削除後に不整合となる撃破点を取得（カスケード削除用）
 * 削除 → 再計算 → チェーン検証 → さらに削除… を安定するまで繰り返す
 */
export function findCascadeRemovals(
  removedId: string,
  allDefeats: readonly DefeatPoint[],
  hazardConfig: InterpolatedHazardConfig,
  directions: readonly DirectionSetting[],
): readonly string[] {
  const remaining = allDefeats.filter((d) => d.id !== removedId);
  const invalidIds = findAllInvalidDefeats(remaining, hazardConfig, directions);
  return [removedId, ...invalidIds];
}

/**
 * チェーン検証で不正と判定された撃破IDの一覧を返す。
 * @param sortedSpawns 降順ソート済み（大きい frameTime = ゲーム開始寄り が先頭）
 * @param sortedDefeats 降順ソート済み（大きい frameTime = ゲーム開始寄り が先頭）
 */
function findInvalidDefeatsInChain(
  sortedSpawns: readonly SpawnPoint[],
  sortedDefeats: readonly DefeatPoint[],
): string[] {
  const invalidIds: string[] = [];
  let spawnIdx = 0;

  for (const defeat of sortedDefeats) {
    while (spawnIdx < sortedSpawns.length && sortedSpawns[spawnIdx]!.frameTime < defeat.frameTime) {
      spawnIdx++;
    }

    if (spawnIdx >= sortedSpawns.length) {
      // 残りの撃破はすべて不正
      invalidIds.push(defeat.id);
      continue;
    }

    // 消費して次へ
    spawnIdx++;
  }

  return invalidIds;
}

// ============================================================
// インポート時の不正撃破検出
// ============================================================

/**
 * 撃破点の一覧からチェーン検証で不正な撃破のIDを返す。
 * カスケード的に再計算を繰り返し、安定するまで不正な撃破を除去する。
 */
export function findAllInvalidDefeats(
  defeats: readonly DefeatPoint[],
  hazardConfig: InterpolatedHazardConfig,
  directions: readonly DirectionSetting[],
): readonly string[] {
  let remaining = [...defeats];
  let changed = true;

  while (changed) {
    changed = false;
    const spawns = calculateSpawns(hazardConfig, directions, remaining);

    for (const slot of ["A", "B"] as const) {
      const slotSpawns = spawns.filter((s) => s.slot === slot).sort((a, b) => b.frameTime - a.frameTime);
      const slotDefeats = remaining.filter((d) => d.slot === slot).sort((a, b) => b.frameTime - a.frameTime);

      const invalidIds = findInvalidDefeatsInChain(slotSpawns, slotDefeats);
      if (invalidIds.length > 0) {
        remaining = remaining.filter((d) => !invalidIds.includes(d.id));
        changed = true;
      }
    }
  }

  const validIds = new Set(remaining.map((d) => d.id));
  return defeats.filter((d) => !validIds.has(d.id)).map((d) => d.id);
}

// ============================================================
// 撃破移動時の影響判定（02_GAME_MECHANICS §9）
// ============================================================

/**
 * 撃破点の時刻変更によって影響を受ける（削除が必要な）撃破点を取得
 */
export function getAffectedDefeats(
  changedDefeatId: string,
  newFrameTime: FrameTime,
  allDefeats: readonly DefeatPoint[],
): readonly DefeatPoint[] {
  const changedDefeat = allDefeats.find((d) => d.id === changedDefeatId);
  if (!changedDefeat) return [];

  const newSpawnTime = newFrameTime - RESPAWN_FRAMES;

  return allDefeats.filter(
    (d) =>
      d.slot === changedDefeat.slot &&
      d.id !== changedDefeatId &&
      d.frameTime < changedDefeat.frameTime && // 変更した撃破より未来
      d.frameTime > newSpawnTime, // 新しい湧きより過去（不正領域）
  );
}
