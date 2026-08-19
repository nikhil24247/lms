# ProLMS — Learning Management System

Clone → setup → run. Each person runs the full stack **on their own computer**.  
You do **not** need the author’s Wi‑Fi or phone network.

**GitHub:** [https://github.com/nikhil24247/lms](https://github.com/nikhil24247/lms)

---

## Share with a colleague (2 minutes of instructions)

1. Invite them on GitHub (repo → **Settings → Collaborators**), or make the repo public.
2. They run:

```bash
git clone https://github.com/nikhil24247/lms.git
cd lms
bash scripts/setup.sh
npx pnpm@9.15.0 dev
```

3. They open on **their** machine:
   - Admin: http://localhost:5173/admin/ → `admin@example.com`
   - Learner: http://localhost:5174/app/ → `learner@example.com`

That’s it. Docker runs Postgres + file storage on their laptop. No connection to your network.

---

## What each folder is

| Folder | Role |
|--------|------|
| `apps/api` | Backend (NestJS + Postgres + MinIO) |
| `apps/admin` | Admin website |
| `apps/learner` | Learner website |
| `apps/mobile` | Phone app (Expo) — optional for demos |
| `packages/shared` | Shared types |
| `scripts/setup.sh` | One-shot install for a new machine |

---

## Demo logins

| Email | Where |
|-------|--------|
| `admin@example.com` | Admin |
| `learner@example.com` | Learner web / mobile |

No password (demo).

---

## Requirements

- Node 20+
- Docker Desktop running
- pnpm 9 (script uses `npx pnpm@9.15.0`)

---

## Everyday commands

| Command | Meaning |
|---------|--------|
| `bash scripts/setup.sh` | First time on a machine |
| `npx pnpm@9.15.0 dev` | API + admin + learner |
| `npx pnpm --filter @lms/mobile dev` | Expo mobile |
| `docker compose up -d` | Start DB + MinIO if stopped |

---

## Mobile on a real phone (optional)

Phone must reach **the same computer that runs the API** (colleague’s Wi‑Fi, not yours).

1. On that computer: `ipconfig getifaddr en0` (Mac) → e.g. `192.168.1.20`
2. `apps/mobile/.env` → `EXPO_PUBLIC_API_URL=http://192.168.1.20:3000`
3. `apps/api/.env` → `S3_PUBLIC_URL=http://192.168.1.20:9000/lms-uploads`
4. Restart API + Expo

The mobile app also rewrites `localhost` media URLs to that API host automatically.

---

## Internet hosting (later)

This repo is set up for **local demos**. Putting it on the public internet (so people open a URL without cloning) needs cloud hosting (API + DB + storage + builds). That’s a separate step — not required for sharing the code with a colleague.

---

## Flow (simple)

Admin creates/assigns training → learner opens it → video/quiz/SCORM → points & certificates.
