# Real-Time Collaborative Coding Platform

Rooms where several people edit the same code live, chat, run it in real sandboxes, and race
each other in **Battle Mode**.

**Stack:** React 19 + Vite + Tailwind 4 + Monaco · Node 20+/Express 5 · Socket.IO 4 · MySQL (Sequelize) ·
Firebase (Google sign-in) · Docker sandbox **or** Judge0 for code execution · Gemini for AI review.

```
CLIENT/   React app (Vite)                    -> static hosting (Vercel/Netlify/...)
SERVER/   Express API + Socket.IO             -> Node host or container (needs WebSockets)
  src/services/execution*   code execution (docker | judge0 providers)
  src/data/problems.js      Battle Mode test cases (server-side, hidden from players)
deploy/judge0/              Judge0 server for hosts that cannot run Docker sandboxes
deploy/vps/                 all-in-one single-VPS stack (web + API + MySQL + Docker sandboxes)
docs/                       DEPLOYMENT.md, AUDIT_REPORT.md
```

## Quick start (local)

Prerequisites: Node 20+ (22 recommended), MySQL 8 / MariaDB 10.6+, Docker (for code execution).

```bash
npm run install:all                       # root + SERVER + CLIENT

# 1. database (or use your own MySQL)
npm run db:up                             # docker compose, MySQL on 127.0.0.1:3306

# 2. configuration
cp SERVER/.env.example SERVER/.env        # set JWT_SECRET and the DB_* values (see comments inside)
cp CLIENT/.env.example CLIENT/.env        # add the VITE_FIREBASE_* values (see "Google sign-in")

# 3. code-execution images (one time) and a check that isolation really works
npm --prefix SERVER run pull-images
npm --prefix SERVER run smoke:exec

# 4. run
npm run dev                               # API on :5000, app on :5173
```

Tables are created automatically on start. Small schema upgrades are applied automatically too
(`rooms.code` column, duplicate-index cleanup) - nothing to run by hand.

### Google sign-in (optional)
Email/password works without any setup. For Google sign-in:
* **Frontend:** put your Firebase *web app* config in `CLIENT/.env` (`VITE_FIREBASE_*`). These were
  previously hard-coded in `src/firebase.js` - copy them from there if you have the old file.
* **Backend:** Firebase console -> Project settings -> Service accounts -> *Generate new private key*, then
  set `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`, **or** the whole JSON
  base64-encoded as `FIREBASE_SERVICE_ACCOUNT_B64`. The key file itself must never be committed.
* Add your deployed frontend domain under Authentication -> Settings -> *Authorized domains*.

## Environment variables

Full, commented lists: [`SERVER/.env.example`](SERVER/.env.example) and [`CLIENT/.env.example`](CLIENT/.env.example).

| Where | Variable | Required | Purpose |
|---|---|---|---|
| server | `JWT_SECRET` | yes | signs login tokens (>= 32 chars in production) |
| server | `CLIENT_URL` | prod | allowed frontend origin(s) for CORS + Socket.IO, comma separated, no trailing `/` |
| server | `DATABASE_URL` **or** `DB_HOST/DB_USER/DB_PASSWORD/DB_NAME` | yes | MySQL connection |
| server | `DB_SSL` (+ `DB_SSL_CA`) | hosted DB | TLS to the database (most hosted MySQL requires it) |
| server | `EXECUTION_PROVIDER` | yes | `docker` or `judge0` |
| server | `JUDGE0_URL`, `JUDGE0_AUTH_TOKEN` | if judge0 | your Judge0 server (HTTPS) and its token |
| server | `GEMINI_API_KEY`, `GEMINI_MODEL` | optional | AI code review |
| server | `FIREBASE_*` | optional | Google sign-in |
| client | `VITE_API_URL` | yes (build) | e.g. `https://api.example.com/api` |
| client | `VITE_SOCKET_URL` | usually | e.g. `https://api.example.com` (defaults from `VITE_API_URL`) |
| client | `VITE_FIREBASE_*` | optional (build) | Google sign-in |

