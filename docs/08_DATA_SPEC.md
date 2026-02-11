# 08 データ仕様

静的データの形式、アイコン資産の仕様、シナリオ保存フォーマットを定義する。

---

## 1. 静的データファイル

### 1.1 配置場所

```
public/data/
├── weapon.json
├── special.json
└── CoopLevelsConfig.json
```

ビルド時に `dist/data/` へそのままコピーされる。ランタイムで `fetch` して読み込む。

### 1.2 weapon.json

ブキマスターデータ。全70+ブキを格納。

```typescript
// スキーマ
type WeaponJson = Array<{
  Id: number;       // ブキ固有ID（0, 10, 20, ...）
  Label: string;    // 日本語名（例: "ボールドマーカー"）
  RowId: string;    // 内部識別子（例: "Shooter_Short"）
}>;
```

サンプル:

```json
[
  { "Id": 0,    "Label": "ボールドマーカー",     "RowId": "Shooter_Short" },
  { "Id": 10,   "Label": "わかばシューター",     "RowId": "Shooter_First" },
  { "Id": 40,   "Label": "スプラシューター",     "RowId": "Shooter_Normal" },
  { "Id": 900,  "Label": "クマサン印のブラスター", "RowId": "Blaster_Bear" },
  { "Id": 1010, "Label": "スプラローラー",       "RowId": "Roller_Normal" }
]
```

### 1.3 special.json

スペシャルマスターデータ。全9スペシャルを格納。

```typescript
// スキーマ
type SpecialJson = Array<{
  Id: number;       // スペシャル固有ID（20006, 20007, ...）
  Label: string;    // 日本語名（例: "ナイスダマ"）
  RowId: string;    // 内部識別子（例: "Sp_NiceBall"）
}>;
```

全データ:

```json
[
  { "Id": 20006, "Label": "ナイスダマ",           "RowId": "Sp_NiceBall" },
  { "Id": 20007, "Label": "ホップソナー",         "RowId": "Sp_ShockSonar" },
  { "Id": 20009, "Label": "メガホンレーザー5.1ch", "RowId": "Sp_MicroLaser" },
  { "Id": 20010, "Label": "ジェットパック",       "RowId": "Sp_Jetpack" },
  { "Id": 20012, "Label": "カニタンク",           "RowId": "Sp_Chariot" },
  { "Id": 20013, "Label": "サメライド",           "RowId": "Sp_Skewer" },
  { "Id": 20014, "Label": "トリプルトルネード",   "RowId": "Sp_TripleTornado" },
  { "Id": 20017, "Label": "テイオウイカ",         "RowId": "Sp_Castle" },
  { "Id": 20018, "Label": "ウルトラチャクチ",     "RowId": "Sp_Pogo" }
]
```

### 1.4 CoopLevelsConfig.json

キケン度依存パラメータ。7段階のキケン度に対する設定値を格納。

```typescript
// スキーマ
type CoopLevelsConfigJson = Array<{
  Difficulty: number;            // キケン度（%）: 20, 40, 60, 80, 100, 200, 333
  EventDozer: {
    DozerIncrSecond: number;     // B枠開放までの経過秒数
    DozerSpeedCoef: number;      // 速度係数（本ツールでは未使用）
  };
  WaveChangeNum: number;         // 方面切替回数
}>;
```

全データ:

```json
[
  { "Difficulty": 20,  "EventDozer": { "DozerIncrSecond": 80, "DozerSpeedCoef": 1.3 }, "WaveChangeNum": 3 },
  { "Difficulty": 40,  "EventDozer": { "DozerIncrSecond": 70, "DozerSpeedCoef": 1.5 }, "WaveChangeNum": 3 },
  { "Difficulty": 60,  "EventDozer": { "DozerIncrSecond": 60, "DozerSpeedCoef": 1.7 }, "WaveChangeNum": 4 },
  { "Difficulty": 80,  "EventDozer": { "DozerIncrSecond": 40, "DozerSpeedCoef": 1.9 }, "WaveChangeNum": 4 },
  { "Difficulty": 100, "EventDozer": { "DozerIncrSecond": 30, "DozerSpeedCoef": 2.1 }, "WaveChangeNum": 5 },
  { "Difficulty": 200, "EventDozer": { "DozerIncrSecond": 10, "DozerSpeedCoef": 2.3 }, "WaveChangeNum": 7 },
  { "Difficulty": 333, "EventDozer": { "DozerIncrSecond": 10, "DozerSpeedCoef": 2.6 }, "WaveChangeNum": 9 }
]
```

`Difficulty` は昇順にソート済み。線形補間の際に上下の設定を探索する（02_GAME_MECHANICS §6.2 参照）。

---

## 2. アイコン資産

### 2.1 配置場所

```
public/img/
├── weapon/
│   ├── 0.png
│   ├── 10.png
│   ├── 20.png
│   └── ... (全ブキ分)
└── special/
    ├── 20006.png
    ├── 20007.png
    └── ... (全9SP分)
```

### 2.2 命名規則

- ファイル名: `{Id}.png`
- `Id` はそれぞれ `weapon.json` / `special.json` の `Id` フィールドに対応
- 拡張子は `.png` 固定

### 2.3 画像仕様

| 項目 | 値 |
|------|-----|
| 形式 | PNG（透過あり） |
| サイズ | 64×64px（推奨。表示時に CSS でリサイズ） |
| 背景 | 透過 |

### 2.4 パス生成

