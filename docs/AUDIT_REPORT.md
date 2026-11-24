# Audit & repair report

Scope: the uploaded `Real_Time_Collaboration.zip` (React/Vite client, Express/Socket.IO/Sequelize server).
The UI design, layout, colours and features were preserved; changes to UI files are listed in section 2 and
are limited to what was needed to make features work.

## 0. Things you should know first

1. **Credentials were inside the ZIP** (`SERVER/.env`, `CLIENT/.env`, `SERVER/firebase-service-account.json`:
   database password, JWT secret, Gemini API key, Firebase service-account private key). They are **not** in the
   returned ZIP. Git history shows they were never committed (your `.gitignore` worked), so the only exposure is
   the ZIP itself. **Rotate them if that copy was shared anywhere**: Gemini key, Firebase service account, JWT
   secret (invalidates logins), DB password.
2. **Your last commit (`HEAD`) used PostgreSQL** (`pg`, SSL) - your working copy had been switched back to MySQL.
   Following your brief, the project is MySQL-only (`mysql2`, optional TLS for hosted MySQL). If your current
   hosted database is Postgres, you need a MySQL instance (or tell me and the Postgres option can be restored).
3. **Judge0 was dead code.** Execution used only Docker; `judge0.service.js` was imported nowhere and `JUDGE0_URL`
   was never read. It is now a real, selectable provider (`EXECUTION_PROVIDER=judge0`).
4. **There was no authentication on the API at all** (empty `middleware/` folder; JWTs were issued and never
   checked). Anyone could run code, spend your Gemini quota, close rooms and declare battle winners.
5. **Battle Mode could not work as written** and was trivially cheatable (details in 1.4).

## 1. Bugs found and fixed

### 1.1 Security
| # | Problem | Fix |
|---|---|---|
| 1 | No auth middleware: `/code/run`, `/ai/review`, `PATCH /rooms/:id/close`, `PATCH /battles/:id/complete`, stats, submissions all public | `requireAuth` (JWT, HS256 pinned) on every route except signup/login/Google |
| 2 | Socket.IO accepted any `userId`/`username` from the client; any socket could emit to any room | JWT checked in the socket handshake; identity from the token; every room event requires membership; chat/typing author is server-side |
| 3 | `createdBy`, `userId`, `winnerId` trusted from request bodies (impersonation) | taken from the token; bodies ignored |
| 4 | Plaintext passwords logged: server `console.log(req.body)` on signup, browser `console.log` on Signup page | removed |
| 5 | Emails and code of other users exposed via unauthenticated endpoints | authorization + `email` removed from room/member responses; other players' code hidden |
| 6 | Google login trusted unverified provider emails | requires `email_verified` |
| 7 | No rate limits, 5 MB body limit, unbounded code/input sizes, unbounded AI prompt | rate limits (auth/run/submit/AI), 1 MB body, 64 KB code/input, 30k-char AI limit |
| 8 | CORS: single exact origin; trailing slash in `CLIENT_URL` silently broke it | list + wildcard support, trailing slashes normalised, disallowed origins get no CORS headers |
| 9 | Internal error text (Docker paths, provider messages) returned to browsers | generic messages; details only in server log |
| 10 | AI JSON rendered unvalidated: an object in an array would white-screen the app | server normalises the review to the exact shape; `ErrorBoundary` added |
| 11 | Firebase web config hard-coded; `firebaseAdmin.js` crashed the whole server at import if env was missing | env-driven; Google login is simply disabled/503 when unconfigured |
| 12 | `CLIENT/.gitignore` contained a Tailwind config snippet (so `node_modules` was not ignored); empty `tailwind.config.js/` directory | proper ignore rules; stray directory removed |

