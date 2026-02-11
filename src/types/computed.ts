import type { FrameTime, DirectionId } from './base';

/** 補間後のキケン度設定 */
export interface InterpolatedHazardConfig {
  readonly dozerIncrSecond: number;
  readonly waveChangeNum: number;
  readonly directionInterval: number;
  readonly bSlotOpenFrame: FrameTime;
}

/** 方面別統計 */
export interface DirectionStats {
  readonly directionIndex: number;
  readonly direction: DirectionId;
  readonly spawnCount: number;
  readonly defeatCount: number;
}
