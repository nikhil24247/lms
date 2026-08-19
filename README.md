# ProLMS

Simple Learning Management System for compliance / awareness training.

**This repo:** https://github.com/nikhil24247/lms

Everyone runs the app **on their own computer**. You do not need anyone else’s Wi‑Fi.

---

## Quick start (do this first)

### What you need installed

1. **Node.js 20+** — https://nodejs.org  
2. **Docker Desktop** — https://www.docker.com/products/docker-desktop/ (must be **running**)  
3. Git

### Step 1 — Clone

```bash
git clone https://github.com/nikhil24247/lms.git
cd lms
```

### Step 2 — Setup (one command)

```bash
bash scripts/setup.sh
```

This will:

- install packages  
- start Postgres + MinIO (Docker)  
- create env files  
- create database tables  
- load demo users and sample training  

Wait until it prints **Setup complete**.

### Step 3 — Start the apps

```bash
npx pnpm@9.15.0 dev
```

Leave this terminal open.

### Step 4 — Open in your browser

| App | Link | Login email |
|-----|------|-------------|
| **Admin** (create / assign training) | http://localhost:5173/admin/ | `admin@example.com` |
| **Learner** (take training) | http://localhost:5174/app/ | `learner@example.com` |
| API (backend) | http://localhost:3000 | — |

**Password:** none — type the email and sign in.

---

## How to try the product (5 minutes)

### As admin

1. Open http://localhost:5173/admin/  
2. Sign in with `admin@example.com`  
3. Browse **Courses / Trainings**, **Users**, **Assignments**, **Reports**

### As learner

1. Open http://localhost:5174/app/  
2. Sign in with `learner@example.com`  
3. Open an assigned training (e.g. cybersecurity awareness)  
4. Watch video / take quiz  

### Mobile app (optional)

```bash
npx pnpm --filter @lms/mobile dev
```

- Use **Expo Go** on your phone, or a simulator.  
- For a **real phone**, phone and your laptop must be on the **same Wi‑Fi**, and set your laptop’s IP in `apps/mobile/.env` (see below).

---

## Project map (what is where)

```
lms/
├── apps/
│   ├── api/        ← Backend API (NestJS) — port 3000
│   ├── admin/      ← Admin website — port 5173
│   ├── learner/    ← Learner website — port 5174
│   └── mobile/     ← Phone app (Expo)
├── packages/shared ← Shared types
├── scripts/setup.sh
├── docker-compose.yml
└── README.md       ← you are reading this
```

| Who | Use this app |
|-----|----------------|
| Training manager | Admin |
| Employee / learner | Learner web (or Mobile) |
| Developer | All of the above |

---

## Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@example.com` | _(none)_ |
| Learner | `learner@example.com` | _(none)_ |

---

## Useful commands

| When | Command |
|------|---------|
| First time on a PC | `bash scripts/setup.sh` |
| Start websites + API | `npx pnpm@9.15.0 dev` |
| Start mobile only | `npx pnpm --filter @lms/mobile dev` |
| DB / MinIO stopped | `docker compose up -d` |
| Re-load demo data | `npx pnpm --filter @lms/api db:seed` |

---

## Access checklist

After `dev` is running, these should work **on the same computer**:

- [ ] http://localhost:5173/admin/ opens Admin login  
- [ ] http://localhost:5174/app/ opens Learner login  
- [ ] Login with the emails above works  
- [ ] Learner can see assigned training  

If something fails, see **Troubleshooting** below.

---

## Mobile on a real phone (optional)

Your phone must talk to **your** laptop (not someone else’s).

1. Find your laptop Wi‑Fi IP  
   - Mac: `ipconfig getifaddr en0`  
   - Windows: `ipconfig` → IPv4 Address  
2. Edit `apps/mobile/.env`:

```env
EXPO_PUBLIC_API_URL=http://YOUR_LAPTOP_IP:3000
```

3. Edit `apps/api/.env`:

```env
S3_PUBLIC_URL=http://YOUR_LAPTOP_IP:9000/lms-uploads
```

4. Restart API and Expo, then open the project in Expo Go.

---

## Troubleshooting

| Problem | Fix |
|-------|-----|
| `docker` errors | Open **Docker Desktop**, wait until it is running, then run setup again |
| Port already in use | Stop other apps using 3000 / 5173 / 5174, or restart the terminal |
| Login fails | Use exactly `admin@example.com` or `learner@example.com` (no password) |
| Blank / old data | Run `bash scripts/setup.sh` again |
| Video won’t play on phone | Set LAN IP in `apps/mobile/.env` and `S3_PUBLIC_URL` (see Mobile section) |
| Can’t open GitHub repo | Ask the owner to **invite you as Collaborator** or make the repo **public** |

---

## For the repo owner — how to share this GitHub repo

1. Go to https://github.com/nikhil24247/lms  
2. **Settings → Collaborators → Add people** (their GitHub username/email)  
   **or** **Settings → Change visibility → Make public**  
3. Send them this README link and say:

> Clone the repo, run `bash scripts/setup.sh`, then `npx pnpm@9.15.0 dev`, then open the Admin / Learner links above.

---

## Note about the internet

This project is meant to run **locally** for demos.  
It is **not** a public website URL yet. To host it online for everyone without cloning, you need cloud deployment later (API + database + storage).

---

## Simple product flow

1. Admin creates / publishes training  
2. Admin assigns it to learners  
3. Learner opens training → video / quiz / SCORM  
4. Progress, points, badges, certificates update automatically  