### 1.2 Code execution (Docker path)
| # | Problem | Fix |
|---|---|---|
| 1 | Hard-coded Windows pipe `//./pipe/dockerDesktopLinuxEngine` - fails on any Linux/VPS | auto-detects (`DOCKER_SOCKET_PATH`, `DOCKER_HOST`, Windows pipe, `/var/run/docker.sock`) |
| 2 | **Compile errors produced empty output**: script used `set -e`, so the shell exited before it could print the compiler message | rewritten runner; compile result reported with full output |
| 3 | Compiler *warnings* were treated as failure and blocked execution | decided by compiler exit code |
| 4 | Raw Docker log stream parsed with `toString()`: 8-byte frame headers leak stray characters; stdout/stderr mixed | proper stream demultiplexing; separate stdout, stderr, exit code |
| 5 | C programs using `math.h` failed to link (no `-lm`) | `-lm` added |
| 6 | Isolation gaps: no PID limit (fork bomb), no CPU limit, swap allowed, capabilities kept, writable root FS, root user, unbounded output read into server memory | network none, read-only rootfs + tmpfs, non-root, `CapDrop ALL`, `no-new-privileges`, memory with swap off, 1 CPU, PID/ulimits, output cap that kills floods |
| 7 | Input passed in an env var as raw text | base64 env, never interpolated into a command |
| 8 | Images never pulled -> first run failed; `:latest` tags | pinned tags, background auto-pull, `npm run pull-images`, friendly "being prepared" message |
| 9 | No concurrency limit; timeouts returned HTTP 500 | queue with limits (429/503), timeouts reported as results (`time_limit`) |
| 10 | Leaked containers after crashes | cleanup in `finally` + start-up janitor |
| 11 | Judge0 service: infinite polling loop, no timeouts/auth | bounded polling, auth header support, limits, name-based language-id discovery |

### 1.3 Real-time / rooms / database
| # | Problem | Fix |
|---|---|---|
| 1 | After any network drop Socket.IO reconnects with a new socket, but the client never re-joined the room -> silently no sync/chat | `join-room` runs on every `connect` |
| 2 | Chat "unread"/banner logic read a stale `isChatOpen` (always false) | ref-based |
| 3 | Joining an empty room sent `receive-code ""` which overwrote the user's cached code; room code lived only in memory (lost on restart / last user leaving) | code persisted to `rooms.code` (debounced + on last leave + on shutdown) and restored; client keeps its local copy if the server has none |
| 4 | Same user in two tabs: one tab leaving removed them from the list and set `leftAt` | per-user tracking; `leftAt` only after the last tab leaves |
| 5 | Re-joining never cleared `leftAt` (`findOrCreate` defaults only apply on create) | cleared explicitly |
| 6 | Socket room name used the raw string while the DB match is case-insensitive -> `abc` and `ABC` would split a room | server normalises |
| 7 | Closed rooms could still be joined through the socket; join failures were silent | checked; `join-error` event + user is returned home |
| 8 | `joinRoom` controller existed but had no route | `POST /api/rooms/:roomCode/join` |
| 9 | `createRoom` checked duplicates before normalising the code; races returned 500 | normalise first, 409 on unique violation |
| 10 | `sync({alter:true})` on MySQL re-adds unique indexes at every restart (and `User.email` was declared unique twice) | plain `sync()` + idempotent migrations; duplicate indexes already in your dev DB are cleaned up |
| 11 | Possible `utf8` (3-byte) tables: emoji in submitted code fails to insert | `utf8mb4` for connection and tables |
| 12 | Typing indicator + full socket event logging on every keystroke (including full code in the console) | throttled; payload logging removed |
| 13 | Login for Google-only accounts returned HTTP 500 (`bcrypt.compare(pw, null)`) | 401 with a clear message |
| 14 | `getMySubmissions` looked users up by (non-unique) name; leaderboard did one query per battle | by token id; three aggregate queries |

