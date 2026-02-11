# 05 アーキテクチャ設計

本書はプロジェクト最重要の設計文書である。データモデル、状態管理、コアアルゴリズム、コンポーネント階層、ディレクトリ構造を定義する。

---

## 1. 型定義

### 1.1 基本型

```typescript
// types/base.ts

/** フレーム単位の時間（整数）。60fps基準。 */
export type FrameTime = number;

/** 秒単位の時間（小数）。UI表示用。 */
export type SecondTime = number;

/** グリル枠の識別子 */
export type GrillSlot = 'A' | 'B';

/** 方面名。ユーザー入力による任意文字列。 */
export type DirectionName = string;

/** ターゲットモード */
export type TargetMode = 'weapon' | 'player';

/** 表示モード */
export type DisplayMode = 'icon' | 'text' | 'both';
```

### 1.2 ゲームオブジェクト型

```typescript
// types/game.ts

import type { FrameTime, GrillSlot, DirectionName } from './base';

/** 撃破点 — ユーザーが配置する */
export interface DefeatPoint {
  readonly id: string;           // UUID
  readonly slot: GrillSlot;
  readonly frameTime: FrameTime;
}

/** 湧き点 — 計算結果として生成される */
export interface SpawnPoint {
  readonly id: string;           // 自動湧き: 'auto-a' | 'auto-b', 撃破由来: 撃破点のID
  readonly slot: GrillSlot;
  readonly frameTime: FrameTime;
  readonly direction: DirectionName;
  readonly isAuto: boolean;
  readonly defeatId?: string;    // 撃破由来の場合、対応する撃破点のID
}

/** 方面設定 — 1つの方面切替区間 */
export interface DirectionSetting {
  readonly frameTime: FrameTime; // この時刻から有効
  readonly direction: DirectionName;
}
```

### 1.3 マスターデータ型

```typescript
// types/master.ts

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
```

### 1.4 計算結果型

```typescript
// types/computed.ts

import type { FrameTime } from './base';

/** 補間後のキケン度設定 */
export interface InterpolatedHazardConfig {
  readonly dozerIncrSecond: number;
  readonly waveChangeNum: number;
  readonly directionInterval: number;    // 72 / waveChangeNum
  readonly bSlotSpawnerDecisionFrame: FrameTime;
  readonly bSlotOpenFrame: FrameTime;    // B枠の実体出現フレーム
}

/** 方面別統計 */
export interface DirectionStats {
  readonly directionIndex: number;       // 何番目の区間か（0始まり）
  readonly direction: string;
  readonly count: number;
}
```

### 1.5 シナリオデータ型

```typescript
// types/scenario.ts

import type { GrillSlot, FrameTime, DirectionName, TargetMode, DisplayMode } from './base';
import type { DefeatPoint, DirectionSetting } from './game';

/** メモ情報（計算には無関係） */
export interface ScenarioMemo {
  readonly scenarioCode: string;
  readonly weapons: readonly number[];     // WeaponMaster.id の配列（4要素）
  readonly specials: readonly number[];    // SpecialMaster.id の配列（4要素）
  readonly targetOrder: {
    readonly mode: TargetMode;
    readonly order: readonly string[];
  };
  readonly snatchers: string;
}

/** シナリオデータ（状態管理の中心） */
export interface ScenarioData {
  readonly hazardLevel: number;            // 20〜333
  readonly directions: readonly DirectionSetting[];
  readonly defeats: readonly DefeatPoint[];
  readonly memo: ScenarioMemo;
  readonly displayMode: DisplayMode;
}
```

### 1.6 保存データ型

```typescript
// types/save.ts

import type { ScenarioData } from './scenario';

/** 保存ファイル形式 */
export interface SaveData {
  readonly version: number;               // 形式バージョン（初期値: 1）
  readonly createdAt: string;             // ISO 8601
  readonly scenario: ScenarioData;
}
```

### 1.7 型エクスポート

```typescript
// types/index.ts
export type * from './base';
export type * from './game';
export type * from './master';
export type * from './computed';
export type * from './scenario';
export type * from './save';
```

---

## 2. 定数定義

