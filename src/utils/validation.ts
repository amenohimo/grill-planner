import type {
  FrameTime,
  DefeatPoint,
  SpawnPoint,
  DirectionSetting,
  InterpolatedHazardConfig,
} from '@/types';
import { RESPAWN_FRAMES } from '@/constants';
import { calculateSpawns } from './calculations';

// ============================================================
// 撃破可能条件バリデーション（02_GAME_MECHANICS §8）
// シミュレーション方式: 仮追加 → 再計算 → 整合性チェック
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
  const testDefeats = existingDefeats.map((d) =>
    d.id === defeatId ? { ...d, frameTime: newFrameTime } : d,
  );
  return validateAllDefeats(testDefeats, hazardConfig, directions);
}

/**
 * 全撃破点の整合性を検証する
 */
function validateAllDefeats(
  defeats: readonly DefeatPoint[],
  hazardConfig: InterpolatedHazardConfig,
  directions: readonly DirectionSetting[],
): ValidationResult {
  const testSpawns = calculateSpawns(hazardConfig, directions, defeats);

  for (const defeat of defeats) {
    if (!isConsistentDefeat(defeat, testSpawns)) {
      return {
        valid: false,
        reason: `撃破点 ${defeat.id} (${defeat.frameTime}F, ${defeat.slot}枠) が不整合`,
      };
    }
  }

  return { valid: true };
}

/**
 * 個別の撃破点が再計算後のspawnsと整合するか検証
 * 02_GAME_MECHANICS §8.5 の最終定義:
 *   lastSpawn.frameTime >= defeat.frameTime > nextSpawn.frameTime
 */
function isConsistentDefeat(
  defeat: DefeatPoint,
  spawns: readonly SpawnPoint[],
): boolean {
  const slotSpawns = spawns
    .filter((s) => s.slot === defeat.slot)
    .sort((a, b) => b.frameTime - a.frameTime); // 降順

  // 撃破時刻以上（同時含む過去側）の湧きを取得
  const pastSpawns = slotSpawns.filter((s) => s.frameTime >= defeat.frameTime);
  if (pastSpawns.length === 0) return false;

  // 最も近い過去の湧き（降順なので末尾が最小 = 最も近い）
  const lastSpawn = pastSpawns[pastSpawns.length - 1];
  if (!lastSpawn) return false;

  // 撃破時刻未満（未来側）の湧きを取得
  const futureSpawns = slotSpawns.filter((s) => s.frameTime < defeat.frameTime);
  if (futureSpawns.length === 0) return true; // 以降の湧きがなければ0秒まで撃破可能

  // 降順なので先頭が最大（最も近い未来）
  const nextSpawn = futureSpawns[0];
  if (!nextSpawn) return true;

  // 撃破は次の湧きより過去でなければならない
  return defeat.frameTime > nextSpawn.frameTime;
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
