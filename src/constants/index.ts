export const SPAWNER_DECISION_FRAMES = 184 as const;
export const SPAWN_WAIT_FRAMES = 30 as const;
export const RESPAWN_FRAMES = 214; // SPAWNER_DECISION_FRAMES + SPAWN_WAIT_FRAMES
export const FPS = 60 as const;
export const GAME_DURATION_SECONDS = 100 as const;
export const GAME_DURATION_FRAMES = 6000; // GAME_DURATION_SECONDS * FPS
export const DIRECTION_SWITCH_BASE = 72 as const;

export const GRILL_SLOTS = ['A', 'B'] as const;
export const PLAYER_IDS = ['1P', '2P', '3P', '4P'] as const;

export const MIN_HAZARD_LEVEL = 20 as const;
export const MAX_HAZARD_LEVEL = 333 as const;
export const DEFAULT_HAZARD_LEVEL = 100 as const;
export const DEFAULT_DISPLAY_MODE = 'both' as const;

/** アイコンパス生成 */
export const getWeaponIconPath = (id: number): string =>
  `${import.meta.env.BASE_URL}img/weapon/${id}.png`;

export const getSpecialIconPath = (id: number): string =>
  `${import.meta.env.BASE_URL}img/special/${id}.png`;

/** データファイルパス */
export const DATA_PATHS = {
  weapon: 'data/weapon.json',
  special: 'data/special.json',
  hazardConfig: 'data/CoopLevelsConfig.json',
} as const;
