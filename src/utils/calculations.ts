import {
  DIRECTION_SWITCH_BASE,
  FPS,
  GAME_DURATION_FRAMES,
  GAME_DURATION_SECONDS,
  RESPAWN_FRAMES,
  SPAWN_SUPPRESSION_FRAMES,
  SPAWN_WAIT_FRAMES,
  SPAWNER_DECISION_FRAMES,
} from "@/constants";
import type {
  DefeatPoint,
  DirectionId,
  DirectionSetting,
  FrameTime,
  HazardConfigData,
  InterpolatedHazardConfig,
  SecondTime,
  SpawnPoint,
} from "@/types";

// ============================================================
// 1. 時間変換（02_GAME_MECHANICS §1.2）
// ============================================================

/** フレーム → 秒（小数点1桁、四捨五入） */
export function framesToSeconds(frames: FrameTime): SecondTime {
  return Math.round((frames / FPS) * 10) / 10;
}

/** 秒 → フレーム（整数に四捨五入） */
export function secondsToFrames(seconds: SecondTime): FrameTime {
  return Math.round(seconds * FPS);
}

// ============================================================
// 2. リスポーン計算（02_GAME_MECHANICS §3.2）
// ============================================================

/** 撃破フレーム → スポナー決定フレーム */
export function calculateSpawnerDecisionTime(defeatFrame: FrameTime): FrameTime {
  return defeatFrame - SPAWNER_DECISION_FRAMES;
}

/** 撃破フレーム → 実体出現フレーム */
export function calculateSpawnTime(defeatFrame: FrameTime): FrameTime {
  return defeatFrame - RESPAWN_FRAMES;
}

// ============================================================
// 3. キケン度補間（02_GAME_MECHANICS §6.2）
// ============================================================

/** キケン度からパラメータを取得（線形補間） */
export function getHazardConfig(hazardLevel: number, configData: HazardConfigData): InterpolatedHazardConfig {
  // 完全一致を探す
  const exact = configData.find((c) => c.Difficulty === hazardLevel);
  if (exact) {
    const dozerIncrSecond = exact.EventDozer.DozerIncrSecond;
    const waveChangeNum = exact.WaveChangeNum;
    return buildHazardConfig(dozerIncrSecond, waveChangeNum);
  }

  // 上下の基準値を探す
  const first = configData[0];
  if (!first) {
    return buildHazardConfig(30, 5); // フォールバック（キケン度100%相当）
  }

  let lower = first;
  let upper = first;
  for (const entry of configData) {
    if (entry.Difficulty <= hazardLevel) {
      lower = entry;
    }
    if (entry.Difficulty > hazardLevel) {
      upper = entry;
      break;
    }
  }

  // lower と upper が同じ場合（範囲外）はそのまま使用
  if (lower === upper || lower.Difficulty === upper.Difficulty) {
    return buildHazardConfig(lower.EventDozer.DozerIncrSecond, lower.WaveChangeNum);
  }

  const ratio = (hazardLevel - lower.Difficulty) / (upper.Difficulty - lower.Difficulty);
  const dozerIncrSecond =
    lower.EventDozer.DozerIncrSecond + (upper.EventDozer.DozerIncrSecond - lower.EventDozer.DozerIncrSecond) * ratio;
  const waveChangeNum = Math.floor(lower.WaveChangeNum + (upper.WaveChangeNum - lower.WaveChangeNum) * ratio);

  return buildHazardConfig(dozerIncrSecond, waveChangeNum);
}

function buildHazardConfig(dozerIncrSecond: number, waveChangeNum: number): InterpolatedHazardConfig {
  const directionInterval = DIRECTION_SWITCH_BASE / waveChangeNum;
  const bSlotBaseFrame = secondsToFrames(GAME_DURATION_SECONDS - dozerIncrSecond);
  const bSlotOpenFrame = bSlotBaseFrame - RESPAWN_FRAMES;

  return {
    dozerIncrSecond,
    waveChangeNum,
    directionInterval,
    bSlotOpenFrame,
  };
}

// ============================================================
// 4. 方面切替タイミング（02_GAME_MECHANICS §5.2）
// ============================================================

/** 方面切替タイミングのフレーム配列を生成（降順） */
export function getDirectionSwitchTimes(directionInterval: number): FrameTime[] {
  const times: FrameTime[] = [];
  // インデックス掛け算で浮動小数点誤差を回避
  for (let i = 0; ; i++) {
    const seconds = GAME_DURATION_SECONDS - directionInterval * i;
    if (seconds < 0) break;
    times.push(secondsToFrames(seconds));
  }
  return times;
}

