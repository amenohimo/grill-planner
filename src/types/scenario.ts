import type { TargetMode, DisplayMode } from './base';
import type { DefeatPoint, DirectionSetting } from './game';

/** メモ情報（計算には無関係） */
export interface ScenarioMemo {
  readonly scenarioCode: string;
  readonly weapons: readonly string[];
  readonly specials: readonly string[];
  readonly targetOrder: {
    readonly mode: TargetMode;
    readonly order: readonly string[];
  };
  readonly snatchers: string;
}

/** シナリオデータ（状態管理の中心） */
export interface ScenarioData {
  readonly hazardLevel: number;
  readonly directions: readonly DirectionSetting[];
  readonly defeats: readonly DefeatPoint[];
  readonly memo: ScenarioMemo;
  readonly displayMode: DisplayMode;
}
