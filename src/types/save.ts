import type { ScenarioData } from './scenario';

/** 保存ファイル形式 */
export interface SaveData {
  readonly version: number;
  readonly createdAt: string;
  readonly scenario: ScenarioData;
}
