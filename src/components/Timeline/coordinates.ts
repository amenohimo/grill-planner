import type { FrameTime } from '@/types';
import { GAME_DURATION_SECONDS } from '@/constants';
import { framesToSeconds, secondsToFrames } from '@/utils/calculations';

// ============================================================
// タイムライン座標系（06_UI_DESIGN §5 準拠）
// ============================================================

export const PIXELS_PER_SECOND = 16;
export const TIMELINE_WIDTH = GAME_DURATION_SECONDS * PIXELS_PER_SECOND; // 1600px
export const TIMELINE_PADDING = 12; // 左右のパディング

export const DIRECTION_LABEL_HEIGHT = 32;
export const TIME_AXIS_HEIGHT = 24;
export const LANE_HEIGHT = 80;
export const LANE_SPACING = 4;
export const MARKER_SIZE = 20;
export const ACTIVITY_BAR_HEIGHT = 8;

/** フレーム時刻 → ピクセルX座標 */
export function frameToPixelX(frameTime: FrameTime): number {
  const seconds = GAME_DURATION_SECONDS - framesToSeconds(frameTime);
  return seconds * PIXELS_PER_SECOND;
}

/** ピクセルX座標 → フレーム時刻 */
export function pixelXToFrame(pixelX: number): FrameTime {
  const seconds = GAME_DURATION_SECONDS - pixelX / PIXELS_PER_SECOND;
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
