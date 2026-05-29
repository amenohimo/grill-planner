# 02 ゲームメカニクス仕様

本書は「グリル発進」イベントにおけるグリルのリスポーンメカニクスを正確に記述する。
シミュレーションツールの計算ロジック実装の**唯一の根拠**となる文書である。

---

## 1. 時間の定義

### 1.1 フレームレートと単位

Splatoon 3 は 60fps で動作する。ゲーム内イベントはフレーム単位で管理される。

| 表現 | 型名 | 単位 | 用途 |
|------|------|------|------|
| フレームタイム | `FrameTime` | フレーム（整数） | 内部計算 |
| 秒タイム | `SecondTime` | 秒（小数） | UI表示 |

### 1.2 変換式

```
framesToSeconds(frames) = round(frames / 60, 1)   // 小数点1桁、四捨五入
secondsToFrames(seconds) = round(seconds × 60)     // 整数に四捨五入
```

変換例:

| フレーム | 秒 | 備考 |
|----------|------|------|
| 6000 | 100.0 | ゲーム開始 |
| 184 | 3.1 | 3.0667→四捨五入 |
| 214 | 3.6 | 3.5667→四捨五入 |
| 30 | 0.5 | |
| 0 | 0.0 | ゲーム終了 |

### 1.3 時間軸の方向

ゲーム内時間は 100秒→0秒 へカウントダウンする。

```
数値が大きい = 過去（ゲーム開始側）
数値が小さい = 未来（ゲーム終了側）

6000F(100秒)  ──→  0F(0秒)
   過去                未来
```

「T1 > T2」は「T1 は T2 より過去」を意味する。本書および全コードでこの方向性を統一する。

---

## 2. 定数

| 定数名 | 値(F) | 値(秒) | 意味 |
|--------|-------|--------|------|
| `SPAWNER_DECISION_FRAMES` | 184 | 3.07 | 撃破→スポナー決定 |
| `SPAWN_WAIT_FRAMES` | 30 | 0.50 | スポナー決定→実体出現 |
| `RESPAWN_FRAMES` | 214 | 3.57 | 撃破→実体出現（上2つの合計） |
| `SPAWN_SUPPRESSION_FRAMES` | 184 | 3.07 | 湧き間隔の最小フレーム（グローバル湧き抑制） |
| `FPS` | 60 | — | フレームレート |
| `GAME_DURATION_SECONDS` | — | 100 | Wave制限時間 |
| `GAME_DURATION_FRAMES` | 6000 | — | = 100 × 60 |
| `DIRECTION_SWITCH_BASE` | — | 72 | 方面切替計算の基準値 |

重要な関係式: `RESPAWN_FRAMES = SPAWNER_DECISION_FRAMES + SPAWN_WAIT_FRAMES`

---

## 3. リスポーンメカニクス

### 3.1 2段階プロセス

撃破からリスポーンまでは以下の2段階で進行する。

```
[時刻D] グリルを撃破
    │
    │  184F (3.07秒) 経過
    ▼
[時刻D − 184F] スポナー決定  ← ★湧き方面はこの時刻で判定
    │
    │  30F (0.5秒) 経過
    ▼
[時刻D − 214F] 新グリル出現
```

※ 時間はカウントダウンのため、「経過」は数値の減少方向。

### 3.2 計算式

```
spawnerDecisionTime(defeatFrame) = defeatFrame − SPAWNER_DECISION_FRAMES
spawnTime(defeatFrame)           = defeatFrame − RESPAWN_FRAMES
```

### 3.3 計算例

撃破時刻 85.0秒（5100F）の場合:

```
スポナー決定: 5100 − 184 = 4916F → framesToSeconds(4916) = 81.9秒
実体出現:     5100 − 214 = 4886F → framesToSeconds(4886) = 81.4秒
```

---

## 4. グリル枠

### 4.1 A枠とB枠

グリルには2つの独立した管理枠がある。

- **A枠**: Wave開始時（100秒、6000F）に1体自動で湧く。常に存在。
- **B枠**: キケン度に応じた経過時間後に1体自動で湧く。`DozerIncrSecond` が 100未満の場合のみ出現。

各枠は独立して動作し、A枠の撃破はA枠にのみ、B枠の撃破はB枠にのみリスポーンを発生させる。

