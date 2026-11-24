# Deployment guide

> **Status of these instructions.** The application code, database layer, Socket.IO, CORS/production
> configuration and both execution providers' *logic* were tested (see `AUDIT_REPORT.md`). The provider-specific
> click-paths below, the Dockerfiles and the compose files in `deploy/` could **not** be executed in the
> environment this was prepared in (no Docker daemon, no hosting accounts). They follow each tool's
> documented behaviour; run the verification steps at the end of each section on your real setup.

## 1. Pick a topology

| | A. Split (recommended) | B. Single VPS |
|---|---|---|
| Frontend | static host (Vercel / Netlify / Cloudflare Pages) | served by Caddy on the VPS |
| API + Socket.IO | any Node host with WebSocket support (Render, Railway, Fly.io, a VPS ...) | container on the VPS |
| MySQL | hosted MySQL | container on the VPS |
| Code execution | **Judge0** on its own small VM (`EXECUTION_PROVIDER=judge0`) | Docker sandboxes on the same VPS (`docker`) **or** a separate Judge0 VM |
| Ops effort | more pieces, each simple | one machine, one `docker compose up` |

**Why Docker sandboxes cannot be used on a typical PaaS:** the `docker` provider starts containers through
the host's Docker socket. Render/Railway/Heroku/Vercel-style services do not expose one (and giving a web
app the Docker socket is root-equivalent on that host). On those platforms the API must call a *separate*
execution service - Judge0.

Vercel/Netlify serverless functions cannot host the API either: Socket.IO needs a long-lived server process.

## 2. Hosted MySQL (both topologies, unless you use B's bundled MySQL)

1. Create a MySQL 8 (or MariaDB 10.6+) database, e.g. `real_time_collab`, charset `utf8mb4`.
2. Create a user with all privileges on that database.
3. Note host, port, user, password. Most providers require TLS -> set `DB_SSL=true`. If the provider gives a
   CA certificate, set `DB_SSL_CA` to the PEM text (or its base64). Use `DB_SSL_REJECT_UNAUTHORIZED=false`
   only if the provider uses a self-signed certificate and does not give you the CA.
4. Either set `DATABASE_URL=mysql://user:pass@host:3306/real_time_collab` or the individual `DB_*` variables.

Tables and small schema upgrades are applied automatically on every start. No migration command exists or is needed.
The user needs `CREATE`, `ALTER`, `INDEX`, `DROP INDEX` rights (the start-up migrations use them).

## 3. Judge0 server (topology A)

Judge0 runs untrusted code, so it needs **its own Linux VM**.

Requirements (from the Judge0 v1.13.1 release notes/README):
* Linux x86-64 VM with Docker + Docker Compose; 2 vCPU / 2-4 GB RAM is a reasonable start.
* **cgroup v1.** Judge0 CE 1.13.1 does not work on a cgroup-v2-only host (submissions fail with *Internal Error*).
  Ubuntu 22.04 uses cgroup v2 by default; switch it:
  ```bash
  sudo nano /etc/default/grub        # GRUB_CMDLINE_LINUX="systemd.unified_cgroup_hierarchy=0"
  sudo update-grub && sudo reboot
  stat -fc %T /sys/fs/cgroup         # must print "tmpfs" (v1); "cgroup2fs" means still v2
  ```
  Ubuntu 20.04 is already cgroup v1. Distros that are v2-only (e.g. Amazon Linux 2023) need the same switch or a different distro.
* Use **v1.13.1 or newer** - older releases have critical sandbox-escape vulnerabilities.

Install (files are in `deploy/judge0/`):
```bash
cd deploy/judge0
cp judge0.conf.example judge0.conf      # replace every CHANGE_ME using: openssl rand -hex 32
cp .env.example .env                    # JUDGE0_DOMAIN=judge0.example.com  (DNS A record -> this VM)
docker compose up -d db redis && sleep 10 && docker compose up -d
curl -H "X-Auth-Token: <your AUTHN_TOKEN>" https://judge0.example.com/system_info   # JSON = working
```
Caddy obtains an HTTPS certificate automatically (ports 80/443 must be reachable). **Never expose Judge0
without `AUTHN_TOKEN`** - the official default is "no authentication", i.e. anyone could run code on your VM.
Optionally also restrict by IP with `ALLOW_IP` in `judge0.conf`.

Backend settings for it:
```
EXECUTION_PROVIDER=judge0
JUDGE0_URL=https://judge0.example.com
JUDGE0_AUTH_TOKEN=<the AUTHN_TOKEN>
```
Language ids are discovered from Judge0's `/languages` list (newest Python/Java/Node/GCC are picked
automatically); force one with e.g. `JUDGE0_LANG_PYTHON=92`.

