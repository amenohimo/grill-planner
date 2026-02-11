import { describe, it, expect } from 'vitest';
import {
  framesToSeconds,
  secondsToFrames,
  calculateSpawnerDecisionTime,
  calculateSpawnTime,
  getDirectionAtTime,
  calculateSpawns,
  generateDefaultDirections,
} from '@/utils/calculations';
import type { InterpolatedHazardConfig, DirectionSetting, DefeatPoint, DirectionId } from '@/types';

// ============================================================
// 時間変換テスト（02_GAME_MECHANICS §1.2）
// ============================================================

describe('framesToSeconds', () => {
  it('6000F → 100.0s', () => {
    expect(framesToSeconds(6000)).toBe(100.0);
  });

  it('0F → 0.0s', () => {
    expect(framesToSeconds(0)).toBe(0.0);
  });

  it('5400F → 90.0s', () => {
    expect(framesToSeconds(5400)).toBe(90.0);
  });

  it('端数を小数点1桁に丸める', () => {
    // 100F = 1.666... → 1.7
    expect(framesToSeconds(100)).toBe(1.7);
  });
});

describe('secondsToFrames', () => {
  it('100.0s → 6000F', () => {
    expect(secondsToFrames(100)).toBe(6000);
  });

  it('0.0s → 0F', () => {
    expect(secondsToFrames(0)).toBe(0);
  });

  it('小数を整数に丸める', () => {
    // 1.7s → 102F
    expect(secondsToFrames(1.7)).toBe(102);
  });
});

// ============================================================
// リスポーン計算テスト（02_GAME_MECHANICS §3.2）
// ============================================================

describe('calculateSpawnerDecisionTime', () => {
  it('5400F → 5400 - 184 = 5216F', () => {
    expect(calculateSpawnerDecisionTime(5400)).toBe(5216);
  });
});

describe('calculateSpawnTime', () => {
  it('5400F → 5400 - 214 = 5186F', () => {
    expect(calculateSpawnTime(5400)).toBe(5186);
  });
});

// ============================================================
// 方面判定テスト（02_GAME_MECHANICS §5.4）
// ============================================================

describe('getDirectionAtTime', () => {
  const directions: DirectionSetting[] = [
    { frameTime: 6000, direction: 0 as DirectionId },
    { frameTime: 5520, direction: 1 as DirectionId },
    { frameTime: 5040, direction: 2 as DirectionId },
    { frameTime: 4560, direction: 0 as DirectionId },
  ];

  it('§5.4例: 4916F → 5040の区間（direction=2）', () => {
    expect(getDirectionAtTime(4916, directions)).toBe(2);
  });

  it('区間境界: 5520F → direction=1の区間', () => {
    expect(getDirectionAtTime(5520, directions)).toBe(1);
  });

  it('ゲーム開始前: 6030F → 最初の区間（direction=0）', () => {
    expect(getDirectionAtTime(6030, directions)).toBe(0);
  });

  it('最後の区間内: 4560F → direction=0', () => {
    expect(getDirectionAtTime(4560, directions)).toBe(0);
  });
});

// ============================================================
// 湧き点計算テスト（02_GAME_MECHANICS §7）
// ============================================================

describe('calculateSpawns', () => {
  const hazardConfig: InterpolatedHazardConfig = {
    dozerIncrSecond: 30,
    waveChangeNum: 5,
    directionInterval: 14.4,
    bSlotOpenFrame: 3786,
  };

  it('撃破なしでA枠+B枠の自動湧きを生成', () => {
    const directions = generateDefaultDirections(14.4);
    const spawns = calculateSpawns(hazardConfig, directions, []);

    expect(spawns.length).toBe(2);
    expect(spawns[0]).toMatchObject({ slot: 'A', frameTime: 6000, isAuto: true });
    expect(spawns[1]).toMatchObject({ slot: 'B', isAuto: true });
  });

  it('撃破点から湧き点が生成される', () => {
    const directions = generateDefaultDirections(14.4);
    const defeats: DefeatPoint[] = [
      { id: 'd1', slot: 'A', frameTime: 5400 },
    ];
    const spawns = calculateSpawns(hazardConfig, directions, defeats);

    // auto-a, auto-b, d1のrespawn
    expect(spawns.length).toBe(3);
    const respawn = spawns.find((s) => s.defeatId === 'd1');
    expect(respawn).toBeDefined();
    expect(respawn!.frameTime).toBe(5400 - 214); // 5186
    expect(respawn!.slot).toBe('A');
  });

  it('B枠なしの場合はA枠のみ', () => {
    const noBSlotConfig: InterpolatedHazardConfig = {
      ...hazardConfig,
      bSlotOpenFrame: -1,
    };
    const directions = generateDefaultDirections(14.4);
    const spawns = calculateSpawns(noBSlotConfig, directions, []);

    expect(spawns.length).toBe(1);
    expect(spawns[0]).toMatchObject({ slot: 'A', isAuto: true });
  });
});
