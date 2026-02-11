# 07 実装ガイド

7フェーズに分割した実装順序を定義する。各フェーズで作成するファイル、完了条件、動作確認方法を明記する。

---

## Phase 1: プロジェクトセットアップ & データ層

### 目標

開発環境が動作し、静的データを読み込んで型付きで扱える状態にする。

### 作成ファイル

| ファイル | 内容 |
|---------|------|
| `vite.config.ts` | 04_TECH_STACK §2.3 の通り |
| `tsconfig.json` | 04_TECH_STACK §2.4 の通り |
| `src/index.css` | Tailwind v4 のインポート + テーマ変数（06_UI_DESIGN §2.1） |
| `src/types/*.ts` | 05_ARCHITECTURE §1 の全型定義 |
| `src/constants/index.ts` | 05_ARCHITECTURE §2 の定数定義 |
| `src/hooks/useDataLoader.ts` | マスターデータ読み込みフック |
| `src/main.tsx` | React エントリポイント |
| `src/App.tsx` | 最小限のレイアウト（データ読み込み状態の表示） |
| `public/data/*.json` | 旧プロジェクトからコピー（weapon.json, special.json, CoopLevelsConfig.json） |
| `public/img/weapon/*.png` | 旧プロジェクトからコピー |
| `public/img/special/*.png` | 旧プロジェクトからコピー |

### 手順

1. `npm create vite@latest grill-planner -- --template react-ts`
2. 依存パッケージ追加: `npm install tailwindcss @tailwindcss/vite`
3. `vite.config.ts` を設定（base, plugins, resolve.alias）
4. `tsconfig.json` を調整（strict, noUncheckedIndexedAccess, paths）
5. `src/index.css` を Tailwind v4 形式に書き換え
6. `src/types/` 配下に型定義ファイルを作成
7. `src/constants/index.ts` を作成
8. `public/data/` に JSON データを配置
9. `public/img/` にアイコン画像を配置
10. `src/hooks/useDataLoader.ts` を実装
11. `src/App.tsx` でデータ読み込みを確認表示

### 完了条件

- `npm run dev` でエラーなく起動する
- 画面にブキ数（70+）、スペシャル数（9）、キケン度設定数（7）が表示される
- TypeScript のコンパイルエラーがない
- `npm run build` が成功する

### 落とし穴

- **Tailwind v4 のインポート**: `@tailwind base; @tailwind components; @tailwind utilities;` ではなく `@import "tailwindcss";` を使う
- **Vite プラグイン**: `@tailwindcss/vite` を忘れると Tailwind クラスが適用されない
- **base パス**: `import.meta.env.BASE_URL` で `fetch` のパスを構築。開発時は `/grill-planner/`、ビルド後も同じ
- **パスエイリアス**: `tsconfig.json` の `paths` だけでは不十分。`vite.config.ts` の `resolve.alias` も必要

---

## Phase 2: コア計算エンジン

### 目標

02_GAME_MECHANICS.md の仕様をすべて純粋関数として実装する。

### 作成ファイル

| ファイル | 内容 |
|---------|------|
| `src/utils/calculations.ts` | 時間変換、リスポーン計算、キケン度補間、方面判定、spawns計算 |
| `src/utils/validation.ts` | シミュレーション方式バリデーション |
| `src/utils/statistics.ts` | 方面別統計集計 |

### 実装指示

#### calculations.ts

05_ARCHITECTURE §4.2 の関数シグネチャに従って実装。02_GAME_MECHANICS.md の計算例を使って手動テストする。

重要関数と注意点:

- `getHazardConfig`: データが空の場合のフォールバック処理を忘れない
- `getDirectionSwitchTimes`: ループ内で減算を繰り返さない。インデックス × interval で計算
- `getDirectionAtTime`: 降順ソート済み配列を前提。`find(d => d.frameTime >= spawnerDecisionFrame)` が正しい走査方向
- `calculateSpawns`: 自動湧き（A枠、B枠）と撃破由来の湧きを区別して生成