### 4.2 B枠の自動湧き

B枠の出現タイミングは `DozerIncrSecond` パラメータで決まる。

```
B枠スポナー決定時刻(F) = secondsToFrames(100 − DozerIncrSecond) − SPAWNER_DECISION_FRAMES
B枠出現時刻(F)         = secondsToFrames(100 − DozerIncrSecond) − RESPAWN_FRAMES
```

例: `DozerIncrSecond = 30`（キケン度 100%）

```
開放基準:           100 − 30 = 70.0秒 → 4200F
スポナー決定:       4200 − 184 = 4016F → 66.9秒
実体出現:           4200 − 214 = 3986F → 66.4秒
```

### 4.3 自動湧きのスポナー決定時刻

自動湧き（A枠1体目、B枠1体目）のスポナー決定時刻は、出現時刻に `SPAWN_WAIT_FRAMES` を加算して求める。

```
自動湧きのスポナー決定時刻 = 出現フレーム + SPAWN_WAIT_FRAMES
```

- A枠1体目: `6000 + 30 = 6030F`（ゲーム開始前に決定済み）
- B枠1体目: `B枠出現フレーム + 30`

これは方面判定と統計集計で使用する。

---

## 5. 方面切替と判定

### 5.1 切替間隔

方面の切替間隔はキケン度依存パラメータ `WaveChangeNum` で決まる。

```
directionInterval(秒) = DIRECTION_SWITCH_BASE / WaveChangeNum = 72 / WaveChangeNum
```

### 5.2 切替タイミングの生成

100秒（6000F）を起点に、`directionInterval` 秒ごとに切替点を生成する。

```
switchTimes = [
  secondsToFrames(100),
  secondsToFrames(100 − interval),
  secondsToFrames(100 − interval × 2),
  ...
]  // 0F未満になるまで続ける
```

**浮動小数点誤差回避**: ループで減算を繰り返すのではなく、インデックス `i` を用いて `100 − interval × i` を都度計算する。

例: `WaveChangeNum = 9`（キケン度 333%）

```
interval = 72 / 9 = 8.0秒

切替タイミング(秒): 100, 92, 84, 76, 68, 60, 52, 44, 36, 28, 20, 12, 4
切替タイミング(F):  6000, 5520, 5040, 4560, 4080, 3600, 3120, 2640, 2160, 1680, 1200, 720, 240
```

### 5.3 方面設定

各切替タイミングに対して、ユーザーが方面名（例: "左", "中央", "右"）を割り当てる。方面設定はフレームタイムの降順で管理する。

```
例（WaveChangeNum = 5, interval = 14.4秒）:
  区間1: 6000F (100.0秒) → "左"
  区間2: 5136F (85.6秒)  → "中央"
  区間3: 4272F (71.2秒)  → "右"
  区間4: 3408F (56.8秒)  → "左"
  区間5: 2544F (42.4秒)  → "中央"
```

### 5.4 方面判定ロジック

あるスポナー決定時刻がどの方面区間に属するかを判定する。

**判定ルール**: 方面設定を降順（時間的に過去→未来）に走査し、`frameTime >= spawnerDecisionFrame` を満たす最初の設定を返す。

```
getDirectionAtTime(spawnerDecisionFrame, sortedDirections):
  for each setting in sortedDirections:  // 降順
    if setting.frameTime >= spawnerDecisionFrame:
      return setting.direction
  return sortedDirections[last].direction  // フォールバック
```

**判定例**:

方面設定（降順）:
```
[0] 6000F(100秒): "左"
[1] 5520F(92秒):  "中央"
[2] 5040F(84秒):  "右"
[3] 4560F(76秒):  "左"
```

- スポナー決定 4916F (81.9秒) → `5040 >= 4916` → "右"
- スポナー決定 5200F (86.7秒) → `5520 >= 5200` → "中央"
- スポナー決定 6000F (100.0秒) → `6000 >= 6000` → "左"
- スポナー決定 4500F (75.0秒) → いずれも不一致 → フォールバック "左"

**重要**: 判定には湧き時刻ではなくスポナー決定時刻を使用する。

---

## 6. キケン度依存パラメータ

