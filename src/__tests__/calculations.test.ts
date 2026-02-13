import { describe, expect, it } from "vitest";
import type { DefeatPoint, DirectionId, DirectionSetting, InterpolatedHazardConfig } from "@/types";
import {
  calculateSpawnerDecisionTime,
  calculateSpawns,
  calculateSpawnTime,
  framesToSeconds,
  generateDefaultDirections,
  getDirectionAtTime,
  secondsToFrames,
} from "@/utils/calculations";

// ============================================================
// 時間変換テスト（02_GAME_MECHANICS §1.2）
// ============================================================

describe("framesToSeconds", () => {
  it("6000F → 100.0s", () => {
    expect(framesToSeconds(6000)).toBe(100.0);
  });

  it("0F → 0.0s", () => {
    expect(framesToSeconds(0)).toBe(0.0);
  });

  it("5400F → 90.0s", () => {
    expect(framesToSeconds(5400)).toBe(90.0);
  });

  it("端数を小数点1桁に丸める", () => {
    // 100F = 1.666... → 1.7
    expect(framesToSeconds(100)).toBe(1.7);
  });
});

describe("secondsToFrames", () => {
  it("100.0s → 6000F", () => {
    expect(secondsToFrames(100)).toBe(6000);
  });

  it("0.0s → 0F", () => {
    expect(secondsToFrames(0)).toBe(0);
  });

  it("小数を整数に丸める", () => {
    // 1.7s → 102F
    expect(secondsToFrames(1.7)).toBe(102);
  });
});

// ============================================================
// リスポーン計算テスト（02_GAME_MECHANICS §3.2）
// ============================================================

describe("calculateSpawnerDecisionTime", () => {
  it("5400F → 5400 - 184 = 5216F", () => {
    expect(calculateSpawnerDecisionTime(5400)).toBe(5216);
  });
});

describe("calculateSpawnTime", () => {
  it("5400F → 5400 - 214 = 5186F", () => {
    expect(calculateSpawnTime(5400)).toBe(5186);
  });
});

// ============================================================
// 方面判定テスト（02_GAME_MECHANICS §5.4）
// ============================================================

describe("getDirectionAtTime", () => {
  const directions: DirectionSetting[] = [
    { frameTime: 6000, direction: 0 as DirectionId },
    { frameTime: 5520, direction: 1 as DirectionId },
    { frameTime: 5040, direction: 2 as DirectionId },
    { frameTime: 4560, direction: 0 as DirectionId },
  ];

  it("§5.4例: 4916F → 5040の区間（direction=2）", () => {
    expect(getDirectionAtTime(4916, directions)).toBe(2);
  });

  it("区間境界: 5520F → direction=1の区間", () => {
    expect(getDirectionAtTime(5520, directions)).toBe(1);
  });

  it("ゲーム開始前: 6030F → 最初の区間（direction=0）", () => {
    expect(getDirectionAtTime(6030, directions)).toBe(0);
  });

  it("最後の区間内: 4560F → direction=0", () => {
    expect(getDirectionAtTime(4560, directions)).toBe(0);
  });
});

// ============================================================
// 湧き点計算テスト（02_GAME_MECHANICS §7）
// ============================================================

describe("calculateSpawns", () => {
  const hazardConfig: InterpolatedHazardConfig = {
    dozerIncrSecond: 30,
    waveChangeNum: 5,
    directionInterval: 14.4,
    bSlotOpenFrame: 3786,
  };

  it("撃破なしでA枠+B枠の自動湧きを生成", () => {
    const directions = generateDefaultDirections(14.4);
    const spawns = calculateSpawns(hazardConfig, directions, []);

    expect(spawns.length).toBe(2);
    expect(spawns[0]).toMatchObject({ slot: "A", frameTime: 6000, isAuto: true });
    expect(spawns[1]).toMatchObject({ slot: "B", isAuto: true });
  });

  it("撃破点から湧き点が生成される", () => {
    const directions = generateDefaultDirections(14.4);
    const defeats: DefeatPoint[] = [{ id: "d1", slot: "A", frameTime: 5400 }];
    const spawns = calculateSpawns(hazardConfig, directions, defeats);

    // auto-a, auto-b, d1のrespawn
    expect(spawns.length).toBe(3);
    const respawn = spawns.find((s) => s.defeatId === "d1");
    expect(respawn).toBeDefined();
    expect(respawn?.frameTime).toBe(5400 - 214); // 5186
    expect(respawn?.slot).toBe("A");
  });

  it("B枠なしの場合はA枠のみ", () => {
    const noBSlotConfig: InterpolatedHazardConfig = {
      ...hazardConfig,
      bSlotOpenFrame: -1,
    };
    const directions = generateDefaultDirections(14.4);
    const spawns = calculateSpawns(noBSlotConfig, directions, []);

    expect(spawns.length).toBe(1);
    expect(spawns[0]).toMatchObject({ slot: "A", isAuto: true });
  });
});

// ============================================================
// 湧き抑制テスト（グローバル湧き抑制）
// ============================================================