#### validation.ts

05_ARCHITECTURE §4.3 のシミュレーション方式アルゴリズムをそのまま実装。

**最重要**: `canDefeatAt` のような「現在の spawns で判定」する関数は作らない。バリデーションは必ず:
1. 仮の撃破リストを構築
2. `calculateSpawns` で再計算
3. 再計算後の spawns で整合性チェック

の3ステップで行う。

#### statistics.ts

05_ARCHITECTURE §4.4 に従う。`findDirectionIndex` の境界条件に注意:
- ゲーム開始前のスポナー決定（自動湧きの 6030F 等）は最初の区間に分類
- 降順配列の走査方向を間違えない

### 完了条件

- 02_GAME_MECHANICS.md §7.2 の計算例を手動実行して結果が一致
- 02_GAME_MECHANICS.md §8.4 のバリデーション例が正しく判定される
- App.tsx に仮の撃破点をハードコードし、計算結果（spawns, stats）をコンソール出力で確認

### 落とし穴

- **getDirectionAtTime の走査方向**: 旧実装では `find(d => d.frameTime >= spawnerDecisionFrame)` だったが、降順配列を先頭から走査するため「最初に条件を満たすもの」は最も過去の設定になる。02_GAME_MECHANICS §5.4 の判定例で検証すること
- **B枠の自動湧きスポナー決定**: `出現フレーム + SPAWN_WAIT_FRAMES` であり、`− SPAWNER_DECISION_FRAMES` ではない。統計集計でこれを間違えると方面がずれる
- **浮動小数点**: `secondsToFrames(framesToSeconds(x))` が必ずしも `x` に戻らない。フレーム単位で計算し、秒への変換はUI表示時のみ行う

---

## Phase 3: 状態管理

### 目標

Reducer + Context による状態管理が動作し、画面から操作できる状態にする。

### 作成ファイル

| ファイル | 内容 |
|---------|------|
| `src/hooks/scenarioReducer.ts` | アクション型定義 + Reducer |
| `src/hooks/ScenarioContext.tsx` | Context + Provider + useScenario |
| `src/hooks/useGrillCalculation.ts` | 計算結果導出フック |

### 実装指示

- 05_ARCHITECTURE §3 のコードをベースに実装
- `createInitialScenario()` 関数を `scenarioReducer.ts` 内に定義。デフォルトキケン度 100%、方面設定は `getDirectionSwitchTimes` で自動生成
- `App.tsx` を更新: `ScenarioProvider` で囲み、キケン度と方面区間数を画面表示

### 完了条件

- React DevTools で Context の state が確認できる
- ブラウザコンソールから `dispatch({type: 'SET_HAZARD_LEVEL', payload: 200})` 相当の操作で state が変わる（開発用一時ボタンでも可）
- キケン度変更 → 方面区間数の変化を確認

### 落とし穴

- **Context の再レンダリング**: Provider の value が毎レンダリングで新オブジェクトになると全子コンポーネントが再レンダリングされる。`useMemo` で value をメモ化するか、state と dispatch を別 Context に分離する。初期実装では前者で十分
- **初期方面設定**: キケン度 100% の場合 WaveChangeNum=5, interval=14.4秒 → 方面区間は約7個。`getDirectionSwitchTimes` の結果の長さに注意

---

## Phase 4: タイムラインUI

### 目標

タイムラインの表示と撃破点のインタラクション（追加・ドラッグ移動・削除）が動作する。

### 作成ファイル