### 6.1 基準データ（CoopLevelsConfig.json）

| Difficulty | DozerIncrSecond | DozerSpeedCoef | WaveChangeNum |
|-----------|----------------|---------------|---------------|
| 20 | 80 | 1.3 | 3 |
| 40 | 70 | 1.5 | 3 |
| 60 | 60 | 1.7 | 4 |
| 80 | 40 | 1.9 | 4 |
| 100 | 30 | 2.1 | 5 |
| 200 | 10 | 2.3 | 7 |
| 333 | 10 | 2.6 | 9 |

`DozerSpeedCoef` は本ツールでは未使用。

### 6.2 線形補間

基準データに完全一致するキケン度がない場合、上下の基準値を線形補間する。

```
lower: Difficulty = d1 の設定
upper: Difficulty = d2 の設定
target: 求めるキケン度 (d1 < target < d2)

ratio = (target − d1) / (d2 − d1)

DozerIncrSecond = lower.DozerIncrSecond + (upper.DozerIncrSecond − lower.DozerIncrSecond) × ratio
WaveChangeNum   = floor(lower.WaveChangeNum + (upper.WaveChangeNum − lower.WaveChangeNum) × ratio)
```

`WaveChangeNum` は整数に切り捨て（floor）する。

### 6.3 補間計算例

キケン度 180% の場合:

```
lower: 100% (DozerIncrSecond=30, WaveChangeNum=5)
upper: 200% (DozerIncrSecond=10, WaveChangeNum=7)

ratio = (180 − 100) / (200 − 100) = 0.8

DozerIncrSecond = 30 + (10 − 30) × 0.8 = 30 − 16 = 14
WaveChangeNum   = floor(5 + (7 − 5) × 0.8) = floor(6.6) = 6

directionInterval = 72 / 6 = 12.0秒

B枠:
  開放基準:     100 − 14 = 86秒 → 5160F
  スポナー決定: 5160 − 184 = 4976F → 82.9秒
  実体出現:     5160 − 214 = 4946F → 82.4秒
```

### 6.4 キケン度の有効範囲と範囲外フォールバック

UIで想定する有効範囲は 20% 〜 333%。ただし `getHazardConfig()` は範囲外の値でもエラーを投げず、**最も近い基準値にフォールバック**する。

- **完全一致あり**: その基準値をそのまま使用する。
- **下限未満（target < 20）**: 上下の基準値が同一（`lower === upper`、ともに先頭の 20% 設定）になるため、下限の基準値（20% 相当）をそのまま使用する。
- **上限超過（target > 333）**: 同様に `lower === upper`（ともに末尾の 333% 設定）となり、上限の基準値（333% 相当）をそのまま使用する。
- **基準データが空**: `DozerIncrSecond = 30`, `WaveChangeNum = 5`（キケン度100%相当）にフォールバックする。

範囲内（基準値の中間）の場合のみ §6.2 の線形補間を適用する。

---

## 7. 湧き点の計算（calculateSpawns）

すべての撃破点と設定から、全湧き点を計算する純粋関数。処理は **Phase 1（各湧きの素の出現時刻 `rawFrameTime` を算出）** と **Phase 2（グローバル湧き抑制を適用して実際の出現時刻 `frameTime` を確定）** の2段構成。

### 7.1 アルゴリズム

