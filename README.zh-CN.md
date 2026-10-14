# Syntheci Shipping

[English](README.md) | [Ελληνικά](README.el.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Español](README.es.md)

面向航运团队的海事运营工作空间。Syntheci 可摄取航次与运营文档,通过带引用的 AI 检索使其可被搜索,跟踪航次风险,并为缺失文档、关注列表、索赔资料包、PDA/FDA 核查和付款风险运行工作流自动化。

## 黑客松

<p align="center">
  <img src="assets/syntheci-readme-hero-banner.png" alt="Syntheci — Florent × Panathēnea Hackathon" width="100%">
</p>

为雅典 Panathēnea 举办的 Florent Venture Partners Hackathon 而构建;从 100 多个申请团队中脱颖而出,入选 25 支获准参赛团队之一,并晋级前 3 名决赛阶段。

## 技术栈

- **Web:** Next.js App Router、React、Tailwind CSS
- **认证:** Better Auth
- **任务:** BullMQ、Redis
- **数据库:** Postgres 16、pgvector、Drizzle ORM
- **存储:** MinIO / 兼容 S3 的存储
- **AI:** 通过 Vercel AI SDK 使用 Google embeddings 与 Groq chat
- **工具链:** pnpm workspaces、TypeScript、Vitest

## 仓库结构

```text
apps/
  web/          Next.js 应用、API 路由、工作空间 UI
  worker/       BullMQ 摄取与自动化处理器

packages/
  ai/           模型封装、分块、引用、提取辅助工具
  db/           schema、迁移、检索、种子数据辅助工具
  shared/       环境变量、队列契约、校验、工作流逻辑

demo-data/      Aegean Meridian Shipping 的合成海事数据集
```

## 安装与设置

环境要求:

- Node.js 20+
- pnpm 10.33.4+
- Docker Desktop

创建环境文件:

```bash
cp .env.example .env
```

默认本地服务:

```text
DATABASE_URL=postgres://syntheci:syntheci@localhost:5432/syntheci
REDIS_URL=redis://localhost:6379
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=sources
BETTER_AUTH_URL=http://localhost:3000
```

可选的 AI 密钥:

```text
GOOGLE_GENERATIVE_AI_API_KEY=
GROQ_API_KEY=
```

本地运行:

```bash
pnpm install
pnpm docker:infra
pnpm db:migrate
pnpm dev
```

打开 `http://localhost:3000`。

## 演示数据

`demo-data/` 包含一个合成海事数据集,用于测试摄取、搜索、航次视图和自动化。

## 命令

```bash
pnpm dev             # 同时运行 web 与 worker
pnpm build           # 构建各软件包
pnpm test            # 运行测试
pnpm db:migrate      # 应用数据库迁移
pnpm docker:infra    # 启动 Postgres、Redis、MinIO 和 worker
pnpm docker:down     # 停止 Docker 服务
```

## 作者

- [Socrates Omiliadis](https://www.linkedin.com/in/socratesomiliadis/)
- [Apostolos Kakarantzas](https://www.linkedin.com/in/akakarantzas/)