| ファイル | 内容 |
|---------|------|
| `src/components/Timeline/index.tsx` | タイムラインコンテナ |
| `src/components/Timeline/TimeAxis.tsx` | 時間軸目盛り |
| `src/components/Timeline/DirectionBands.tsx` | 方面区間の背景帯 |
| `src/components/Timeline/DirectionLabels.tsx` | 方面ラベル（編集可能） |
| `src/components/Timeline/GrillSlotLane.tsx` | A枠/B枠のレーン |
| `src/components/Timeline/SpawnMarker.tsx` | 湧き点マーカー |
| `src/components/Timeline/DefeatMarker.tsx` | 撃破点マーカー |
| `src/components/Timeline/ActivePeriod.tsx` | 活動期間バー |
| `src/components/Timeline/RespawnConnector.tsx` | 撃破→湧き接続線 |
| `src/hooks/useTimelineDrag.ts` | ドラッグ操作フック |
| `src/hooks/useValidation.ts` | バリデーション呼び出しフック |

### 実装順序

**Step 4-1: 静的表示**（クリック操作なし）
1. `Timeline/index.tsx`: コンテナ、横スクロール、座標系定義
2. `TimeAxis.tsx`: 目盛り描画
3. `DirectionBands.tsx`: 背景帯描画
4. `GrillSlotLane.tsx`: 空のレーン
5. `SpawnMarker.tsx`: 自動湧き点のみ表示

この時点で: タイムライン上に時間軸、方面帯、A枠/B枠の自動湧き点が表示される

**Step 4-2: 撃破点の追加**
1. `GrillSlotLane.tsx` にクリックハンドラ追加
2. `useValidation.ts`: クリック位置のバリデーション
3. 追加成功 → `DefeatMarker.tsx` で表示
4. 追加成功 → `calculateSpawns` の再計算で新しい湧き点が表示

この時点で: クリックで撃破点を追加し、リスポーン先の湧き点が自動表示される

**Step 4-3: 接続線と活動期間**
1. `RespawnConnector.tsx`: 撃破→スポナー決定→湧きの線
2. `ActivePeriod.tsx`: 湧き→撃破の期間バー

**Step 4-4: ドラッグ移動**
1. `useTimelineDrag.ts`: ドラッグ状態管理
2. `DefeatMarker.tsx`: mousedown/mousemove/mouseup ハンドリング
3. ドラッグ中のリアルタイムバリデーション + 視覚フィードバック

**Step 4-5: 削除**
1. `DefeatMarker.tsx`: 右クリックハンドラ
2. 影響を受ける後続撃破点の連動削除

**Step 4-6: 方面ラベル編集**
1. `DirectionLabels.tsx`: クリック → input 表示 → Enter/Escape/blur で確定

### 完了条件

- 自動湧き点（A枠、B枠）が正しい位置に表示される
- クリックで撃破点を追加でき、湧き点が自動計算表示される
- 撃破点をドラッグして時刻変更できる。不正位置ではグレー表示
- 右クリックで撃破点を削除でき、後続が連動削除される
- 方面ラベルをクリック編集できる
- 接続線と活動期間バーが正しく描画される

### 落とし穴

- **座標変換**: フレーム↔ピクセルの変換を間違えやすい。時間は右→左（100→0）、ピクセルは左→右（0→1600）。`frameToPixelX` 関数を1つ定義して統一的に使う
- **ドラッグとクリックの区別**: mousedown → mousemove の移動距離が5px未満ならクリック扱い。旧プロジェクトではこの区別に苦慮した
- **ドラッグ中のイベント**: mousemove/mouseup は `window` に登録する（マーカーからカーソルが外れてもドラッグ継続のため）
- **右クリック**: `onContextMenu` で `e.preventDefault()` を忘れるとブラウザのコンテキストメニューが出る
- **ポインターイベント**: 重なるマーカー（湧き点と撃破点が近い場合）のクリック判定。z-index で撃破点を前面に配置
- **再レンダリング**: ドラッグ中は16ms以内に再計算+再描画が必要。`useMemo` で spawns 計算をメモ化し、変更された撃破点のみで再計算

---

## Phase 5: 設定UI

### 目標

Header、SettingsPanel、統計パネルが動作する。

### 作成ファイル