```
calculateSpawns(hazardConfig, directions, defeats) → SpawnPoint[]:
  sortedDirections = sort(directions, descending by frameTime)

  // === Phase 1: 全湧きの rawFrameTime を計算 ===
  pending = []

  // A枠 自動湧き
  pending.push({
    slot: 'A',
    rawFrameTime: GAME_DURATION_FRAMES,  // 6000
    direction: sortedDirections[0].direction,
    isAuto: true
  })

  // B枠 自動湧き（存在する場合）
  if hazardConfig.bSlotOpenFrame >= 0:
    bSlotSpawnerDecision = hazardConfig.bSlotOpenFrame + SPAWN_WAIT_FRAMES
    pending.push({
      slot: 'B',
      rawFrameTime: hazardConfig.bSlotOpenFrame,
      direction: getDirectionAtTime(bSlotSpawnerDecision, sortedDirections),
      isAuto: true
    })

  // 撃破点から湧き点を生成
  for each defeat in defeats:
    spawnerDecisionTime = defeat.frameTime − SPAWNER_DECISION_FRAMES
    rawSpawnTime = defeat.frameTime − RESPAWN_FRAMES
    pending.push({
      slot: defeat.slot,
      rawFrameTime: rawSpawnTime,
      direction: getDirectionAtTime(spawnerDecisionTime, sortedDirections),
      isAuto: false,
      defeatId: defeat.id
    })

  // === Phase 2: 降順ソート → グローバル湧き抑制（§7.3） ===
  pending.sort(descending by rawFrameTime;
               同フレームなら slot 'A' を先に)

  result = []
  lastSpawnFrame = +∞

  for p in pending:
    suppressionLimit = lastSpawnFrame − SPAWN_SUPPRESSION_FRAMES
    isSuppressed = p.rawFrameTime > suppressionLimit
    actualFrameTime = isSuppressed ? suppressionLimit : p.rawFrameTime

    result.push({
      slot: p.slot,
      frameTime: actualFrameTime,
      direction: p.direction,
      isAuto: p.isAuto,
      defeatId: p.defeatId,
      // 抑制された湧きのみ付与
      ...(isSuppressed ? { isSuppressed: true, rawFrameTime: p.rawFrameTime } : {})
    })

    lastSpawnFrame = actualFrameTime

  return result
```

**注意**: B枠自動湧きの方面判定には、`hazardConfig` に含まれないため、`bSlotOpenFrame + SPAWN_WAIT_FRAMES`（＝B枠スポナー決定時刻）をその場で算出して使用する。`direction` は内部的には数値の `DirectionId`（`0 | 1 | 2`）であり、UI上の方面名はこの数値に対応付けられる。

### 7.2 計算の連鎖例

キケン度 100%（DozerIncrSecond=30, WaveChangeNum=5, interval=14.4秒）

方面設定: 100.0秒→"左", 85.6秒→"中央", 71.2秒→"右", 56.8秒→"左", 42.4秒→"中央"

```
[自動] A枠 湧き: 6000F(100.0秒) 左
[自動] B枠 湧き: 3986F(66.4秒)  右  ← スポナー決定4016F(66.9秒)は71.2秒区間

[操作] 95.0秒(5700F)にA枠撃破
  → スポナー決定: 5700−184 = 5516F(91.9秒) → 100.0秒区間 → "左"
  → 湧き: 5700−214 = 5486F(91.4秒)
  → A枠 湧き: 5486F(91.4秒) 左

[操作] 88.0秒(5280F)にA枠撃破
  → スポナー決定: 5280−184 = 5096F(84.9秒) → 85.6秒区間 → "中央"
  → 湧き: 5280−214 = 5066F(84.4秒)
  → A枠 湧き: 5066F(84.4秒) 中央

[操作] 60.0秒(3600F)にB枠撃破
  → スポナー決定: 3600−184 = 3416F(56.9秒) → 56.8秒区間 → "左"
  → 湧き: 3600−214 = 3386F(56.4秒)
  → B枠 湧き: 3386F(56.4秒) 左
```

### 7.3 グローバル湧き抑制（SPAWN_SUPPRESSION_FRAMES）

A枠・B枠を**横断して**、湧きの実際の出現は前の湧きから最低 `SPAWN_SUPPRESSION_FRAMES`（184F = 3.07秒）の間隔が空くよう強制される。複数の湧きが互いに `SPAWN_SUPPRESSION_FRAMES` 未満の間隔で発生しようとすると、**時間的に後（より未来＝frameTimeが小さい側）の湧きが強制的に遅延**される。

この抑制は枠ごとではなく、A枠・B枠を合わせた全湧きに対してグローバルに適用される点に注意（Phase 2 で `lastSpawnFrame` を枠を区別せず1本のチェーンとして引き継ぐ）。

**規則（実装どおり）**:

