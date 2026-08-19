# ProLMS — Learning Management System

Simple enterprise LMS for compliance and awareness training.

**Share this project:** [https://github.com/nikhil24247/lms](https://github.com/nikhil24247/lms)

Local copy on this Mac: `/Users/nikhiljayakar/Downloads/ProPhish`

---

## What you get

| App | Folder | Who uses it | URL |
|-----|--------|-------------|-----|
| **API** | `apps/api` | Backend for everyone | http://localhost:3000 |
| **Admin** | `apps/admin` | Training managers | http://localhost:5173/admin/ |
| **Learner web** | `apps/learner` | Employees in browser | http://localhost:5174/app/ |
| **Mobile** | `apps/mobile` | Employees on phone (Expo) | Expo Go / Metro `:8081` |
| **Shared types** | `packages/shared` | Used by all apps | — |

```
ProPhish/
├── apps/
│   ├── api/        ← NestJS + Prisma + Postgres
│   ├── admin/      ← Create courses, assign, reports
│   ├── learner/    ← Browser learner portal
│   └── mobile/     ← Phone app (main learner UX)
├── packages/shared
├── docker-compose.yml   ← Postgres + MinIO
└── README.md           ← you are here
```

---

## How learning works (one sentence)

Admin creates a training → assigns people → learner opens it on **mobile** (or web) → watches video / quiz / SCORM → gets points, badges, certificate.

---

## Demo logins

| Email | Use in |
|-------|--------|
| `admin@example.com` | Admin portal |
| `learner@example.com` | Mobile + learner web |

No password — email only (demo JWT).

---

## Run on a new machine (5 steps)

**Need:** Node 20+, Docker Desktop, pnpm 9.

```bash
# 1. Clone
git clone https://github.com/nikhil24247/lms.git
cd lms

# 2. Install
npx pnpm@9.15.0 install

# 3. Env for API + start database/storage
cp .env.example apps/api/.env
docker compose up -d

# 4. Database schema + demo data
cd apps/api
npx prisma db push
npx ts-node prisma/seed.ts
cd ../..

# 5. Start everything
npx pnpm@9.15.0 dev
```

Then open:

- Admin → http://localhost:5173/admin/ → `admin@example.com`
- Learner web → http://localhost:5174/app/ → `learner@example.com`
- Mobile → from `apps/mobile`: `npx pnpm --filter @lms/mobile dev` → Expo Go on phone

### Phone API URL

Edit `apps/mobile/.env`:

```
EXPO_PUBLIC_API_URL=http://YOUR_MAC_LAN_IP:3000
```

Phone and Mac must be on the same Wi‑Fi. Example: `http://192.168.1.112:3000`

**Videos on phone:** MinIO media must also be reachable. In `apps/api/.env` set:

```
S3_PUBLIC_URL=http://YOUR_MAC_LAN_IP:9000/lms-uploads
```

Keep `S3_ENDPOINT=http://localhost:9000` (API talks to MinIO on the Mac). Restart the API after changing it. The mobile app also rewrites `localhost` media URLs to your Mac IP automatically.

---

## Mobile tabs (what the user sees)

1. **Home** — welcome, points, assigned trainings, mini leaderboard  
2. **Trainings** — list: title, status, score, due/expiry  
3. **Leaderboard** — ranks by total points  
4. **Rewards** — points, streak, badges  
5. **Profile** — profile + link to certificates  

Open a training → steps (video / quiz / SCORM / PDF) → progress saved to API.

---

## Git status

Yes — this Mac pushes to GitHub automatically after substantive changes.

- Remote: `https://github.com/nikhil24247/lms.git`
- Branch: `main`
- Latest work includes mobile Home/Trainings simplify + training player polish

To confirm yourself:

```bash
cd /Users/nikhiljayakar/Downloads/ProPhish
git status          # should say "up to date with origin/main"
git log -3 --oneline
```

To share with someone: send them the GitHub link above. They clone and follow **Run on a new machine**.

If the repo is **private**, invite them as a collaborator on GitHub (Settings → Collaborators), or make the repo public temporarily.

---

## Useful commands

| Command | What it does |
|---------|----------------|
| `docker compose up -d` | Postgres `:5433` + MinIO `:9000` |
| `npx pnpm@9.15.0 dev` | API + admin + learner |
| `npx pnpm --filter @lms/mobile dev` | Expo mobile |
| `npx pnpm --filter @lms/api db:seed` | Re-seed demo users/courses |

---

## Design choice (keep it simple)

- **Do not rewrite** Nest/admin for demos — they already work.  
- **Show** the mobile learner app first; use admin only to assign content.  
- Shared logic lives in `apps/api`; UIs only call REST.