Hosted Judge0 services (e.g. via an API marketplace) also work: set `JUDGE0_URL` to their endpoint and put their
required headers in `JUDGE0_EXTRA_HEADERS` as JSON. Check their rate limits and terms.

If Java fails but others work, raise `MAX_PROCESSES_AND_OR_THREADS` / `MAX_MEMORY_LIMIT` in `judge0.conf`.

**Verify** from any machine that has `SERVER/.env` pointing at it: `npm --prefix SERVER run smoke:exec`.

## 4. Backend (topology A)

Any host that runs Node 20+ (or Docker) and supports WebSockets.

| Setting | Value |
|---|---|
| Root / build context | `SERVER` |
| Build command | `npm ci` |
| Start command | `npm start` |
| Health check path | `/health` |
| Port | the platform's `PORT` (the server reads it and binds `0.0.0.0`) |
| Instances | **1** (live state is in memory) |

Or build the container from `SERVER/Dockerfile`.

Environment variables (minimum):
```
NODE_ENV=production
JWT_SECRET=<openssl rand -hex 32>
CLIENT_URL=https://your-frontend.example.com        # exact origin, no trailing slash
DATABASE_URL=mysql://...  (or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME)  + DB_SSL=true
EXECUTION_PROVIDER=judge0
JUDGE0_URL=https://judge0.example.com
JUDGE0_AUTH_TOKEN=...
# optional: GEMINI_API_KEY, FIREBASE_SERVICE_ACCOUNT_B64
```
`CLIENT_URL` accepts several origins separated by commas and `https://*.vercel.app`-style wildcards for
preview deployments. The server refuses to start in production if `JWT_SECRET`, the database or
`CLIENT_URL` are missing, and lists every problem at once.

Free tiers of many hosts put idle services to sleep: the first request after a pause is slow and live rooms
disconnect. Room code is saved to the database and restored, so nothing typed is lost, but use an always-on
plan for real use.

## 5. Frontend (topology A)

| Setting | Value |
|---|---|
| Root directory | `CLIENT` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Environment variables | `VITE_API_URL=https://your-backend.example.com/api`, `VITE_SOCKET_URL=https://your-backend.example.com`, `VITE_FIREBASE_*` |

`VITE_*` values are baked in at **build time** - change them -> redeploy. SPA fallback (so `/editor/ABC123`
survives a refresh) is included: `vercel.json` for Vercel, `public/_redirects` for Netlify/Cloudflare Pages.

Then add the frontend domain to Firebase -> Authentication -> Settings -> *Authorized domains*, and
(if you restrict the Firebase web API key by referrer) to that restriction.

## 6. Topology B - everything on one VPS

```bash
cd deploy/vps
cp .env.example .env     # DOMAIN, secrets, DOCKER_GID=$(getent group docker | cut -d: -f3)
docker compose up -d --build
docker compose exec server npm run pull-images
docker compose exec server npm run smoke:exec
```
Point the domain's A record at the VPS before the first start so Caddy can issue the certificate.
Security trade-off: the API container receives the host Docker socket. If you cannot accept that, run Judge0 on a
second VM (section 3) and set `EXECUTION_PROVIDER=judge0` for the server service.

## 7. End-to-end verification checklist

1. `GET https://<backend>/health` -> `{"status":"ok","db":"up"}`.
2. Open the frontend, sign up, log in.
3. Create a room; open the Room ID in a second browser/incognito window: both appear in the user list; typing
   syncs; chat works.
4. Write `print("hi")` in Python, **Run** -> `hi`. Try a compile error in C++ -> the compiler message appears.
5. Start a battle with two users, submit a correct solution from one -> that user sees "You Won", the other "You Lost".
6. In browser dev tools -> Network: WebSocket connection to the backend, no CORS errors.

## 8. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Browser: "blocked by CORS policy" | `CLIENT_URL` does not exactly match the page origin (scheme + host, no path, no trailing `/`). |
| Socket "AUTH_INVALID" / kicked to login | `JWT_SECRET` changed or token expired -> log in again. |
| Run returns 503 "temporarily unavailable" (docker) | Docker not reachable from the API; check the socket mount/permissions (`DOCKER_GID`), run `npm run pull-images`. |
| Run returns 503 (judge0) | Wrong `JUDGE0_URL`/token (see server log), Judge0 down, or host is cgroup v2 ("Internal Error"). |
| First run of a language says "being prepared" | The image is still downloading; retry shortly or run `npm run pull-images`. |
| Google sign-in popup fails | Missing `VITE_FIREBASE_*` at build time, or domain not in Firebase *Authorized domains*. |
| DB connection errors with hosted MySQL | Set `DB_SSL=true`; allow the backend's IP in the provider's firewall. |
| Everything works locally, `localhost` appears in production | `VITE_API_URL` was not set when the frontend was *built*. |
