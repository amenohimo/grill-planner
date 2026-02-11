# 04 技術スタック

---

## 1. 技術選定

| 技術 | バージョン | 用途 |
|------|-----------|------|
| React | 19.x (19.2.3+) | UIライブラリ |
| TypeScript | 5.9.x | 型安全性 |
| Vite | 7.x (7.3.1+) | ビルドツール |
| Tailwind CSS | 4.x (4.1+) | スタイリング |
| Vitest | 最新安定版 | テストフレームワーク（将来用） |
| GitHub Pages | — | ホスティング |

### 1.1 React 19.x

選定理由: 最新安定版。旧プロジェクト（React 18.3.1）からのアップグレード。

本プロジェクトで活用する変更点:

- **ref as prop**: `forwardRef` が不要に。コンポーネントが直接 `ref` を props として受け取れる
- **Actions API 安定化**: フォーム送信やデータ更新のパターンが改善（本プロジェクトでは限定的に使用）

本プロジェクトで使用しない機能:

- Server Components / Server Actions（静的サイトのため）
- `use()` フック（サーバーサイドデータ取得は不要）

### 1.2 TypeScript 5.9.x

選定理由: 最新安定版。TS 6/7（Go移植版）は 2026年予定だが未安定のため見送り。

設定方針:

- `strict: true` 必須
- `any` 型の使用禁止
- `noUncheckedIndexedAccess: true` 推奨

### 1.3 Vite 7.x

選定理由: 最新安定版。Vite 8（Rolldown搭載 beta）は未安定のため見送り。

前提条件:

- Node.js 20.19+ 必須
- ESM-only（CommonJS非対応）

### 1.4 Tailwind CSS 4.x

選定理由: 最新安定版。Rust製エンジンによるビルド高速化。

**重大な変更点**（旧 v3 との差異）:

#### CSS-first 設定

`tailwind.config.js` は廃止。設定はすべて CSS ファイル内で行う。

```css
/* src/index.css */
@import "tailwindcss";

/* カスタムテーマ設定は CSS 変数で定義 */
@theme {
  --color-primary: #3b82f6;
  --color-slot-a: #ef4444;
  --color-slot-b: #3b82f6;
}
```

#### Vite プラグイン

`@tailwindcss/vite` プラグインを使用する。PostCSS 経由の設定は不要。

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: '/grill-planner/',
});
```

#### クラス名の変更

v3 → v4 で一部ユーティリティクラス名が変更されている。主要なもの:

| v3 | v4 | 備考 |
|----|-----|------|
| `shadow` | `shadow-sm` | デフォルトシャドウにサイズ名が必要 |
| `rounded` | `rounded-sm` | デフォルト丸角にサイズ名が必要 |
| `blur` | `blur-sm` | デフォルトぼかしにサイズ名が必要 |
| `ring` | `ring-3` | デフォルトリングに幅指定が必要 |
| `outline-none` | `outline-hidden` | 名称変更 |

実装時は Tailwind v4 のドキュメントを参照すること。

#### その他の注意点

- Sass/Less/Stylus は非対応。Tailwind 自体がプリプロセッサの役割を果たす
- `@apply` は引き続き使用可能だが、CSS変数の直接使用が推奨される
- CSS Modules との併用は可能だが、本プロジェクトでは使用しない

### 1.5 Vitest

テストフレームワーク。実装フェーズ7（仕上げ）で導入予定。Vite との統合が最良のため選定。

---

## 2. プロジェクトセットアップ手順

### 2.1 プロジェクト作成

```bash
npm create vite@latest grill-planner -- --template react-ts
cd grill-planner
```

### 2.2 依存パッケージのインストール

```bash
# Tailwind CSS v4 + Vite プラグイン
npm install tailwindcss @tailwindcss/vite

# 型定義（必要に応じて）
npm install -D @types/react @types/react-dom
```

注意: Vite 7 のテンプレートは React 19 + TypeScript 5.9 を含む想定。バージョンが異なる場合は `package.json` を手動で調整する。

### 2.3 Vite 設定

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: '/grill-planner/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
```

`base: '/grill-planner/'` は GitHub Pages のリポジトリ名に合わせる。

### 2.4 TypeScript 設定

```json
// tsconfig.json (主要部分)
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

パスエイリアス `@/` を使用する場合、Vite 側にも `resolve.alias` の設定が必要:

```typescript
// vite.config.ts に追加
import path from 'path';

export default defineConfig({
  // ...
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 2.5 CSS エントリポイント

```css
/* src/index.css */
@import "tailwindcss";

@theme {
  /* プロジェクト固有のカスタムカラー等は 06_UI_DESIGN.md で定義 */
}
```

### 2.6 ディレクトリ構造（初期）

```
grill-planner/
├── public/
│   ├── data/
│   │   ├── weapon.json
│   │   ├── special.json
│   │   └── CoopLevelsConfig.json
│   ├── favicon.png          # ファビコン (192×192px)
│   └── img/
│       ├── weapon/       # ブキアイコン (0.png, 10.png, ...)
│       └── special/      # SPアイコン (20006.png, ...)
├── src/
│   ├── components/
│   ├── constants/
│   ├── hooks/
│   ├── types/
│   ├── utils/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── docs/                 # 設計書（本文書群）
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 3. ビルドとデプロイ

### 3.1 開発サーバー

```bash
npm run dev
# → http://localhost:5173/grill-planner/
```

### 3.2 プロダクションビルド

```bash
npm run build
npm run preview  # ローカルでビルド結果を確認
```

### 3.3 GitHub Pages デプロイ

GitHub Actions を使用した自動デプロイ。

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### 3.4 静的データの配置

`public/data/` に配置したJSONファイルはビルド時にそのまま `dist/data/` にコピーされる。

ランタイムでのフェッチ:

```typescript
// base パスを考慮
const basePath = import.meta.env.BASE_URL;
const response = await fetch(`${basePath}data/weapon.json`);
```

### 3.5 アイコン画像の配置

`public/img/weapon/` および `public/img/special/` に配置。ファイル名はデータのID値に一致させる。

```
public/img/weapon/0.png     → ボールドマーカー (Id: 0)
public/img/weapon/10.png    → わかばシューター (Id: 10)
public/img/special/20006.png → ナイスダマ (Id: 20006)
```

---

## 4. 開発環境

### 4.1 開発体制

本プロジェクトの実装は **Claude Code**（Anthropicのコマンドラインコーディングエージェント）が行う。

デバッグ・動作確認には **Playwright MCP** を使用し、Claude Code からブラウザ操作による自動テスト・目視確認を実施する。

### 4.2 ESLint

Vite テンプレートに含まれる ESLint 設定をベースに、以下を追加:

- `@typescript-eslint/no-explicit-any: error`
- `@typescript-eslint/no-unused-vars: error`

### 4.3 Prettier（任意）

コードフォーマッター。Claude Code の出力の一貫性を保つために推奨。

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100
}
```

---

## 5. バージョン固定方針

`package.json` ではメジャーバージョンを固定し、マイナー・パッチの更新は許容する。

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "typescript": "^5.9.0",
    "vite": "^7.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "@vitejs/plugin-react": "^4.0.0"
  }
}
```

`package-lock.json` をコミットし、CI/CD では `npm ci` を使用して再現性を確保する。