describe("calculateSpawns — spawn suppression", () => {
  const hazardConfig: InterpolatedHazardConfig = {
    dozerIncrSecond: 30,
    waveChangeNum: 5,
    directionInterval: 14.4,
    bSlotOpenFrame: 3786,
  };
  const directions = generateDefaultDirections(14.4);

  it("通常: 抑制が発生しない場合はrawFrameTimeと同じ", () => {
    const defeats: DefeatPoint[] = [{ id: "d1", slot: "A", frameTime: 5400 }];
    const spawns = calculateSpawns(hazardConfig, directions, defeats);
    const d1Spawn = spawns.find((s) => s.defeatId === "d1");
    expect(d1Spawn?.frameTime).toBe(5186);
    expect(d1Spawn?.isSuppressed).toBeUndefined();
  });

  it("抑制: A枠B枠の同時撃破で後発の湧きが遅延する（ケース1再現）", () => {
    const defeats: DefeatPoint[] = [
      { id: "d1", slot: "A", frameTime: 3734 },
      { id: "d2", slot: "B", frameTime: 3734 },
    ];
    const spawns = calculateSpawns(hazardConfig, directions, defeats);

    const d1Spawn = spawns.find((s) => s.defeatId === "d1");
    const d2Spawn = spawns.find((s) => s.defeatId === "d2");

    // A枠（優先）: 抑制なし
    expect(d1Spawn?.frameTime).toBe(3520);
    expect(d1Spawn?.isSuppressed).toBeUndefined();

    // B枠: 抑制あり、3520 - 184 = 3336F
    expect(d2Spawn?.frameTime).toBe(3336);
    expect(d2Spawn?.isSuppressed).toBe(true);
    expect(d2Spawn?.rawFrameTime).toBe(3520);
  });

  it("抑制: B枠自動湧きがA枠撃破由来の湧きに抑制される（ケース2類似）", () => {
    const defeats: DefeatPoint[] = [{ id: "d1", slot: "A", frameTime: 4114 }];
    const spawns = calculateSpawns(hazardConfig, directions, defeats);

    const d1Spawn = spawns.find((s) => s.defeatId === "d1");
    const autoB = spawns.find((s) => s.id === "auto-b");

    // A枠撃破由来: 抑制なし
    expect(d1Spawn?.frameTime).toBe(3900);
    expect(d1Spawn?.isSuppressed).toBeUndefined();

    // B枠自動湧き: 抑制あり、3900 - 184 = 3716F
    expect(autoB?.frameTime).toBe(3716);
    expect(autoB?.isSuppressed).toBe(true);
    expect(autoB?.rawFrameTime).toBe(3786);
  });

  it("境界値: ちょうど184F後の湧きは抑制されない", () => {
    const boundaryConfig: InterpolatedHazardConfig = {
      ...hazardConfig,
      bSlotOpenFrame: 6000 - 184, // = 5816F
    };
    const spawns = calculateSpawns(boundaryConfig, directions, []);

    const autoA = spawns.find((s) => s.id === "auto-a");
    const autoB = spawns.find((s) => s.id === "auto-b");

    expect(autoA?.frameTime).toBe(6000);
    expect(autoB?.frameTime).toBe(5816);
    expect(autoB?.isSuppressed).toBeUndefined();
  });

  it("境界値: 184F未満（183F後）の湧きは抑制される", () => {
    const boundaryConfig: InterpolatedHazardConfig = {
      ...hazardConfig,
      bSlotOpenFrame: 6000 - 183, // = 5817F
    };
    const spawns = calculateSpawns(boundaryConfig, directions, []);

    const autoB = spawns.find((s) => s.id === "auto-b");

    expect(autoB?.frameTime).toBe(5816);
    expect(autoB?.isSuppressed).toBe(true);
    expect(autoB?.rawFrameTime).toBe(5817);
  });

  it("同一枠の連続撃破では抑制が発生しない（214F > 184F）", () => {
    const defeats: DefeatPoint[] = [
      { id: "d1", slot: "A", frameTime: 6000 },
      { id: "d2", slot: "A", frameTime: 5786 },
      { id: "d3", slot: "A", frameTime: 5572 },
    ];
    const spawns = calculateSpawns(hazardConfig, directions, defeats);

    const d1Spawn = spawns.find((s) => s.defeatId === "d1");
    const d2Spawn = spawns.find((s) => s.defeatId === "d2");
    const d3Spawn = spawns.find((s) => s.defeatId === "d3");

    expect(d1Spawn?.frameTime).toBe(5786);
    expect(d1Spawn?.isSuppressed).toBeUndefined();
    expect(d2Spawn?.frameTime).toBe(5572);
    expect(d2Spawn?.isSuppressed).toBeUndefined();
    expect(d3Spawn?.frameTime).toBe(5358);
    expect(d3Spawn?.isSuppressed).toBeUndefined();
  });

  it("抑制なし: 異なる枠でも十分間隔が空いている場合", () => {
    const defeats: DefeatPoint[] = [
      { id: "d1", slot: "A", frameTime: 5400 },
      { id: "d2", slot: "B", frameTime: 3700 },
    ];
    const spawns = calculateSpawns(hazardConfig, directions, defeats);

    const d1Spawn = spawns.find((s) => s.defeatId === "d1");
    const d2Spawn = spawns.find((s) => s.defeatId === "d2");
    expect(d1Spawn?.isSuppressed).toBeUndefined();
    expect(d2Spawn?.isSuppressed).toBeUndefined();
  });

  it("A枠自動湧きとB枠自動湧きの間に抑制が発生しない（十分な間隔）", () => {
    const spawns = calculateSpawns(hazardConfig, directions, []);
    const autoA = spawns.find((s) => s.id === "auto-a");
    const autoB = spawns.find((s) => s.id === "auto-b");
    expect(autoA?.isSuppressed).toBeUndefined();
    expect(autoB?.isSuppressed).toBeUndefined();
  });
});