```typescript
import { getWeaponIconPath, getSpecialIconPath } from '@/constants';

// getWeaponIconPath(40) → "/grill-planner/img/weapon/40.png"
// getSpecialIconPath(20006) → "/grill-planner/img/special/20006.png"
```

`import.meta.env.BASE_URL` を含むため、開発・本番で自動的にパスが切り替わる。

### 2.5 ファビコン

| 項目 | 値 |
|------|-----|
| ファイル | `public/favicon.png` |
| 形式 | PNG |
| サイズ | 192×192px |
| 用途 | ブラウザタブ、ブックマーク等のサイトアイコン |

`index.html` の `<head>` 内で以下のように参照する:

```html
<link rel="icon" type="image/png" href="/grill-planner/favicon.png" />
```

---

## 3. シナリオ保存フォーマット

### 3.1 ファイル形式

- 形式: JSON（UTF-8）
- 拡張子: `.json`
- ファイル名: `grill-planner-{YYYYMMDD-HHmmss}.json`（自動生成）

### 3.2 スキーマ（version: 1）

```typescript
interface SaveDataV1 {
  version: 1;
  createdAt: string;  // ISO 8601 (例: "2026-02-11T12:00:00.000Z")
  scenario: {
    hazardLevel: number;
    directions: Array<{
      frameTime: number;
      direction: string;
    }>;
    defeats: Array<{
      id: string;
      slot: 'A' | 'B';
      frameTime: number;
    }>;
    memo: {
      scenarioCode: string;
      weapons: number[];
      specials: number[];
      targetOrder: {
        mode: 'weapon' | 'player';
        order: string[];
      };
      snatchers: string;
    };
    displayMode: 'icon' | 'text' | 'both';
  };
}
```

### 3.3 サンプルデータ

```json
{
  "version": 1,
  "createdAt": "2026-02-11T12:00:00.000Z",
  "scenario": {
    "hazardLevel": 200,
    "directions": [
      { "frameTime": 6000, "direction": "右" },
      { "frameTime": 5383, "direction": "左" },
      { "frameTime": 4766, "direction": "中央" },
      { "frameTime": 4149, "direction": "右" },
      { "frameTime": 3531, "direction": "左" },
      { "frameTime": 2914, "direction": "中央" },
      { "frameTime": 2297, "direction": "右" }
    ],
    "defeats": [
      { "id": "d1", "slot": "A", "frameTime": 5820 },
      { "id": "d2", "slot": "A", "frameTime": 5400 },
      { "id": "d3", "slot": "B", "frameTime": 4980 }
    ],
    "memo": {
      "scenarioCode": "テスト01",
      "weapons": [40, 2010, 4010, 1010],
      "specials": [20006, 20012, 20014, 20018],
      "targetOrder": {
        "mode": "weapon",
        "order": ["40", "2010", "4010", "1010"]
      },
      "snatchers": "1体"
    },
    "displayMode": "both"
  }
}
```

### 3.4 バリデーションルール

インポート時に以下を検証する。いずれかが不正な場合はインポートを拒否し、エラーメッセージを返す。

| フィールド | 検証 |
|-----------|------|
| `version` | `=== 1`（将来のバージョンは非対応として拒否） |
| `createdAt` | 文字列。空でも許容（必須チェックのみ） |
| `hazardLevel` | 整数、20 以上 333 以下 |
| `directions` | 配列。各要素に `frameTime`(number) と `direction`(string) が存在 |
| `defeats` | 配列。各要素に `id`(string), `slot`('A'\|'B'), `frameTime`(number) が存在 |
| `defeats[].frameTime` | 0 以上 6000 以下 |
| `memo` | オブジェクト。省略された場合はデフォルト値で補完 |
| `memo.weapons` | 配列（空配列を許容） |
| `memo.specials` | 配列（空配列を許容） |
| `displayMode` | `'icon'` \| `'text'` \| `'both'` のいずれか。省略時は `'both'` |

バリデーション通過後、さらに `calculateSpawns` + 撃破点の整合性チェックを行い、不整合な撃破点があれば警告メッセージと共にそれらを除外してインポートする（全拒否ではなく部分インポート）。

### 3.5 バージョニング方針

- `version` フィールドで保存形式のバージョンを管理
- 初期リリースは `version: 1`
- フィールド追加: `version` を上げ、旧バージョンのマイグレーション関数を用意
- フィールド削除・型変更: `version` を上げ、非互換として旧バージョンは拒否または変換

```typescript
// 将来のマイグレーション例
function migrateV1toV2(v1: SaveDataV1): SaveDataV2 {
  return {
    ...v1,
    version: 2,
    scenario: {
      ...v1.scenario,
      newField: defaultValue,
    },
  };
}
```

---

## 4. データ読み込みフロー

```
App 起動
  │
  ├─ useDataLoader()
  │   ├─ fetch weapon.json    → WeaponMaster[]
  │   ├─ fetch special.json   → SpecialMaster[]
  │   └─ fetch CoopLevelsConfig.json → HazardConfigData
  │
  ├─ 読み込み中: ローディング表示
  ├─ 読み込み失敗: エラー表示（リトライボタン付き）
  └─ 読み込み完了: メインUI表示
        │
        └─ ScenarioProvider
            └─ 初期 scenario を生成
                ├─ hazardLevel: DEFAULT_HAZARD_LEVEL (100)
                ├─ directions: getDirectionSwitchTimes() で自動生成
                ├─ defeats: []
                └─ memo: デフォルト値
```

3つの JSON を `Promise.all` で並列フェッチし、すべて成功したらメインUIを描画する。