```typescript
// constants/index.ts

export const SPAWNER_DECISION_FRAMES = 184 as const;
export const SPAWN_WAIT_FRAMES = 30 as const;
export const RESPAWN_FRAMES = (SPAWNER_DECISION_FRAMES + SPAWN_WAIT_FRAMES) as const; // 214
export const FPS = 60 as const;
export const GAME_DURATION_SECONDS = 100 as const;
export const GAME_DURATION_FRAMES = (GAME_DURATION_SECONDS * FPS) as const; // 6000
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
```

---

## 3. 状態管理

### 3.1 設計方針

旧プロジェクトの教訓（useScenarioState に16個の更新関数集中）を踏まえ、`useReducer` ベースのアクション駆動型設計を採用する。

外部ライブラリ（Zustand, Jotai 等）は導入せず、React 組み込みの `useReducer` + Context で構成する。プロジェクト規模に対して外部依存は過剰であり、計算ロジックが純粋関数で完結するため。

### 3.2 アクション定義

```typescript
// hooks/scenarioReducer.ts

import type { ScenarioData, DefeatPoint, DirectionSetting, DirectionName,
              TargetMode, DisplayMode, FrameTime } from '@/types';

export type ScenarioAction =
  // キケン度
  | { type: 'SET_HAZARD_LEVEL'; payload: number }

  // 方面
  | { type: 'SET_DIRECTIONS'; payload: readonly DirectionSetting[] }
  | { type: 'UPDATE_DIRECTION_NAME'; payload: { index: number; name: DirectionName } }

  // 撃破点
  | { type: 'ADD_DEFEAT'; payload: DefeatPoint }
  | { type: 'MOVE_DEFEAT'; payload: { id: string; frameTime: FrameTime } }
  | { type: 'REMOVE_DEFEAT'; payload: string }              // id
  | { type: 'REMOVE_DEFEATS'; payload: readonly string[] }  // ids

  // メモ
  | { type: 'SET_SCENARIO_CODE'; payload: string }
  | { type: 'SET_WEAPON'; payload: { index: number; weaponId: number } }
  | { type: 'SET_SPECIAL'; payload: { index: number; specialId: number } }
  | { type: 'SET_TARGET_MODE'; payload: TargetMode }
  | { type: 'SET_TARGET_ORDER'; payload: readonly string[] }
  | { type: 'SET_SNATCHERS'; payload: string }

  // UI
  | { type: 'SET_DISPLAY_MODE'; payload: DisplayMode }

  // 全体
  | { type: 'LOAD_SCENARIO'; payload: ScenarioData }
  | { type: 'RESET_SCENARIO' };
```

### 3.3 Reducer

```typescript
export function scenarioReducer(
  state: ScenarioData,
  action: ScenarioAction
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
            : d
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
            : d
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
      weapons[action.payload.index] = action.payload.weaponId;
      return { ...state, memo: { ...state.memo, weapons } };
    }

    case 'SET_SPECIAL': {
      const specials = [...state.memo.specials];
      specials[action.payload.index] = action.payload.specialId;
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

    case 'LOAD_SCENARIO':
      return action.payload;

    case 'RESET_SCENARIO':
      return createInitialScenario();

    default:
      return state;
  }
}
```

### 3.4 Context 構成

```typescript
// hooks/ScenarioContext.tsx

import { createContext, useContext, useReducer, type Dispatch } from 'react';
import type { ScenarioData } from '@/types';
import { scenarioReducer, type ScenarioAction } from './scenarioReducer';

interface ScenarioContextValue {
  state: ScenarioData;
  dispatch: Dispatch<ScenarioAction>;
}

const ScenarioContext = createContext<ScenarioContextValue | null>(null);

export function ScenarioProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(scenarioReducer, createInitialScenario());
  return (
    <ScenarioContext.Provider value={{ state, dispatch }}>
      {children}
    </ScenarioContext.Provider>
  );
}

export function useScenario(): ScenarioContextValue {
  const ctx = useContext(ScenarioContext);
  if (!ctx) throw new Error('useScenario must be used within ScenarioProvider');
  return ctx;
}
```

### 3.5 計算結果フック

計算結果は状態として保持せず、シナリオデータから `useMemo` で導出する。

