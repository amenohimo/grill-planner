/** ブキマスター */
export interface WeaponMaster {
  readonly id: number;
  readonly label: string;
  readonly rowId: string;
}

/** スペシャルマスター */
export interface SpecialMaster {
  readonly id: number;
  readonly label: string;
  readonly rowId: string;
}

/** キケン度設定（CoopLevelsConfig.json の1エントリ） */
export interface HazardConfigEntry {
  readonly Difficulty: number;
  readonly EventDozer: {
    readonly DozerIncrSecond: number;
    readonly DozerSpeedCoef: number;
  };
  readonly WaveChangeNum: number;
}

/** キケン度設定データ（JSON全体） */
export type HazardConfigData = readonly HazardConfigEntry[];
