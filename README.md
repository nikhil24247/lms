# Enterprise LMS (ProPhish)

Monorepo for an enterprise Mobile Learning Management System with distinct Admin and Learner portals.

## Structure

- `apps/api` — NestJS API with Prisma + PostgreSQL + MinIO/S3 storage
- `apps/admin` — React admin portal at `/admin` (course builder, assignments, uploads, analytics)
- `apps/mobile` — Expo Router learner app (assigned feed, players, certificates)
- `packages/shared` — Shared types, enums, and Zod schemas

## Quick Start

```bash
npx pnpm@9.15.0 install
docker compose up -d
cd apps/api && npx prisma db push --accept-data-loss && npx ts-node prisma/seed.ts
cd ../.. && npx pnpm@9.15.0 dev
```

## Services

| Service | URL |
|---------|-----|
| API | http://localhost:3000 |
| Admin Portal | http://localhost:5173/admin/ |
| Learner Portal | http://localhost:5174/app/ |
| Mobile (Expo) | `npx pnpm --filter @lms/mobile dev` |
| MinIO Console | http://localhost:9001 |

## Demo Accounts

| Role | Email | Portal |
|------|-------|--------|
| LMS Admin | `admin@example.com` | Admin at `/admin` |
| Learner | `learner@example.com` | Mobile app (auto-login in dev) |

## Key Features

- **Chunked video upload** — MP4/MOV/AVI up to 1GB via multipart presigned URLs
- **Generic course builder** — Any topic, flexible module ordering (video, quiz, SCORM, PDF, rich text)
- **Training assignments** — Target users/departments/groups/all with due dates, passing scores, retries, reminders
- **Learner feed** — "Assigned to Me" ordered by due date and urgency
- **Compliance** — Audit log CSV export, analytics dashboard, policy acknowledgments

## API Highlights

- `POST /api/v1/admin/upload/presigned-url` — Initiate chunked video upload
- `GET/POST /api/v1/admin/courses` — Course builder CRUD
- `GET/POST /api/v1/admin/assignments` — Training assignment matrix
- `GET /api/v1/enrollments/assigned` — Learner assigned feed