| ファイル | 内容 |
|---------|------|
| `src/components/Header/index.tsx` | タイトル + ファイル操作ボタン |
| `src/components/Settings/index.tsx` | SettingsPanel コンテナ（折りたたみ） |
| `src/components/Settings/HazardLevelInput.tsx` | キケン度スライダー + 数値入力 |
| `src/components/Settings/MemoSection.tsx` | メモ情報の折りたたみコンテナ |
| `src/components/Settings/WeaponSelector.tsx` | ブキ選択ドロップダウン |
| `src/components/Settings/SpecialSelector.tsx` | SP選択ドロップダウン |
| `src/components/Settings/TargetOrderEditor.tsx` | ターゲット順設定 |
| `src/components/Settings/SnatchersInput.tsx` | タマヒロイメモ |
| `src/components/Settings/ScenarioCodeInput.tsx` | シナリオコードメモ |
| `src/components/Settings/DisplayModeToggle.tsx` | 表示モード切替 |
| `src/components/Statistics/index.tsx` | 統計パネルコンテナ |
| `src/components/Statistics/DirectionStatsTable.tsx` | 統計テーブル |
| `src/components/shared/Button.tsx` | 汎用ボタン |
| `src/components/shared/Input.tsx` | 汎用テキスト入力 |
| `src/components/shared/Select.tsx` | 汎用セレクトボックス |

### 実装順序

1. shared コンポーネント（Button, Input, Select）
2. Header（タイトルのみ、ファイル操作は Phase 6）
3. HazardLevelInput → キケン度変更の動作確認
4. StatisticsPanel + DirectionStatsTable
5. MemoSection 内の各コンポーネント
6. DisplayModeToggle
7. SettingsPanel の折りたたみ

### 完了条件

- キケン度を変更すると方面区間数が変わり、タイムラインと統計が連動更新される
- ブキ・SP選択が動作し、アイコンが表示される
- 統計テーブルが撃破点の追加・削除に連動して更新される
- 折りたたみの開閉が動作する

### 落とし穴

- **キケン度変更時のリセット**: 方面区間数が変わると既存の撃破点が不整合になる可能性がある。変更時は全撃破点を再検証し、不正なものを削除。ユーザーに通知（トースト等は Phase 7）
- **ブキ/SP セレクトの件数**: 70+ブキの長いリスト。仮想スクロールは不要だが、検索/フィルタの追加を検討（ただし MVP では不要）
- **DisplayMode**: `icon` モードのときラベルが空になるブキ/SP がないか確認

---

## Phase 6: ファイルI/O

### 目標

シナリオの JSON 保存・読み込みが動作する。

### 作成ファイル

| ファイル | 内容 |
|---------|------|
| `src/utils/fileIO.ts` | エクスポート/インポート関数 |

### 実装指示

- `exportScenario`: `ScenarioData` → `SaveData`（version, createdAt 付与）→ JSON文字列 → Blob → ダウンロード
- `importScenario`: File → JSON.parse → バリデーション → `ScenarioData`
- バリデーション項目:
  - `version` フィールドの存在と値チェック
  - `hazardLevel` が 20〜333 の範囲内
  - `defeats` の各要素が正しい型を持つ
  - `directions` の各要素が正しい型を持つ
  - インポート後に `calculateSpawns` + バリデーションを実行し、不整合がないことを確認

### 完了条件

- 「保存」ボタンでJSONファイルがダウンロードされる
- ダウンロードしたファイルを「読込」で復元し、同じ状態になる
- 不正なJSONを読み込んだ場合、エラーメッセージが表示される
- 旧バージョンとの互換性は初期リリースでは不要（version: 1 のみ対応）

### Header 更新

Phase 5 で仮実装した Header に保存・読込ボタンを追加。

### 落とし穴

- **ファイルダウンロード**: `URL.createObjectURL` で作成した URL は `URL.revokeObjectURL` で解放する
- **JSON.parse のエラーハンドリング**: try-catch で囲み、SyntaxError を捕捉
- **型ガード**: `importScenario` の戻り値は型が保証されない。ランタイムで各フィールドの存在と型をチェックする関数を実装
- **readonly 配列**: `SaveData` → `ScenarioData` の変換時、`readonly` の不一致に注意

