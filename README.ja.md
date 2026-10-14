# Syntheci Shipping

[English](README.md) | [Ελληνικά](README.el.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Español](README.es.md)

![Syntheci Shipping banner](assets/syntheci-readme-hero-banner.png)

海運チーム向けの海事オペレーション用ワークスペースです。Syntheci は航海・運航関連の書類を取り込み、引用付きの AI 検索で横断的に検索できるようにし、航海リスクを追跡し、書類の不足、ウォッチリスト、クレームパック、PDA/FDA チェック、支払いリスクに関するワークフロー自動化を実行します。

## ハッカソン

アテネの Panathēnea で開催された Florent Venture Partners Hackathon のために開発。100 組以上の応募から選ばれた 25 チームの 1 つとして参加し、決勝の上位 3 チームに進出しました。

## 技術スタック

- **Web:** Next.js App Router、React、Tailwind CSS
- **認証:** Better Auth
- **ジョブ:** BullMQ、Redis
- **データベース:** Postgres 16、pgvector、Drizzle ORM
- **ストレージ:** MinIO / S3 互換ストレージ
- **AI:** Vercel AI SDK 経由の Google embeddings と Groq chat
- **ツール:** pnpm workspaces、TypeScript、Vitest

## リポジトリ構成

```text
apps/
  web/          Next.js アプリ、API ルート、ワークスペース UI
  worker/       BullMQ の取り込み・自動化プロセッサ

packages/
  ai/           モデルラッパー、チャンク分割、引用、抽出ヘルパー
  db/           スキーマ、マイグレーション、検索、シードヘルパー
  shared/       環境変数、キュー契約、バリデーション、ワークフローロジック

demo-data/      Aegean Meridian Shipping の合成海事データセット
```

## セットアップ

必要なもの:

- Node.js 20+
- pnpm 10.33.4+
- Docker Desktop

環境ファイルを作成します:

```bash
cp .env.example .env
```

デフォルトのローカルサービス:

```text
DATABASE_URL=postgres://syntheci:syntheci@localhost:5432/syntheci
REDIS_URL=redis://localhost:6379
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=sources
BETTER_AUTH_URL=http://localhost:3000
```

任意の AI キー:

```text
GOOGLE_GENERATIVE_AI_API_KEY=
GROQ_API_KEY=
```

ローカルで実行:

```bash
pnpm install
pnpm docker:infra
pnpm db:migrate
pnpm dev
```

`http://localhost:3000` を開きます。

## デモデータ

`demo-data/` には、取り込み、検索、航海ビュー、自動化をテストするための合成海事データセットが含まれています。

## コマンド

```bash
pnpm dev             # web と worker を実行
pnpm build           # パッケージをビルド
pnpm test            # テストを実行
pnpm db:migrate      # マイグレーションを適用
pnpm docker:infra    # Postgres、Redis、MinIO、worker を起動
pnpm docker:down     # Docker サービスを停止
```

## 作者

- [Socrates Omiliadis](https://www.linkedin.com/in/socratesomiliadis/)
- [Apostolos Kakarantzas](https://www.linkedin.com/in/akakarantzas/)