```typescript
// hooks/useGrillCalculation.ts

import { useMemo } from 'react';
import type { ScenarioData, InterpolatedHazardConfig, SpawnPoint, DirectionStats } from '@/types';
import { getHazardConfig, calculateSpawns } from '@/utils/calculations';
import { calculateDirectionStats } from '@/utils/statistics';

interface GrillCalculationResult {
  hazardConfig: InterpolatedHazardConfig;
  spawns: readonly SpawnPoint[];
  directionStats: readonly DirectionStats[];
  totalGrillCount: number;
}

export function useGrillCalculation(
  scenario: ScenarioData,
  hazardConfigData: HazardConfigData
): GrillCalculationResult {
  return useMemo(() => {
    const hazardConfig = getHazardConfig(scenario.hazardLevel, hazardConfigData);
    const spawns = calculateSpawns(hazardConfig, scenario.directions, scenario.defeats);
    const stats = calculateDirectionStats(spawns, scenario.defeats, scenario.directions);
    const totalGrillCount = stats.reduce((sum, s) => sum + s.count, 0);

    return { hazardConfig, spawns, directionStats: stats, totalGrillCount };
  }, [scenario.hazardLevel, scenario.directions, scenario.defeats, hazardConfigData]);
}
```

### 3.6 マスターデータフック

静的データの読み込みは専用フックで管理する。

```typescript
// hooks/useDataLoader.ts

import { useState, useEffect } from 'react';
import type { WeaponMaster, SpecialMaster, HazardConfigData } from '@/types';
import { DATA_PATHS } from '@/constants';

interface MasterData {
  weapons: readonly WeaponMaster[];
  specials: readonly SpecialMaster[];
  hazardConfigData: HazardConfigData;
  isLoading: boolean;
  error: string | null;
}

export function useDataLoader(): MasterData {
  // fetch → state の標準パターンで実装
  // BASE_URL を付与してフェッチ
}
```

---

## 4. コアアルゴリズム

### 4.1 モジュール構成

```
utils/
├── calculations.ts   # 時間変換、リスポーン計算、キケン度補間、方面判定、spawns計算
├── validation.ts     # 撃破可能性チェック（シミュレーション方式）
├── statistics.ts     # 方面別統計集計
└── fileIO.ts         # JSON保存・読込・バリデーション
```

すべて純粋関数として実装し、React に依存しない。

### 4.2 calculations.ts

02_GAME_MECHANICS.md の仕様をそのまま実装する。主要関数:

```typescript
export function framesToSeconds(frames: FrameTime): SecondTime;
export function secondsToFrames(seconds: SecondTime): FrameTime;
export function calculateSpawnerDecisionTime(defeatFrame: FrameTime): FrameTime;
export function calculateSpawnTime(defeatFrame: FrameTime): FrameTime;
export function getHazardConfig(hazardLevel: number, data: HazardConfigData): InterpolatedHazardConfig;
export function getDirectionSwitchTimes(directionInterval: number): FrameTime[];
export function getDirectionAtTime(spawnerDecisionFrame: FrameTime, sortedDirections: readonly DirectionSetting[]): DirectionName;
export function sortDirectionSettings(directions: readonly DirectionSetting[]): DirectionSetting[];
export function calculateSpawns(config: InterpolatedHazardConfig, directions: readonly DirectionSetting[], defeats: readonly DefeatPoint[]): SpawnPoint[];
```

### 4.3 validation.ts — シミュレーション方式

旧実装の P0 バグを解決する核心部分。