### 1.4 Battle Mode
* The submit call hard-coded **one** test (`input "2 1 5 1 3 2\n3"`, expected `"9"`) and one problem index `0`
  regardless of what was displayed (the panel's selected problem was local state, never shared).
* Expected output and user id came **from the browser** -> any player could be "Accepted" by sending their own
  output as the expected output; winners were announced by the winner's own client over the socket.
* The `battles` table, leaderboard and stats were **never called by the UI** - no battle was ever stored.
* Only problem 1 had test cases; problems 2-15 had no tests and no defined input format.

Now: hidden server-side test cases for all 15 problems; the browser sends only code; the server identifies the
player from the token, judges (compile errors, runtime errors, timeouts and wrong answers are reported as such),
decides the winner atomically, pushes the result, and stores the battle. Everyone shares the same current
problem and a server-side timer; late joiners are synced; "End Battle" ends it for everyone.

**Please review (my decisions, not yours):** problems 2-15 had no test data, so I defined an input/output
format following problem 1's convention and wrote 3 tests each (verified against independent reference
solutions, `SERVER/test/problems.test.js`). The input format is now printed in each problem's example block - the
only visible text change. Edit `SERVER/src/data/problems.js` (+ the matching text) if you prefer other formats or add tests.

### 1.5 Deployment / configuration
* `localhost` fallbacks removed from production code; URLs come from env (`VITE_API_URL`, `VITE_SOCKET_URL`).
* Root scripts used `cd client`/`cd server` (folders are `CLIENT`/`SERVER`) - broken on Linux; fixed.
* Unused/misplaced dependencies removed (`firebase-admin` + `concurrently` in the client, `openai`/`axios`/`react-icons`
  at the root, deprecated `@google/generative-ai`, `tar-stream`). AI service migrated to `@google/genai`
  (already in your `package.json`, unused).
* Added: env validation with fail-fast messages, `/health`, graceful shutdown, DB retry/backoff, TLS options,
  `trust proxy`, SPA rewrites (`vercel.json`, `_redirects`), Dockerfile, compose files, Judge0 stack.
* Client: route guard (login required), unknown-URL redirect, 401 -> login, connection indicator
  ("Synced"/"Connected" were static text and are now truthful), duplicate `AIReview` (stale prop name) removed.
* `gemini-3.6-flash` was verified to be a real model id and kept as the default (now `GEMINI_MODEL`).

## 2. Files changed
**Modified (44):** `.gitignore`, `package.json`; `CLIENT/` - `.gitignore`, `package.json`, `src/App.jsx`, `src/firebase.js`,
`src/API/auth.api.js`, `src/Services/{socket,aiService}.js`, `src/Pages/Home/index.jsx`, `src/Pages/Login/index.jsx`,
`src/Pages/Signup/index.jsx`, `src/Pages/EditorPage/{EditorLogic,EditorLayout}.jsx`,
`src/Components/{CodeEditor,OutputPanel,ProblemPanel}.jsx`; `SERVER/` - `index.js`, `package.json`, `src/app.js`,
`src/config/{database,firebaseAdmin,socket}.js`, `src/controllers/*` (all 7), `src/routes/*` (all 7),
`src/models/{index,Room,user}.js`, `src/services/{ai,execution,judge0}.service.js`, `src/utils/languageMap.js`.

UI-visible modifications: `ProblemPanel.jsx` (shared problem selection + input-format text),
`EditorLayout.jsx` / `CodeEditor.jsx` (connection indicator, duplicate AI panel removed), `OutputPanel.jsx`
(lint only, no behaviour change). Styling, layout, colours and components are otherwise untouched.

**Added (42):** `README.md`, `docs/*`, `.dockerignore`, `.gitattributes`, `docker-compose.dev.yml`, `deploy/judge0/*`, `deploy/vps/*`;
`CLIENT/` - `.env.example`, `.env.development`, `vercel.json`, `public/_redirects`, `src/config.js`, `src/API/client.js`,
`src/Components/ErrorBoundary.jsx`; `SERVER/` - `.env.example`, `.dockerignore`, `Dockerfile`, `scripts/*` (2),
`src/config/env.js`, `src/data/problems.js`, `src/middleware/*` (2), `src/services/battle.service.js`,
`src/services/execution/*` (3), `src/utils/compare.js`, `test/*` (7 files).

**Removed:** `SERVER/.env`, `CLIENT/.env`, `SERVER/firebase-service-account.json` (secrets), empty `CLIENT/tailwind.config.js/` directory.
Line endings were normalised to LF (`.gitattributes`), so `git diff` will show whole-file changes for files you
had in CRLF - compare with "ignore whitespace/EOL".

## 3. What was tested (and how)