1. 全湧き（A枠自動・B枠自動・撃破由来）を `rawFrameTime` の降順（過去→未来）にソートする。同一 `rawFrameTime` の場合は A枠を先に処理する。
2. 直前に確定した出現フレームを `lastSpawnFrame`（初期値 +∞）とし、各湧きについて `suppressionLimit = lastSpawnFrame − SPAWN_SUPPRESSION_FRAMES` を求める。
3. `rawFrameTime > suppressionLimit`（＝直前の湧きに対して184F以内＝過去寄りすぎる）なら**抑制対象**とし、実際の出現フレームを `suppressionLimit` に切り下げる。そうでなければ `rawFrameTime` をそのまま使用する。
4. 確定した出現フレームを次の `lastSpawnFrame` として引き継ぐ。

**SpawnPoint への記録**: 抑制された湧きには `isSuppressed: true` と、抑制前の素の出現時刻 `rawFrameTime` が付与される。抑制されなかった湧きにはこれらのフィールドは付かない（`frameTime === rawFrameTime`）。

**計算例**: A枠自動湧き 6000F の直後、撃破由来の湧きが素の出現時刻 5900F（=6000−SPAWN_SUPPRESSION_FRAMES の 5816F より過去寄り）に発生しようとした場合:

```
lastSpawnFrame = 6000
suppressionLimit = 6000 − 184 = 5816
rawFrameTime(5900) > 5816 → 抑制対象
actualFrameTime = 5816   （5900 → 5816 に切り下げ）
→ SpawnPoint { frameTime: 5816, isSuppressed: true, rawFrameTime: 5900 }
```

---

## 8. 撃破可能条件

### 8.1 旧実装の問題点（P0バグ）

旧実装では「現在の spawns で撃破可能か判定」していた。しかし、新しい撃破を追加すると spawns が変化するため、この方式では正しい判定ができない。撃破が正当なのに拒否される、または不正な撃破が許可される致命的バグがあった。

### 8.2 正しい定義（シミュレーション方式）

**撃破可能条件**: ある時刻 T・枠 S に撃破点を追加（または移動）したとき、その撃破を含めて全体の spawns を再計算し、再計算後の状態で以下がすべて満たされること。

1. **湧き点が存在する**: 枠 S に、T 以上（T と同じかより過去）のフレームタイムを持つ湧き点が存在する
2. **直近の湧きが対応する**: T 以上の湧き点のうち最も T に近い（最小の）ものを `lastSpawn` とする。`lastSpawn` が存在する
3. **次の湧きと干渉しない**: T 未満（T より未来）の湧き点が存在する場合、その中で最も T に近い（最大の）ものを `nextSpawn` とする。`T < nextSpawn.frameTime` でなければならない（撃破してから次が湧く順序）

### 8.3 バリデーションアルゴリズム

```
validateDefeat(newDefeat, existingDefeats, hazardConfig, directions):
  // 1. 仮の撃破リストを構築
  testDefeats = existingDefeats に newDefeat を追加（既存の移動なら置換）

  // 2. 仮の spawns を再計算
  testSpawns = calculateSpawns(hazardConfig, directions, testDefeats)

  // 3. 再計算後の spawns で整合性チェック
  for each defeat in testDefeats:
    if not isConsistentDefeat(defeat, testSpawns):
      return INVALID

  return VALID

isConsistentDefeat(defeat, spawns):
  slotSpawns = spawns.filter(s => s.slot === defeat.slot).sort(descending)

  // 条件1: 撃破時刻以上の湧き点が存在
  pastSpawns = slotSpawns.filter(s => s.frameTime >= defeat.frameTime)
  if pastSpawns is empty: return false

  // 条件3: 撃破時刻未満の湧き点がある場合、順序チェック
  futureSpawns = slotSpawns.filter(s => s.frameTime < defeat.frameTime)
  if futureSpawns is not empty:
    nextSpawn = futureSpawns with max frameTime
    if defeat.frameTime >= nextSpawn.frameTime: return false
      // 撃破時刻が次の湧きと同時またはそれより過去 → 不正

  return true
```

### 8.4 バリデーション例

初期状態: A枠 湧き 6000F(100秒)

**正当な撃破 — 95秒(5700F)に追加**:

```
testDefeats: [{slot:'A', frameTime:5700}]
testSpawns:
  [auto] A枠 6000F
  [from defeat] A枠 5486F (5700−214)

検証 defeat(5700F):
  pastSpawns: [6000F] → 存在OK
  futureSpawns: [5486F] → nextSpawn=5486F
  5700 < 5486? → NO... wait, 5700 > 5486 → true → ...
```

