# VoltOps Monorepo

Turbo-repo with:
- `voltops/database`: PostgreSQL + TimescaleDB (Docker Compose)
- `voltops/api`: Python FastAPI
- `voltops/web`: React (Vite)

## Prerequisites
- Node.js 20+
- pnpm 9+
- Python 3.10+
- Docker + Docker Compose

## Install

```bash
pnpm install
```

## Run all dev services via Turbo

```bash
pnpm dev
```

## Run individual services

Database:
```bash
pnpm --filter @voltops/database db:up
pnpm --filter @voltops/database db:logs
pnpm --filter @voltops/database db:down
```

API:
```bash
cd voltops/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pnpm --filter @voltops/api dev
```

Web:
```bash
pnpm --filter @voltops/web dev
```
