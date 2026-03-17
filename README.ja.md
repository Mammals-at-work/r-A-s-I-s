<div align="center">

# r-A-s-I-s(rss & ia)

**AI搭載のスマートRSSアグリゲーター**

複数のニュースソースから記事を収集し、重複を排除し、スペイン語で要約を生成して、すぐに利用できる `rss.xml` フィードを公開します。

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[English](README.en.md) | [Español](README.md) | **日本語** | [Català](README.ca.md) | [Euskara](README.eu.md) | [Andaluz](README.an.md) | [Galego](README.gl.md)

</div>

---

## 仕組み

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  RSSソース    │────▶│  正規化      │────▶│  重複排除     │────▶│ AIキュレーション│
│  (BBC, NYT…) │     │  + コンテンツ │     │  バッチ +    │     │  要約 +      │
│              │     │  抽出        │     │  履歴        │     │  分類        │
└─────────────┘     └─────────────┘     └──────────────┘     └──────┬──────┘
                                                                     │
                    ┌─────────────┐     ┌──────────────┐             │
                    │  GET /rss.xml│◀────│  PostgreSQL  │◀────────────┘
                    │  GET /health │     │  永続化       │
                    └─────────────┘     └──────────────┘
```

1. **収集** — `src/config/sources.ts` に設定されたソースから記事を取得
2. **正規化** — HTMLコンテンツを抽出・サニタイズ。不十分な場合は元記事から補完
3. **重複排除** — 現在のバッチ内および過去の実行結果と照合（テキスト類似度ベース）
4. **AIキュレーション** — OpenAI互換APIを使用して、スペイン語の要約と最大4つのタグを生成
5. **配信** — `/rss.xml` でRSSフィードを、`/health` でヘルスチェックを提供

## 主な機能

- **リフレッシュジョブ** — 15分ごとに実行可能 (`npm run refresh`)
- **軽量HTTPサーバー** — `GET /health` と `GET /rss.xml`
- **PostgreSQL永続化** — 起動時にスキーマを自動生成
- **LLMプロバイダーの分離** — OpenAI、Anthropic、Ollamaなど、OpenAI互換APIに対応
- **AI不要のフォールバック** — APIキーがなくても抽出型の要約を生成し、配信を中断しない
- **スマート重複排除** — バッチ単位＋履歴ベースのテキスト類似度による判定
- **ソース重み付け** — フィードで優先度の高いソースを優先表示
- **Zodバリデーション** — 起動時にすべての設定を検証

## クイックスタート

```bash
# 1. クローンとインストール
git clone https://github.com/your-username/rssai.git
cd rssai
npm install

# 2. 環境変数を設定
cp .env.example .env   # 値を編集

# 3. テスト実行
npm test

# 4. 開発モードで起動
npm run dev             # ホットリロード付きサーバー

# 5. 別のターミナルでリフレッシュを実行
npm run refresh
```

## 環境変数

| 変数 | 説明 | デフォルト値 |
|---|---|---|
| `DATABASE_URL` | PostgreSQL接続文字列 | *（必須）* |
| `APP_BASE_URL` | サービスの公開URL | `http://localhost:3000` |
| `PORT` | HTTPサーバーのポート | `3000` |
| `FEED_TITLE` | RSSフィードのタイトル | `RSSAI` |
| `FEED_DESCRIPTION` | フィードの説明 | `Resumen automatizado de noticias` |
| `FEED_LANGUAGE` | フィードの言語 | `es` |
| `FEED_MAX_ITEMS` | フィード内の最大記事数 | `50` |
| `FETCH_TIMEOUT_MS` | ソースごとのフェッチタイムアウト（ms） | `10000` |
| `LLM_PROVIDER` | LLMプロバイダー | `openai-compatible` |
| `LLM_BASE_URL` | LLM APIのベースURL | `https://api.openai.com/v1` |
| `LLM_API_KEY` | LLMプロバイダーのAPIキー | *（オプション — 未設定時はフォールバック）* |
| `LLM_MODEL` | 使用するモデル | `gpt-4.1-mini` |

> `LLM_API_KEY` が設定されていない場合、AIを必要としない抽出型フォールバックを使用します。

## プロジェクト構成

```
src/
├── config/
│   ├── env.ts              # Zodによる環境変数バリデーション
│   └── sources.ts          # 設定済みRSSソース
├── db/
│   ├── database.ts         # PostgreSQL接続
│   └── repository.ts       # クエリとスキーマ
├── feeds/
│   ├── feed-fetcher.ts     # フィードのダウンロードとパース
│   └── article-extractor.ts # コンテンツの補完
├── llm/
│   ├── provider.ts         # LlmProviderインターフェース
│   ├── openai-compatible-provider.ts  # OpenAI実装
│   └── factory.ts          # プロバイダーファクトリー
├── rss/
│   └── render-rss.ts       # RSS XML生成
├── services/
│   └── curation-service.ts # パイプラインオーケストレーション
├── utils/
│   ├── dedupe.ts           # 類似度ベースの重複排除
│   ├── html.ts             # HTMLサニタイズ
│   └── text.ts             # テキストユーティリティ
├── app.ts                  # HTTPハンドラー
├── server.ts               # サーバーエントリーポイント
└── bin/
    └── refresh.ts          # リフレッシュスクリプト（cron）
```

## デプロイ

アーキテクチャは2つのプロセスで構成されます：

| プロセス | コマンド | 説明 |
|---|---|---|
| **Webサーバー** | `npm start` | `/rss.xml` と `/health` を配信 |
| **リフレッシュcron** | `npm run refresh` | 15分ごとに実行 |

両方とも同じデータベースと環境変数を共有します。

### Docker Composeの例

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: rssai
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data

  web:
    build: .
    command: npm start
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://postgres:secret@db:5432/rssai

  refresh:
    build: .
    command: npm run refresh
    # 外部cronまたはリスタートポリシーで実行
    environment:
      DATABASE_URL: postgres://postgres:secret@db:5432/rssai

volumes:
  pgdata:
```

## 利用可能なスクリプト

| スクリプト | 説明 |
|---|---|
| `npm run build` | TypeScriptを `dist/` にコンパイル |
| `npm run dev` | ホットリロード付き開発サーバー |
| `npm run refresh` | リフレッシュサイクルを実行 |
| `npm start` | 本番サーバー |
| `npm test` | Vitestでテストを実行 |

## コントリビュート

1. リポジトリをフォーク
2. ブランチを作成：`git checkout -b my-feature`
3. コミット：`git commit -m "Add my feature"`
4. プッシュ：`git push origin my-feature`
5. Pull Requestを作成

## ライセンス

このプロジェクトは [MIT](LICENSE) ライセンスの下で公開されています。