---

## Phase 7: 仕上げ

### 目標

UI の磨き込み、エッジケースの修正、ビルド確認。

### 作業内容

1. **アニメーション追加**: 06_UI_DESIGN §9 に従い、マーカーの追加/削除、折りたたみ等にアニメーション
2. **トースト通知**: ファイル読込エラー、撃破点の連動削除等のフィードバック
3. **ホバー時の時刻表示**: タイムライン上のマウス位置に秒数フローティングラベル
5. **エッジケース修正**:
   - B枠なし（低キケン度）の場合のUI表示
   - 0秒付近の撃破点（湧き時刻がマイナスになるケース）
   - 方面名が空の場合のフォールバック表示
6. **ビルドと動作確認**:
   - `npm run build` → `npm run preview` で本番相当動作確認
   - base パス (`/grill-planner/`) での画像・データ読み込み確認
7. **GitHub Actions 設定**: `.github/workflows/deploy.yml` を 04_TECH_STACK §3.3 の通り作成
8. **README.md**: プロジェクト概要、使い方、開発方法を記述

### テスト（将来用の準備）

Vitest の導入は本フェーズで行うが、テストの網羅的な記述は将来の拡張とする。最低限以下のテストを作成:

- `calculations.test.ts`: `framesToSeconds`, `secondsToFrames`, `getHazardConfig`, `calculateSpawns` の基本ケース
- `validation.test.ts`: 02_GAME_MECHANICS §8.4 の例をテストケース化

```bash
npm install -D vitest
```

```typescript
// vite.config.ts に追加
export default defineConfig({
  // ...
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
```

### 完了条件

- 全機能が本番ビルドで動作する
- GitHub Pages にデプロイして正常動作する
- 基本的なテストが通る

---

## フェーズ間の依存関係

```
Phase 1 ── Phase 2 ── Phase 3 ── Phase 4 ── Phase 5 ── Phase 6 ── Phase 7
セットアップ   計算    状態管理   タイムライン  設定UI     ファイルIO   仕上げ
```

各フェーズは前のフェーズの完了を前提とする。ただし Phase 5（設定UI）の一部コンポーネント（Statistics）は Phase 4 完了後すぐに着手可能。

---

## 既知の落とし穴まとめ

| カテゴリ | 落とし穴 | 対策 |
|---------|---------|------|
| Tailwind v4 | `@tailwind` ディレクティブ廃止 | `@import "tailwindcss"` を使う |
| Tailwind v4 | config.js 廃止 | CSS内の `@theme` で設定 |
| Tailwind v4 | クラス名変更（shadow, rounded等） | v4 ドキュメント参照 |
| Vite | base パス | `import.meta.env.BASE_URL` を一貫使用 |
| Vite | パスエイリアス | tsconfig + vite.config 両方に設定 |
| 計算 | 時間軸の方向 | 大=過去、小=未来。比較演算子の向きに注意 |
| 計算 | 浮動小数点 | フレーム単位で計算、秒変換はUI表示時のみ |
| バリデーション | P0バグの再発 | 「現在のspawnsで判定」は絶対にしない |
| 統計 | 自動湧きのスポナー決定時刻 | `出現F + SPAWN_WAIT_FRAMES` |
| 統計 | ゲーム開始前のスポナー決定 | 最初の区間に分類 |
| UI | ドラッグとクリックの区別 | 移動距離5pxの閾値 |
| UI | ドラッグ中のイベント登録先 | window に登録 |
| UI | 座標変換の方向 | フレーム: 右→左、ピクセル: 左→右 |
| UI | 重なるマーカー | z-index で撃破点を前面に |
| ファイルIO | URL.createObjectURL | revokeObjectURL で解放 |
| ファイルIO | 型安全性 | ランタイム型ガード必須 |