Run in a sandbox with Node 22, **MariaDB 10.11** (MySQL-compatible), gcc/g++ 13, Python 3.12, JDK 21:

* **68 server tests, all passing** (3 consecutive runs, no flakiness):
  * **Full stack over real HTTP + Socket.IO + MariaDB:** signup/login/validation, Google-only account, 503 when Firebase
    unconfigured, every protected route rejects anonymous callers, rooms (normalisation, duplicates, authorization),
    socket auth, join/user list/code sync/language/chat/typing, spoof & isolation attempts, multi-tab handling,
    `leftAt` handling, code persistence + restore, battle flow (judging, wrong/compile/runtime errors, forged
    client claims ignored, **concurrent submissions -> exactly one winner**, persistence, leaderboard, stats
    authorization, end-battle broadcast), schema migrations incl. cleanup of duplicate indexes, utf8mb4.
  * **Real execution** of the runner script with real gcc/g++/python/node/javac: compile once + several inputs,
    compile error captured, warnings don't block, `-lm`, stderr/exit-code, infinite loop killed, output truncation,
    program printing fake protocol frames, Java.
  * 15 problems' test data validated against independent reference solutions; server/client problem order checked.
  * Output comparator, Judge0 client (against a fake Judge0 HTTP server following its documented API: polling,
    base64, auth header, language-id discovery, error mapping), Docker provider (against a fake daemon
    emitting real multiplexed streams: hardening options, OOM, hard kill, output flood, missing image, daemon down).
* **Production boot of the real `index.js`** against MariaDB: fail-fast config errors, DB connect/sync, `/health`,
  CORS allow/deny (trailing slash + wildcard), security headers, clean 503 when no Docker daemon exists, graceful SIGTERM.
* **Client:** `eslint` clean, `vite build` succeeds, production bundle contains the production URLs and no app-level localhost;
  `npm ci --omit=dev` from the lockfile (what the Dockerfile runs) succeeds.

## 4. What could NOT be tested here

* **Real Docker execution and isolation.** No Docker daemon existed in the sandbox. The orchestration logic and the
  hardening options we send are tested against a fake daemon, and the script inside the container against real
  compilers - but not the real combination. **Run `npm --prefix SERVER run smoke:exec` on your Docker host**: it checks
  hello-world in all 5 languages, compile/runtime errors, infinite loop, output flood, memory bomb, fork bomb,
  blocked network, read-only filesystem, non-root user, leftover containers, and prints PASS/FAIL.
* **A real Judge0 instance** (needs a cgroup-v1 VM). The client is tested against a fake following the documented API;
  the compose/conf files are derived from the official v1.13.1 release. Verify with the same smoke script.
* **Building the Docker images / running the compose files**, and any hosting provider's dashboard steps.
* **The UI in a real browser** (no browser available): rendering, Monaco behaviour, two-browser editing, battle overlays,
  Google popup. The client was linted and built, and the *server side of every UI flow* is covered by tests that use the
  same events as the client, but nobody clicked through the screens.
* **Live Gemini and Firebase calls** (no keys/network): AI output normalisation is unit-tested with hostile shapes; the
  SDK import/constructor was verified; Google login was verified only up to the "not configured" path.
* Oracle MySQL 8 itself (MariaDB 10.11 was used; the SQL is standard Sequelize/MySQL dialect).

## 5. Remaining limitations
* Single server instance (in-memory live state); multi-instance needs Redis adapter + sticky sessions.
* Whole-document last-write-wins editing (no OT/CRDT); remote updates move the local cursor.
* Chat is not persisted. Battle DB rows record the winner plus one opponent.
* Java must use `public class Main`. Judge0 CE runs one compile per test case (Docker compiles once).
* Hidden-test oracle: a player can learn a failing test's index by submitting repeatedly (rate-limited). Fine for friendly
  battles, not for exams.
* A program in the Docker sandbox can write bytes to the runner's stdout (via `/proc`), which can at worst make *its own*
  result unparsable; it cannot learn hidden answers or change anyone else's result.
* Judge0 v1.13.1 needs cgroup v1 and a dedicated VM; it cannot run on typical PaaS.
