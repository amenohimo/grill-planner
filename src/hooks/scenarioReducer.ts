import type {
  ScenarioData,
  DefeatPoint,
  DirectionSetting,
  DirectionName,
  TargetMode,
  DisplayMode,
  FrameTime,
  HazardConfigData,
} from '@/types';
import {
  DEFAULT_HAZARD_LEVEL,
  DEFAULT_DISPLAY_MODE,
} from '@/constants';
import { getHazardConfig, generateDefaultDirections } from '@/utils/calculations';

// ============================================================
// アクション定義（05_ARCHITECTURE §3.2）
// ============================================================

export type ScenarioAction =
  // キケン度
  | { type: 'SET_HAZARD_LEVEL'; payload: number }

  // 方面
  | { type: 'SET_DIRECTIONS'; payload: readonly DirectionSetting[] }
  | { type: 'UPDATE_DIRECTION_NAME'; payload: { index: number; name: DirectionName } }

  // 撃破点
  | { type: 'ADD_DEFEAT'; payload: DefeatPoint }
  | { type: 'MOVE_DEFEAT'; payload: { id: string; frameTime: FrameTime } }
  | { type: 'REMOVE_DEFEAT'; payload: string }
  | { type: 'REMOVE_DEFEATS'; payload: readonly string[] }

  // メモ
  | { type: 'SET_SCENARIO_CODE'; payload: string }
  | { type: 'SET_WEAPON'; payload: { index: number; rowId: string } }
  | { type: 'SET_SPECIAL'; payload: { index: number; rowId: string } }
  | { type: 'SET_TARGET_MODE'; payload: TargetMode }
  | { type: 'SET_TARGET_ORDER'; payload: readonly string[] }
  | { type: 'SET_SNATCHERS'; payload: string }

  // UI
  | { type: 'SET_DISPLAY_MODE'; payload: DisplayMode }
  | { type: 'SET_DIRECTION_PRESET'; payload: { index: 0 | 1 | 2; name: string } }

  // 全体
  | { type: 'LOAD_SCENARIO'; payload: ScenarioData }
  | { type: 'RESET_SCENARIO' };

// ============================================================
// 初期シナリオ生成
// ============================================================

export function createInitialScenario(hazardConfigData?: HazardConfigData): ScenarioData {
  let directions: readonly DirectionSetting[] = [];
  if (hazardConfigData) {
    const config = getHazardConfig(DEFAULT_HAZARD_LEVEL, hazardConfigData);
    directions = generateDefaultDirections(config.directionInterval);
  }

  return {
    hazardLevel: DEFAULT_HAZARD_LEVEL,
    directions,
    defeats: [],
    memo: {
      scenarioCode: '',
      weapons: [],
      specials: [],
      targetOrder: { mode: 'weapon', order: [] },
      snatchers: '',
    },
    displayMode: DEFAULT_DISPLAY_MODE,
    directionPresets: ['左', '正面', '右'],
  };
}

// ============================================================
// Reducer（05_ARCHITECTURE §3.3）
// ============================================================

export function scenarioReducer(
  state: ScenarioData,
  action: ScenarioAction,
): ScenarioData {
  switch (action.type) {
    case 'SET_HAZARD_LEVEL':
      return { ...state, hazardLevel: action.payload };

    case 'SET_DIRECTIONS':
      return { ...state, directions: action.payload };

    case 'UPDATE_DIRECTION_NAME':
      return {
        ...state,
        directions: state.directions.map((d, i) =>
          i === action.payload.index
            ? { ...d, direction: action.payload.name }
            : d,
        ),
      };

    case 'ADD_DEFEAT':
      return { ...state, defeats: [...state.defeats, action.payload] };

    case 'MOVE_DEFEAT':
      return {
        ...state,
        defeats: state.defeats.map((d) =>
          d.id === action.payload.id
            ? { ...d, frameTime: action.payload.frameTime }
            : d,
        ),
      };

    case 'REMOVE_DEFEAT':
      return {
        ...state,
        defeats: state.defeats.filter((d) => d.id !== action.payload),
      };

    case 'REMOVE_DEFEATS':
      return {
        ...state,
        defeats: state.defeats.filter((d) => !action.payload.includes(d.id)),
      };

    case 'SET_SCENARIO_CODE':
      return { ...state, memo: { ...state.memo, scenarioCode: action.payload } };

    case 'SET_WEAPON': {
      const weapons = [...state.memo.weapons];
      weapons[action.payload.index] = action.payload.rowId;
      return { ...state, memo: { ...state.memo, weapons } };
    }

    case 'SET_SPECIAL': {
      const specials = [...state.memo.specials];
      specials[action.payload.index] = action.payload.rowId;
      return { ...state, memo: { ...state.memo, specials } };
    }

    case 'SET_TARGET_MODE':
      return {
        ...state,
        memo: {
          ...state.memo,
          targetOrder: { ...state.memo.targetOrder, mode: action.payload },
        },
      };

    case 'SET_TARGET_ORDER':
      return {
        ...state,
        memo: {
          ...state.memo,
          targetOrder: { ...state.memo.targetOrder, order: action.payload },
        },
      };

    case 'SET_SNATCHERS':
      return { ...state, memo: { ...state.memo, snatchers: action.payload } };

    case 'SET_DISPLAY_MODE':
      return { ...state, displayMode: action.payload };

    case 'SET_DIRECTION_PRESET': {
      const presets = [...state.directionPresets] as [string, string, string];
      presets[action.payload.index] = action.payload.name;
      return { ...state, directionPresets: presets };
    }

    case 'LOAD_SCENARIO':
      return {
        ...action.payload,
        directionPresets: action.payload.directionPresets ?? ['左', '正面', '右'],
      };

    case 'RESET_SCENARIO':
      return createInitialScenario();

    default:
      return state;
  }
}
