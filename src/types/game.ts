import type { FrameTime, GrillSlot, DirectionName } from './base';

/** 撃破点 — ユーザーが配置する */
export interface DefeatPoint {
  readonly id: string;
  readonly slot: GrillSlot;
  readonly frameTime: FrameTime;
}

/** 湧き点 — 計算結果として生成される */
export interface SpawnPoint {
  readonly id: string;
  readonly slot: GrillSlot;
  readonly frameTime: FrameTime;
  readonly direction: DirectionName;
  readonly isAuto: boolean;
  readonly defeatId?: string;
}

/** 方面設定 — 1つの方面切替区間 */
export interface DirectionSetting {
  readonly frameTime: FrameTime;
  readonly direction: DirectionName;
}