```typescript
/**
 * 撃破の追加・移動が妥当かを検証する。
 *
 * 手順:
 * 1. 仮の撃破リストを構築（追加 or 移動を反映）
 * 2. 仮リストで calculateSpawns を再計算
 * 3. 再計算後の spawns で全撃破点の整合性をチェック
 */
export function validateDefeatChange(
  change: { type: 'add'; defeat: DefeatPoint } | { type: 'move'; id: string; newFrameTime: FrameTime },
  currentDefeats: readonly DefeatPoint[],
  hazardConfig: InterpolatedHazardConfig,
  directions: readonly DirectionSetting[]
): ValidationResult {
  // 1. 仮の撃破リストを構築
  let testDefeats: DefeatPoint[];
  if (change.type === 'add') {
    testDefeats = [...currentDefeats, change.defeat];
  } else {
    testDefeats = currentDefeats.map((d) =>
      d.id === change.id ? { ...d, frameTime: change.newFrameTime } : d
    );
  }

  // 2. 仮リストで spawns を再計算
  const testSpawns = calculateSpawns(hazardConfig, directions, testDefeats);

  // 3. 全撃破点の整合性チェック
  for (const defeat of testDefeats) {
    if (!isConsistentDefeat(defeat, testSpawns)) {
      return { valid: false, reason: `撃破 ${defeat.id} が湧き点と不整合` };
    }
  }

  return { valid: true };
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly reason?: string;
}

/**
 * 1つの撃破点が spawns と整合しているか検証する。
 *
 * 条件: lastSpawn.frameTime >= defeat.frameTime > nextSpawn.frameTime
 */
function isConsistentDefeat(
  defeat: DefeatPoint,
  spawns: readonly SpawnPoint[]
): boolean {
  const slotSpawns = spawns
    .filter((s) => s.slot === defeat.slot)
    .sort((a, b) => b.frameTime - a.frameTime); // 降順

  // 撃破時刻以上の湧き（過去側）
  const pastSpawns = slotSpawns.filter((s) => s.frameTime >= defeat.frameTime);
  if (pastSpawns.length === 0) return false;

  // 撃破時刻未満の湧き（未来側）
  const futureSpawns = slotSpawns.filter((s) => s.frameTime < defeat.frameTime);
  if (futureSpawns.length === 0) return true;

  // 最も近い未来の湧き（降順なので先頭が最大＝最も近い）
  const nextSpawn = futureSpawns[0]!;

  return defeat.frameTime > nextSpawn.frameTime;
}
```

**重要**: `canDefeatAt` のような「現在の spawns で判定」する関数は作らない。バリデーションは常にシミュレーション方式で行う。

### 4.4 statistics.ts

```typescript
/**
 * 方面別統計を集計する。
 * スポナー決定時刻を基準に、各湧き点がどの方面区間に属するかを判定する。
 */
export function calculateDirectionStats(
  spawns: readonly SpawnPoint[],
  defeats: readonly DefeatPoint[],
  directions: readonly DirectionSetting[]
): DirectionStats[];

/**
 * スポナー決定時刻がどの方面区間に属するかを返す（インデックス）。
 *
 * directions は降順ソート済み。区間 i は
 *   directions[i].frameTime >= T > directions[i+1].frameTime
 * 最後の区間は 0F まで。
 *
 * 特殊: T > directions[0].frameTime（ゲーム開始前）の場合は 0 を返す。
 */
export function findDirectionIndex(
  spawnerDecisionFrame: FrameTime,
  sortedDirections: readonly DirectionSetting[]
): number;
```

### 4.5 fileIO.ts

```typescript
/** シナリオをJSONファイルとしてダウンロード */
export function exportScenario(scenario: ScenarioData): void;

/** JSONファイルを読み込んでシナリオデータに変換 */
export function importScenario(file: File): Promise<ImportResult>;

export type ImportResult =
  | { success: true; data: ScenarioData }
  | { success: false; error: string };
```

---

## 5. コンポーネント階層

### 5.1 ツリー図

```
App
├── ScenarioProvider              // Context提供
│   ├── Header                    // タイトル、保存/読込ボタン
│   ├── SettingsPanel             // 折りたたみ可能な設定パネル
│   │   ├── HazardLevelInput      // キケン度スライダー + 数値入力
│   │   ├── MemoSection           // メモ情報（折りたたみ可能）
│   │   │   ├── ScenarioCodeInput
│   │   │   ├── WeaponSelector    // ×4
│   │   │   ├── SpecialSelector   // ×4
│   │   │   ├── TargetOrderEditor
│   │   │   └── SnatchersInput
│   │   └── DisplayModeToggle
│   ├── MainArea                  // タイムライン + 統計の横並び
│   │   ├── Timeline              // メインのタイムライン表示
│   │   │   ├── TimeAxis          // 時間軸の目盛り
│   │   │   ├── DirectionLabels   // 方面区間ラベル（編集可能）
│   │   │   ├── DirectionBands    // 方面区間の背景帯
│   │   │   ├── GrillSlotLane     // A枠 or B枠のレーン（×2）
│   │   │   │   ├── SpawnMarker   // 湧き点マーカー
│   │   │   │   ├── DefeatMarker  // 撃破点マーカー（ドラッグ可能）
│   │   │   │   └── ActivePeriod  // グリル活動期間バー
│   │   │   └── RespawnConnector  // 撃破→湧きの接続線
│   │   └── StatisticsPanel       // 方面別統計
│   │       └── DirectionStatsTable
│   └── FileIOControls            // 保存/読込（Headerに統合も可）
```