## Code execution

Two interchangeable providers behind one interface (`SERVER/src/services/execution.service.js`):

| | `docker` | `judge0` |
|---|---|---|
| Runs code in | throw-away containers started on the Docker host | a separate Judge0 server |
| Use when | local development, or a VPS you control | the API runs on a PaaS (no Docker socket), or you want the sandbox on another machine |
| Languages | C, C++, Java, JavaScript, Python | same |

**Docker provider isolation (per run):** no network, read-only root filesystem, 64 MB tmpfs scratch,
non-root user, all Linux capabilities dropped, `no-new-privileges`, memory cap with swap disabled, 1 CPU,
PID limit (fork-bomb protection), file-size/open-file ulimits, per-test and compile timeouts, output cap,
hard kill + automatic cleanup (and a janitor for orphaned containers). Code and input travel in
environment variables (base64) - never inside a shell command.

Both providers return stdout, stderr, compile output, exit code and a status (`ok`, `compile_error`,
`runtime_error`, `time_limit`, `memory_limit`) from `POST /api/code/run`; the UI keeps showing a single
`output` text exactly as before.

Java: the public class must be named `Main`. A hint is shown if it is not.

> Docker sandboxes cannot run on hosts that do not give you a Docker socket (Render, Railway, Fly
> machines, Heroku, Vercel, Netlify ...). Use `EXECUTION_PROVIDER=judge0` there - see
> [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Battle Mode

* Anyone in the room can start a battle; everyone enters it and sees the **same problem** (navigating
  Previous/Next changes it for the whole room) with a shared server-side countdown (30 min by default).
* **Judging is done by the server** against hidden test cases (`SERVER/src/data/problems.js`). The browser
  sends only its code - not the expected output, not a user id. The first accepted submission wins; if two
  arrive at the same moment exactly one wins. The result is pushed to everyone and stored in the `battles`
  table (leaderboard: `GET /api/battles/leaderboard`).
* Programs read **stdin** and print to **stdout**. Each problem's panel now shows its exact input format.
  Convention: arrays on one line (space separated), scalars on their own line.
* Output matching ignores whitespace layout; `true/false` is case-insensitive; the median problem
  compares numerically (`2` = `2.0`).

## Tests

```bash
npm test                                   # SERVER unit tests (no external services needed)

# full-stack tests (HTTP + Socket.IO + MySQL) - create an empty database first:
TEST_DB_HOST=127.0.0.1 TEST_DB_USER=rtc TEST_DB_PASSWORD=... TEST_DB_NAME=rtc_test npm test
npm run lint && npm run build              # client
```
The integration tests **drop and recreate every table** in `TEST_DB_NAME` - use a scratch database.

## Security model (short)

* Every API route except signup/login/Google-login requires a valid JWT; Socket.IO requires it during the handshake.
* The user's identity always comes from the token, never from request bodies or socket payloads.
* Rate limits on auth, run, submit and AI endpoints; request/code/input size limits.
* Strict CORS allow-list, security headers (helmet), generic 500 messages in production.

## Known limitations

* **One server instance.** Live room state and battle state are in memory (code is also saved to the DB).
  Scaling to several instances needs the Socket.IO Redis adapter + sticky sessions.
* Live editing syncs the **whole document** (last write wins). Two people typing in the same instant can
  overwrite each other; remote updates also move the local cursor. Real concurrent editing needs a CRDT (e.g. Yjs).
* Chat history is not stored (it is live-only).
* Battles are 1-winner races; the DB records the winner and one opponent even if more people took part.
* Monaco loads its editor files from the jsDelivr CDN at runtime (the default of `@monaco-editor/react`).

See [docs/AUDIT_REPORT.md](docs/AUDIT_REPORT.md) for everything that was found and changed, and what was / was not tested.