注意: 数値が大きい方が過去。`5700 > 5486` は「5700の方が過去」。条件は `defeat.frameTime < nextSpawn.frameTime` つまり `5700 < 5486` → false → **不正**…ではなく、条件を整理する:

**修正**: `nextSpawn` は「未来側で最も近い湧き」であり `frameTime < defeat.frameTime` で抽出される。この場合 5486 < 5700 なので `nextSpawn = 5486F`。条件 `defeat.frameTime >= nextSpawn.frameTime` は `5700 >= 5486` → true → 不正…これは明らかに間違い。

**正しい条件の再整理**:

時間軸: 大→小（過去→未来）。グリルは「湧く→存在→撃破される」の順で、湧き時刻 > 撃破時刻 > 次の湧き時刻 という関係が成立する必要がある。

```
lastSpawn.frameTime >= defeat.frameTime > nextSpawn.frameTime
```

つまり: 撃破時刻は、直近の湧きと次の湧きの間にある必要がある。

再計算版:

```
testSpawns for A枠: [6000F, 5486F]  (降順)

defeat(5700F):
  6000 >= 5700 > 5486  → 成立 → VALID ✓
```

**不正な撃破 — 91秒(5460F)に追加（湧き5486Fより未来）**:

```
testDefeats: [{slot:'A', frameTime:5460}]
testSpawns:
  [auto] A枠 6000F
  [from defeat] A枠 5246F (5460−214)

defeat(5460F):
  pastSpawns: [6000F] → 5460より過去の湧きは6000F
  futureSpawns: [5246F]
  6000 >= 5460 > 5246  → 成立 → VALID ✓
```

これも正当。湧き(6000F)のあと撃破(5460F)、次の湧き(5246F)が続くので問題ない。

**真に不正な撃破 — 既に撃破1(5700F)がある状態で5500Fに追加**:

```
existingDefeats: [{id:'d1', slot:'A', frameTime:5700}]
newDefeat: {id:'d2', slot:'A', frameTime:5500}

testDefeats: [d1(5700F), d2(5500F)]
testSpawns:
  [auto] A枠 6000F
  [from d1] A枠 5486F (5700−214)
  [from d2] A枠 5286F (5500−214)

検証 d1(5700F):
  6000 >= 5700 > 5486 → 成立 ✓

検証 d2(5500F):
  pastSpawns(>=5500): [6000, 5486] → lastSpawn = 5486
  futureSpawns(<5500): [5286] → nextSpawn = 5286
  5486 >= 5500? → NO → INVALID ✗
```

d2(5500F)は湧き(5486F)より過去に撃破しようとしているため不正。`lastSpawn(5486) >= defeat(5500)` が成立しない。

### 8.5 撃破可能条件の最終定義（チェーン検証方式）

旧 `isConsistentDefeat` の個別チェック方式では、1つの湧きが複数の撃破に対応してしまう問題がある。正しくは枠単位で「湧き→撃破→湧き→撃破→…」のチェーンが1対1で成立するかを検証する（`validateSlotChain`）。

```
validateSlotChain(sortedSpawns, sortedDefeats):
  // 引数は降順ソート済み（大きい frameTime = ゲーム開始寄り が先頭）
  spawnIdx = 0

  for defeat in sortedDefeats:
    // この撃破に対応する湧きを探す（defeat.frameTime 以上の湧き）
    while spawnIdx < sortedSpawns.length && sortedSpawns[spawnIdx].frameTime < defeat.frameTime:
      spawnIdx++

    if spawnIdx >= sortedSpawns.length:
      return false  // 対応する湧きがない

    // この湧きはこの撃破で消費 → 次へ
    spawnIdx++

  return true
```

重要なのは、**1つの湧きは1つの撃破にしか対応できない**ということ。湧き→撃破の1対1マッチングを降順（時間的に過去から）に行う。

---

## 9. 撃破移動時の影響処理

撃破点の時刻を変更すると、リスポーン時刻も変わるため、同じ枠の後続撃破点が不整合になる場合がある。

### 9.1 影響判定