### 5.2 コンポーネント責務

| コンポーネント | 責務 | props の主要データ |
|--------------|------|------------------|
| `App` | データローダー起動、Provider 設置、レイアウト最上位 | — |
| `ScenarioProvider` | `useReducer` + Context の提供 | children |
| `Header` | タイトル、ファイル操作ボタン | — |
| `SettingsPanel` | 設定UI群のコンテナ、折りたたみ | — |
| `HazardLevelInput` | キケン度の入力（スライダー + テキスト） | — (Context経由) |
| `Timeline` | タイムラインのコンテナ、クリックイベント処理 | spawns, hazardConfig |
| `GrillSlotLane` | 1つの枠のレーン描画 | slot, spawns, defeats |
| `SpawnMarker` | 湧き点の視覚表示 | spawn |
| `DefeatMarker` | 撃破点の表示 + ドラッグ操作 | defeat, onMove, onRemove |
| `ActivePeriod` | 湧き→撃破の期間バー | spawnFrame, defeatFrame |
| `DirectionLabels` | 方面名のインライン編集UI | directions |
| `DirectionBands` | 方面区間の背景色帯 | directions |
| `TimeAxis` | 秒目盛りの描画 | — |
| `RespawnConnector` | 撃破→スポナー決定→湧きの接続線 | defeatFrame, spawnFrame |
| `StatisticsPanel` | 統計テーブルのコンテナ | stats |
| `DirectionStatsTable` | 方面別の行表示 | stats |

### 5.3 データフロー

```
                    ┌─────────────────────────┐
                    │     ScenarioProvider     │
                    │  state + dispatch        │
                    └───────────┬──────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                   │
     SettingsPanel          MainArea             Header
              │                 │                   │
         dispatch          reads state          fileIO
              │                 │
              │     ┌───────────┴────────────┐
              │     │                        │
              │  Timeline              StatisticsPanel
              │     │                        │
              │  reads spawns +          reads stats
              │  dispatches defeats     (useMemo derived)
              │     │
              │  ┌──┴──────────┐
              │  │             │
              │  GrillSlotLane GrillSlotLane
              │  (A枠)         (B枠)
              │
              └── dispatches SET_HAZARD_LEVEL,
                  UPDATE_DIRECTION_NAME, etc.
```

計算結果（spawns, stats）は `useGrillCalculation` フック内の `useMemo` で導出される。状態変更 → 再計算 → 再描画 の単方向フロー。

---

## 6. ディレクトリ構造

