import type {
  FrameTime,
  DefeatPoint,
  SpawnPoint,
  DirectionSetting,
  DirectionStats,
} from '@/types';
import { SPAWNER_DECISION_FRAMES, SPAWN_WAIT_FRAMES } from '@/constants';

// ============================================================
// 方面別統計集計（02_GAME_MECHANICS §10）
// ============================================================

/**
 * スポナー決定時刻がどの方面区間（インデックス）に属するか判定
 * 02_GAME_MECHANICS §10.2
 *
 * 降順配列: directions[0] が最も過去（大きいframeTime）
 * 区間 i: directions[i].frameTime ≥ T > directions[i+1].frameTime
 * ただし、ゲーム開始前（T > directions[0].frameTime）は区間0に分類
 */
function findDirectionIndex(
  spawnerDecisionFrame: FrameTime,
  sortedDirections: readonly DirectionSetting[],
): number {
  // ゲーム開始前の決定（自動湧き 6030F 等）は最初の区間に分類
  if (
    sortedDirections.length > 0 &&
    sortedDirections[0] !== undefined &&
    spawnerDecisionFrame > sortedDirections[0].frameTime
  ) {
    return 0;
  }

  for (let i = 0; i < sortedDirections.length; i++) {
    const current = sortedDirections[i];
    if (current === undefined) continue;
    const next = sortedDirections[i + 1];

    const lower = current.frameTime;
    const upper = next !== undefined ? next.frameTime : -Infinity;

    if (spawnerDecisionFrame <= lower && spawnerDecisionFrame > upper) {
      return i;
    }
  }

  // フォールバック: 最後の区間
  return sortedDirections.length - 1;
}

/**
 * 各湧き点のスポナー決定時刻を取得
 * 02_GAME_MECHANICS §10.1:
 *   - 自動湧き: 出現フレーム + SPAWN_WAIT_FRAMES
 *   - 撃破からの湧き: 対応する撃破フレーム − SPAWNER_DECISION_FRAMES
 */
function getSpawnerDecisionFrame(
  spawn: SpawnPoint,
  defeats: readonly DefeatPoint[],
): FrameTime {
  if (spawn.isAuto) {
    return spawn.frameTime + SPAWN_WAIT_FRAMES;
  }
  // 撃破由来: defeatId から撃破を特定
  if (spawn.defeatId) {
    const defeat = defeats.find((d) => d.id === spawn.defeatId);
    if (defeat) {
      return defeat.frameTime - SPAWNER_DECISION_FRAMES;
    }
  }
  // フォールバック
  return spawn.frameTime + SPAWN_WAIT_FRAMES;
}

/**
 * 方面別の統計を集計する
 */
export function calculateDirectionStats(
  spawns: readonly SpawnPoint[],
  defeats: readonly DefeatPoint[],
  directions: readonly DirectionSetting[],
): readonly DirectionStats[] {
  const sortedDirections = [...directions].sort((a, b) => b.frameTime - a.frameTime);

  // 各区間の湧きカウントを初期化
  const spawnCounts = new Array<number>(sortedDirections.length).fill(0);

  // 各湧き点を区間に分類してカウント
  for (const spawn of spawns) {
    const decisionFrame = getSpawnerDecisionFrame(spawn, defeats);
    const index = findDirectionIndex(decisionFrame, sortedDirections);
    if (index >= 0 && index < spawnCounts.length) {
      spawnCounts[index]!++;
    }
  }

  // 撃破数集計: 枠ごとに降順ソートした湧きと撃破を1対1マッチング
  const defeatCounts = new Array<number>(sortedDirections.length).fill(0);

  for (const slot of ['A', 'B'] as const) {
    const slotSpawns = spawns
      .filter((s) => s.slot === slot)
      .sort((a, b) => b.frameTime - a.frameTime);
    const slotDefeats = defeats
      .filter((d) => d.slot === slot)
      .sort((a, b) => b.frameTime - a.frameTime);

    let spawnIdx = 0;
    for (const defeat of slotDefeats) {
      while (
        spawnIdx < slotSpawns.length &&
        slotSpawns[spawnIdx]!.frameTime < defeat.frameTime
      ) {
        spawnIdx++;
      }
      if (spawnIdx >= slotSpawns.length) break;

      const matchedSpawn = slotSpawns[spawnIdx]!;
      const decisionFrame = getSpawnerDecisionFrame(matchedSpawn, defeats);
      const dirIndex = findDirectionIndex(decisionFrame, sortedDirections);
      if (dirIndex >= 0 && dirIndex < defeatCounts.length) {
        defeatCounts[dirIndex]!++;
      }
      spawnIdx++;
    }
  }

  // DirectionStats 配列を生成
  return sortedDirections.map((dir, index) => ({
    directionIndex: index,
    direction: dir.direction,
    spawnCount: spawnCounts[index] ?? 0,
    defeatCount: defeatCounts[index] ?? 0,
  }));
}