/** デフォルトの方面設定を生成 */
export function generateDefaultDirections(directionInterval: number): readonly DirectionSetting[] {
  const times = getDirectionSwitchTimes(directionInterval);
  return times.map((frameTime, i) => ({
    frameTime,
    direction: (i % 3) as DirectionId,
  }));
}

// ============================================================
// 5. 方面判定（02_GAME_MECHANICS §5.4）
// ============================================================

/**
 * スポナー決定時刻がどの方面に属するか判定
 *
 * 降順配列を末尾から走査（昇順方向）し、frameTime >= spawnerDecisionFrame を
 * 満たす最初の設定を返す。これにより「spawnerDecisionFrame 以上で最小の frameTime」
 * を持つ区間＝スポナー決定時刻が属する区間を特定する。
 *
 * §5.4 判定例:
 *   dirs=[6000,5520,5040,4560], decision=4916 → 5040の区間（末尾から走査して最初に>=を満たす）
 */
export function getDirectionAtTime(
  spawnerDecisionFrame: FrameTime,
  sortedDirections: readonly DirectionSetting[],
): DirectionId {
  for (let i = sortedDirections.length - 1; i >= 0; i--) {
    const setting = sortedDirections[i];
    if (setting && setting.frameTime >= spawnerDecisionFrame) {
      return setting.direction;
    }
  }
  // フォールバック: ゲーム開始前のスポナー決定（6030F等）は最初の区間
  return sortedDirections[0]?.direction ?? 1;
}

// ============================================================
// 6. 湧き点の計算（02_GAME_MECHANICS §7.1）
// ============================================================

interface PendingSpawn {
  id: string;
  slot: "A" | "B";
  rawFrameTime: FrameTime;
  direction: DirectionId;
  isAuto: boolean;
  defeatId?: string;
}

/** 全湧き点を計算する純粋関数（グローバル湧き抑制適用） */
export function calculateSpawns(
  hazardConfig: InterpolatedHazardConfig,
  directions: readonly DirectionSetting[],
  defeats: readonly DefeatPoint[],
): readonly SpawnPoint[] {
  const sortedDirections = [...directions].sort((a, b) => b.frameTime - a.frameTime);

  // === Phase 1: 全湧きの rawFrameTime を計算 ===
  const pending: PendingSpawn[] = [];

  // A枠 自動湧き
  const firstDirection: DirectionId = sortedDirections[0]?.direction ?? 1;
  pending.push({
    id: "auto-a",
    slot: "A",
    rawFrameTime: GAME_DURATION_FRAMES,
    direction: firstDirection,
    isAuto: true,
  });

  // B枠 自動湧き
  if (hazardConfig.bSlotOpenFrame >= 0) {
    const bSlotSpawnerDecision = hazardConfig.bSlotOpenFrame + SPAWN_WAIT_FRAMES;
    pending.push({
      id: "auto-b",
      slot: "B",
      rawFrameTime: hazardConfig.bSlotOpenFrame,
      direction: getDirectionAtTime(bSlotSpawnerDecision, sortedDirections),
      isAuto: true,
    });
  }

  // 撃破由来の湧き
  for (const defeat of defeats) {
    const spawnerDecisionTime = calculateSpawnerDecisionTime(defeat.frameTime);
    const rawSpawnTime = calculateSpawnTime(defeat.frameTime);
    pending.push({
      id: `spawn-${defeat.id}`,
      slot: defeat.slot,
      rawFrameTime: rawSpawnTime,
      direction: getDirectionAtTime(spawnerDecisionTime, sortedDirections),
      isAuto: false,
      defeatId: defeat.id,
    });
  }

  // === Phase 2: 降順ソート → 抑制適用 ===
  pending.sort((a, b) => {
    if (b.rawFrameTime !== a.rawFrameTime) return b.rawFrameTime - a.rawFrameTime;
    if (a.slot !== b.slot) return a.slot === "A" ? -1 : 1;
    return 0;
  });

  const result: SpawnPoint[] = [];
  let lastSpawnFrame = Number.POSITIVE_INFINITY;

  for (const p of pending) {
    const suppressionLimit = lastSpawnFrame - SPAWN_SUPPRESSION_FRAMES;
    const isSuppressed = p.rawFrameTime > suppressionLimit;
    const actualFrameTime = isSuppressed ? suppressionLimit : p.rawFrameTime;

    result.push({
      id: p.id,
      slot: p.slot,
      frameTime: actualFrameTime,
      direction: p.direction,
      isAuto: p.isAuto,
      defeatId: p.defeatId,
      ...(isSuppressed ? { isSuppressed: true, rawFrameTime: p.rawFrameTime } : {}),
    });

    lastSpawnFrame = actualFrameTime;
  }

  return result;
}