```
src/
├── components/
│   ├── Header/
│   │   └── index.tsx
│   ├── Settings/
│   │   ├── index.tsx              // SettingsPanel
│   │   ├── HazardLevelInput.tsx
│   │   ├── MemoSection.tsx
│   │   ├── WeaponSelector.tsx
│   │   ├── SpecialSelector.tsx
│   │   ├── TargetOrderEditor.tsx
│   │   ├── SnatchersInput.tsx
│   │   ├── ScenarioCodeInput.tsx
│   │   └── DisplayModeToggle.tsx
│   ├── Timeline/
│   │   ├── index.tsx              // Timeline
│   │   ├── TimeAxis.tsx
│   │   ├── DirectionLabels.tsx
│   │   ├── DirectionBands.tsx
│   │   ├── GrillSlotLane.tsx
│   │   ├── SpawnMarker.tsx
│   │   ├── DefeatMarker.tsx
│   │   ├── ActivePeriod.tsx
│   │   └── RespawnConnector.tsx
│   ├── Statistics/
│   │   ├── index.tsx              // StatisticsPanel
│   │   └── DirectionStatsTable.tsx
│   └── shared/
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Select.tsx
├── constants/
│   └── index.ts
├── hooks/
│   ├── scenarioReducer.ts
│   ├── ScenarioContext.tsx
│   ├── useGrillCalculation.ts
│   ├── useDataLoader.ts
│   ├── useTimelineDrag.ts        // ドラッグ操作の状態管理
│   └── useValidation.ts          // バリデーション呼び出しフック
├── types/
│   ├── base.ts
│   ├── game.ts
│   ├── master.ts
│   ├── computed.ts
│   ├── scenario.ts
│   ├── save.ts
│   └── index.ts
├── utils/
│   ├── calculations.ts
│   ├── validation.ts
│   ├── statistics.ts
│   └── fileIO.ts
├── App.tsx
├── main.tsx
└── index.css
```

---

## 7. ドラッグ操作の設計

### 7.1 useTimelineDrag フック

撃破点のドラッグ移動は専用フックで管理する。App.tsx にロジックを直接書かない。

```typescript
// hooks/useTimelineDrag.ts

interface DragState {
  isDragging: boolean;
  dragDefeatId: string | null;
  dragFrameTime: FrameTime | null;  // ドラッグ中の仮時刻
  isValidPosition: boolean;          // ドラッグ中の位置が妥当か
}

interface UseTimelineDragReturn {
  dragState: DragState;
  startDrag: (defeatId: string) => void;
  updateDrag: (frameTime: FrameTime) => void;  // マウス移動ごと
  endDrag: () => void;                          // 確定 or キャンセル
  cancelDrag: () => void;
}
```

### 7.2 ドラッグ中のバリデーション

`updateDrag` の都度 `validateDefeatChange` を呼び出してリアルタイムで妥当性を判定する。不正位置の場合は視覚フィードバック（マーカー色変化等）で示す。

パフォーマンス考慮: `calculateSpawns` は撃破点数 N に対して O(N) であり、通常の使用範囲（N < 30）では 16ms 以内に完了する。`requestAnimationFrame` によるスロットリングは不要と想定するが、必要に応じて導入する。

### 7.3 クリックとドラッグの区別

マウスダウンからの移動距離が閾値（5px）未満の場合はクリック（削除操作）、以上の場合はドラッグ（移動操作）として扱う。

---

## 8. タイムライン座標系

### 8.1 フレーム ↔ ピクセル変換

タイムラインの垂直方向（縦軸＝時間、上=100s、下=0s）でフレームをピクセルに変換する。

```typescript
const PIXELS_PER_SECOND = 16; // 旧実装(8)の2倍。操作性改善のため

function frameToPixelY(frameTime: FrameTime, pixelsPerSecond: number): number {
  const seconds = GAME_DURATION_SECONDS - framesToSeconds(frameTime);
  return seconds * pixelsPerSecond;
}

function pixelYToFrame(pixelY: number, pixelsPerSecond: number): FrameTime {
  const seconds = GAME_DURATION_SECONDS - (pixelY / pixelsPerSecond);
  return secondsToFrames(seconds);
}
```

100秒 × 16px/秒 = 1600px のタイムライン高さ。縦スクロール可能なコンテナ内に配置する。

注: `PIXELS_PER_SECOND` の最終値は 06_UI_DESIGN.md で確定する。ここでは方針のみ定義。

### 8.2 レーン配置

水平方向のレーン配置（各列が縦に1600pxの高さを持つ）:

```
┌──────┬──────┬──────┬──────┐
│方面  │時間軸│A枠   │B枠   │
│ラベル│目盛り│レーン │レーン │
│（列）│（列）│（列）│（列）│
│      │      │      │      │
│ 上   │ 100s │      │      │
│  ↓   │  ↓   │  ↓   │  ↓   │
│ 下   │  0s  │      │      │
└──────┴──────┴──────┴──────┘
```

背景に方面区間の色帯（DirectionBands）を全レーンにまたがる横帯として描画する。
