import type {
  FrameTime,
  SecondTime,
  DefeatPoint,
  SpawnPoint,
  DirectionSetting,
  DirectionName,
  HazardConfigData,
  InterpolatedHazardConfig,
} from '@/types';
import {
  FPS,
  SPAWNER_DECISION_FRAMES,
  RESPAWN_FRAMES,
  SPAWN_WAIT_FRAMES,
  GAME_DURATION_FRAMES,
  GAME_DURATION_SECONDS,
  DIRECTION_SWITCH_BASE,
} from '@/constants';

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
export function getHazardConfig(
  hazardLevel: number,
  configData: HazardConfigData,
): InterpolatedHazardConfig {
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
    return buildHazardConfig(
      lower.EventDozer.DozerIncrSecond,
      lower.WaveChangeNum,
    );
  }

  const ratio = (hazardLevel - lower.Difficulty) / (upper.Difficulty - lower.Difficulty);
  const dozerIncrSecond =
    lower.EventDozer.DozerIncrSecond +
    (upper.EventDozer.DozerIncrSecond - lower.EventDozer.DozerIncrSecond) * ratio;
  const waveChangeNum = Math.floor(
    lower.WaveChangeNum + (upper.WaveChangeNum - lower.WaveChangeNum) * ratio,
  );

  return buildHazardConfig(dozerIncrSecond, waveChangeNum);
}

function buildHazardConfig(
  dozerIncrSecond: number,
  waveChangeNum: number,
): InterpolatedHazardConfig {
  const directionInterval = DIRECTION_SWITCH_BASE / waveChangeNum;
  const bSlotBaseFrame = secondsToFrames(GAME_DURATION_SECONDS - dozerIncrSecond);
  const bSlotSpawnerDecisionFrame = bSlotBaseFrame - SPAWNER_DECISION_FRAMES;
  const bSlotOpenFrame = bSlotBaseFrame - RESPAWN_FRAMES;

  return {
    dozerIncrSecond,
    waveChangeNum,
    directionInterval,
    bSlotSpawnerDecisionFrame,
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
export function generateDefaultDirections(
  directionInterval: number,
): readonly DirectionSetting[] {
  const times = getDirectionSwitchTimes(directionInterval);
  return times.map((frameTime, index) => ({
    frameTime,
    direction: `方面${index + 1}`,
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
): DirectionName {
  for (let i = sortedDirections.length - 1; i >= 0; i--) {
    const setting = sortedDirections[i];
    if (setting && setting.frameTime >= spawnerDecisionFrame) {
      return setting.direction;
    }
  }
  // フォールバック: ゲーム開始前のスポナー決定（6030F等）は最初の区間
  return sortedDirections[0]?.direction ?? '';
}

// ============================================================
// 6. 湧き点の計算（02_GAME_MECHANICS §7.1）
// ============================================================

/** 全湧き点を計算する純粋関数 */
export function calculateSpawns(
  hazardConfig: InterpolatedHazardConfig,
  directions: readonly DirectionSetting[],
  defeats: readonly DefeatPoint[],
): readonly SpawnPoint[] {
  const result: SpawnPoint[] = [];
  const sortedDirections = [...directions].sort((a, b) => b.frameTime - a.frameTime);

  // A枠 自動湧き (6000F)
  // スポナー決定時刻 = 6000 + 30 = 6030F（ゲーム開始前）→ 最初の区間
  const firstDirection = sortedDirections[0]?.direction ?? '';
  result.push({
    id: 'auto-a',
    slot: 'A',
    frameTime: GAME_DURATION_FRAMES,
    direction: firstDirection,
    isAuto: true,
  });

  // B枠 自動湧き（存在する場合）
  if (hazardConfig.bSlotOpenFrame >= 0) {
    // B枠のスポナー決定時刻 = 出現フレーム + SPAWN_WAIT_FRAMES
    const bSlotSpawnerDecision = hazardConfig.bSlotOpenFrame + SPAWN_WAIT_FRAMES;
    result.push({
      id: 'auto-b',
      slot: 'B',
      frameTime: hazardConfig.bSlotOpenFrame,
      direction: getDirectionAtTime(bSlotSpawnerDecision, sortedDirections),
      isAuto: true,
    });
  }

  // 撃破点から湧き点を生成
  for (const defeat of defeats) {
    const spawnerDecisionTime = calculateSpawnerDecisionTime(defeat.frameTime);
    const spawnTime = calculateSpawnTime(defeat.frameTime);
    result.push({
      id: defeat.id,
      slot: defeat.slot,
      frameTime: spawnTime,
      direction: getDirectionAtTime(spawnerDecisionTime, sortedDirections),
      isAuto: false,
      defeatId: defeat.id,
    });
  }

  return result;
}
