import type { FrameTime } from '@/types';
import { GAME_DURATION_SECONDS } from '@/constants';
import { framesToSeconds, secondsToFrames } from '@/utils/calculations';

// ============================================================
// タイムライン座標系（縦軸＝時間、上=100s、下=0s）
// ============================================================

export const PIXELS_PER_SECOND = 16;
export const TIMELINE_HEIGHT = GAME_DURATION_SECONDS * PIXELS_PER_SECOND; // 1600px
export const TIMELINE_PADDING = 12; // 上下のパディング

export const DIRECTION_LABEL_WIDTH = 56;
export const TIME_AXIS_WIDTH = 28;
export const LANE_WIDTH = 100;
export const LANE_SPACING = 4;
export const MARKER_SIZE = 14;
export const ACTIVITY_BAR_WIDTH = 8;

/** フレーム時刻 → ピクセルY座標（上=100s, 下=0s） */
export function frameToPixelY(frameTime: FrameTime): number {
  const seconds = GAME_DURATION_SECONDS - framesToSeconds(frameTime);
  return seconds * PIXELS_PER_SECOND;
}

/** ピクセルY座標 → フレーム時刻 */
export function pixelYToFrame(pixelY: number): FrameTime {
  const seconds = GAME_DURATION_SECONDS - pixelY / PIXELS_PER_SECOND;
  return secondsToFrames(seconds);
}

/** 方面バンドの色（CSSカスタムプロパティ） */
export const DIR_BAND_COLORS = [
  'var(--color-dir-1)',
  'var(--color-dir-2)',
  'var(--color-dir-3)',
  'var(--color-dir-4)',
  'var(--color-dir-5)',
  'var(--color-dir-6)',
  'var(--color-dir-7)',
  'var(--color-dir-8)',
  'var(--color-dir-9)',
] as const;
