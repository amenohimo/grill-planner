/** フレーム単位の時間（整数）。60fps基準。 */
export type FrameTime = number;

/** 秒単位の時間（小数）。UI表示用。 */
export type SecondTime = number;

/** グリル枠の識別子 */
export type GrillSlot = "A" | "B";

/** 方面名。ユーザー入力による任意文字列。 */
export type DirectionName = string;

/** 方面の内部ID（プリセット配列のインデックス） */
export type DirectionId = 0 | 1 | 2;

/** ターゲットモード */
export type TargetMode = "weapon" | "player";

/** 表示モード */
export type DisplayMode = "icon" | "text" | "both";
