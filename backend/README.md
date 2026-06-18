# Backend Service

Production-ready backend for the frontend app.

## Stack
- Node.js 20 + TypeScript
- Express API
- Prisma ORM
- PostgreSQL
- Zod validation

## Quick Start (Local)
1. Copy env: `cp .env.example .env` (or PowerShell: `Copy-Item .env.example .env`)
2. Install deps: `npm install`
3. Generate Prisma client: `npm run prisma:generate`
4. Push schema: `npx prisma db push`
5. Seed sample data: `npm run db:seed`
6. Start dev server: `npm run dev`

Server: `http://localhost:4000`
Health: `http://localhost:4000/api/health`

## API Base
All endpoints are under `/api`.

- `GET /api/health`
- `GET/POST /api/users`
- `GET /api/users/:id`
- `GET/POST /api/colleges`
- `GET /api/colleges/:id`
- `GET/POST /api/applications`
- `GET/POST /api/inquiries`
- `GET/POST /api/blog-posts`
- `GET/POST /api/interactions/chat-messages`
- `GET/POST /api/interactions/mock-exam-attempts`

## Deployment

### Docker
1. Create `.env` from `.env.example` and update `DATABASE_URL`.
2. Run: `docker compose up -d --build`
3. Optional seed: `docker compose exec backend npm run db:seed`

### Cloud (Railway/Render/Fly/etc.)
1. Provision PostgreSQL and set `DATABASE_URL`.
2. Build command: `npm install && npm run prisma:generate && npm run build`
3. Start command: `npx prisma db push && node dist/server.js`

## Notes
- `CORS_ORIGIN` supports comma-separated origins.
- Prisma `db push` is used for zero-friction deployment. If you need strict migration history, replace with Prisma migrations in CI/CD.
