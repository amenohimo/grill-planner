import { GAME_DURATION_SECONDS } from "@/constants";
import type { DirectionId, FrameTime } from "@/types";
import { framesToSeconds, secondsToFrames } from "@/utils/calculations";

// ============================================================
// タイムライン座標系（縦軸＝時間、上=100s、下=0s）
// ============================================================

export const PIXELS_PER_SECOND = 16;
export const TIMELINE_HEIGHT = GAME_DURATION_SECONDS * PIXELS_PER_SECOND; // 1600px
export const TIMELINE_PADDING = 12; // 上下のパディング

export const DIRECTION_LABEL_WIDTH = 56;
export const TIME_AXIS_WIDTH = 28;
export const LANE_WIDTH = 240;
export const LANE_SPACING = 4;
export const MARKER_CENTER_RATIO = 1 / 3;
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

/** 方面ID固定色 */
const DIRECTION_ID_COLORS: Record<DirectionId, string> = {
  0: "var(--color-dir-0)",
  1: "var(--color-dir-1)",
  2: "var(--color-dir-2)",
};

/** 方面IDから色を取得 */
export function getDirectionColor(id: DirectionId): string {
  return DIRECTION_ID_COLORS[id];
}