```
getAffectedDefeats(changedDefeat, newFrameTime, allDefeats):
  newSpawnTime = newFrameTime − RESPAWN_FRAMES

  return allDefeats.filter(d =>
    d.slot === changedDefeat.slot &&
    d.id !== changedDefeat.id &&
    d.frameTime < changedDefeat.frameTime &&  // 変更した撃破より未来
    d.frameTime > newSpawnTime                  // 新しい湧きより過去（不正領域）
  )
```

影響を受ける撃破点は削除する必要がある。

---

## 10. 統計集計

### 10.1 集計の基準

方面別のグリル出現数は、**スポナー決定時刻**を基準に集計する。

各湧き点のスポナー決定時刻:

- 自動湧き: `出現フレーム + SPAWN_WAIT_FRAMES`
- 撃破からの湧き: `対応する撃破フレーム − SPAWNER_DECISION_FRAMES`

### 10.2 区間判定

方面設定が降順配列 `[d0, d1, d2, ...]` で与えられる場合、スポナー決定時刻 `T` がどの区間に属するかを判定する。

**判定ルール**: 区間 `i` は `d[i].frameTime` から `d[i+1].frameTime` の直前まで（最後の区間は0Fまで）。

```
findDirectionIndex(T, directions):
  for i = 0 to directions.length − 1:
    lower = directions[i].frameTime
    upper = (i + 1 < directions.length) ? directions[i + 1].frameTime : −∞

    if T <= lower and T > upper:
      return i

  return −1  // 該当なし（異常）
```

注意: 降順配列なので `directions[0].frameTime` が最大（最も過去）、末尾が最小（最も未来）。区間の境界条件は「開始フレーム以下かつ次の開始フレームより大きい」。

### 10.3 集計例

方面設定（降順）: `[6000F:"左", 5520F:"中央", 5040F:"右"]`

| 湧き | スポナー決定時刻 | 区間 | 方面 |
|------|----------------|------|------|
| A枠自動(6000F) | 6030F | ≤6000かつ>5520 → ... | "左" |

注: A枠自動湧きのスポナー決定時刻 6030F は 6000F より過去。この場合は最初の区間（"左"）に含める。`T <= 6000` を満たさないが、ゲーム開始前の決定であるため特別に最初の区間に分類する。

修正: 自動湧きの場合、スポナー決定時刻がゲーム開始より過去になることがある（A枠: 6030F）。この場合は最初の方面区間に属するものとして扱う。

---

## 11. 複数グリルの連鎖例（完全版）

キケン度 200%: DozerIncrSecond=10, WaveChangeNum=7, interval=72/7≈10.29秒

方面設定（降順）:

```
6000F(100.0秒): "右"
5383F(89.7秒):  "左"
4766F(79.4秒):  "中央"
4149F(69.2秒):  "右"
3531F(58.9秒):  "左"
2914F(48.6秒):  "中央"
2297F(38.3秒):  "右"
```

自動湧き:

```
A枠: 6000F(100.0秒) "右"  [スポナー決定6030F→右]
B枠: 5186F(86.4秒)  "左"  [スポナー決定5216F(86.9秒)→89.7秒区間→左]
  ※ B枠開放基準: 100−10=90秒=5400F
  ※ スポナー決定: 5400−184=5216F
  ※ 実体出現: 5400−214=5186F
```

操作シーケンス:

```
[1] A枠撃破 97秒(5820F)
    → スポナー決定: 5820−184=5636F(93.9秒) → 100.0秒区間 → "右"
    → 湧き: 5820−214=5606F(93.4秒)

[2] A枠撃破 90秒(5400F)
    → スポナー決定: 5400−184=5216F(86.9秒) → 89.7秒区間 → "左"
    → 湧き: 5400−214=5186F(86.4秒)

[3] B枠撃破 83秒(4980F)
    → スポナー決定: 4980−184=4796F(79.9秒) → 79.4秒区間 → "中央"
    → 湧き: 4980−214=4766F(79.4秒)

統計: 右=2, 左=2, 中央=1  (自動2体 + 撃破リスポーン3体 = 5体)
```

---

**本仕様書は、シミュレーションツールの計算ロジック実装の唯一の根拠である。変更がある場合は必ず本書を更新すること。**
