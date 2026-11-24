// Full-stack test: real HTTP + Socket.IO + MySQL-compatible DB.
// Requires TEST_DB_HOST / TEST_DB_USER / TEST_DB_PASSWORD / TEST_DB_NAME (skipped otherwise).
const SKIP = !process.env.TEST_DB_NAME;
Object.assign(process.env, {
  NODE_ENV: "test",
  JWT_SECRET: "t".repeat(48),
  DB_HOST: process.env.TEST_DB_HOST || "127.0.0.1",
  DB_PORT: process.env.TEST_DB_PORT || "3306",
  DB_USER: process.env.TEST_DB_USER || "",
  DB_PASSWORD: process.env.TEST_DB_PASSWORD || "",
  DB_NAME: process.env.TEST_DB_NAME || "",
  CLIENT_URL: "http://localhost:5173",
  EXEC_RUN_TIMEOUT_SEC: "5",
  BATTLE_DURATION_SECONDS: "1800",
});

const test = require("node:test");
const assert = require("node:assert");
const http = require("http");
const { io: ioc } = require("socket.io-client");

const describe = SKIP ? test.describe.skip : test.describe;

describe("full stack (MySQL-compatible DB)", () => {
  let server, base, sequelize, models, flushAll;
  const sockets = [];

  test.before(async () => {
    const app = require("../src/app");
    ({ sequelize } = require("../src/config/database"));
    models = require("../src/models");
    const { initSocket, flushAll: fa } = require("../src/config/socket");
    flushAll = fa;
    require("../src/services/execution.service")._setProvider(require("./helpers/localProvider"));
    await sequelize.authenticate();
    await sequelize.drop();
    await models.syncDB();
    server = http.createServer(app);
    initSocket(server);
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${server.address().port}`;
  });

  test.after(async () => {
    sockets.forEach((s) => s.close());
    await flushAll();
    server.close();
    await sequelize.close();
  });

  const api = async (method, path, { token, body } = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body && !['GET', 'HEAD'].includes(method) ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, data: await res.json().catch(() => ({})) };
  };

  const connect = (token) =>
    new Promise((resolve, reject) => {
      const s = ioc(base, { auth: { token }, transports: ["websocket"], reconnection: false, forceNew: true });
      sockets.push(s);
      s.on("connect", () => resolve(s));
      s.on("connect_error", (e) => reject(e));
    });
  const once = (s, ev, ms = 4000) =>
    new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`timeout waiting for ${ev}`)), ms);
      s.once(ev, (d) => { clearTimeout(t); resolve(d); });
    });
  const quiet = (s, ev, ms = 400) =>
    new Promise((resolve, reject) => {
      const h = () => reject(new Error(`unexpected ${ev}`));
      s.once(ev, h);
      setTimeout(() => { s.off(ev, h); resolve(); }, ms);
    });
  const join = (s, roomId, username) => new Promise((r) => s.emit("join-room", { roomId, username }, r));

  let A, B, C;
  const mk = async (name) => {
    const r = await api("POST", "/api/auth/signup", { body: { name, email: `${name.toLowerCase()}@example.com`, password: "secret12" } });
    assert.strictEqual(r.status, 201, JSON.stringify(r.data));
    return { token: r.data.token, user: r.data.user };
  };

  // ------------------------------------------------------------------ auth
  test("signup / login / validation", async () => {
    A = await mk("Alice"); B = await mk("Bobby"); C = await mk("Carol");
    assert.ok(!("password" in A.user));
    assert.strictEqual((await api("POST", "/api/auth/signup", { body: { name: "X", email: "bad", password: "123" } })).status, 400);
    assert.strictEqual((await api("POST", "/api/auth/signup", { body: { name: "Alice", email: "ALICE@example.com", password: "secret12" } })).status, 409);
    assert.strictEqual((await api("POST", "/api/auth/login", { body: { email: "alice@example.com", password: "secret12" } })).status, 200);
    assert.strictEqual((await api("POST", "/api/auth/login", { body: { email: "alice@example.com", password: "nope" } })).status, 401);
    assert.strictEqual((await api("POST", "/api/auth/login", { body: { email: "ghost@example.com", password: "nope1234" } })).status, 401);
  });

  test("Google-only account logging in with a password gets 401, not 500", async () => {
    await models.User.create({ name: "Gina", email: "gina@example.com", password: null });
    const r = await api("POST", "/api/auth/login", { body: { email: "gina@example.com", password: "whatever1" } });
    assert.strictEqual(r.status, 401);
    assert.match(r.data.message, /Google/);
  });

  test("Google login returns 503 (not a crash) when Firebase is not configured", async () => {
    assert.strictEqual((await api("POST", "/api/auth/firebase", { body: { token: "x" } })).status, 503);
  });

  test("every protected endpoint rejects anonymous callers", async () => {
    for (const [m, p] of [["POST", "/api/code/run"], ["POST", "/api/code/submit"], ["POST", "/api/ai/review"], ["POST", "/api/rooms"],
      ["GET", "/api/rooms/ABC123"], ["PATCH", "/api/rooms/ABC123/close"], ["PATCH", "/api/battles/1/complete"], ["GET", "/api/battles/leaderboard"],
      ["GET", "/api/users/1/stats"], ["GET", "/api/submissions/1"]])
      assert.strictEqual((await api(m, p, { body: {} })).status, 401, `${m} ${p}`);
    assert.strictEqual((await api("GET", "/api/rooms/ABC123", { token: "garbage" })).status, 401);
  });

  test("health + 404 + bad JSON", async () => {
    assert.strictEqual((await api("GET", "/health")).data.db, "up");
    assert.strictEqual((await api("GET", "/nope")).status, 404);
    const r = await fetch(base + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{bad" });
    assert.strictEqual(r.status, 400);
  });

  // ------------------------------------------------------------------ rooms
  test("rooms: normalisation, duplicates, authorization", async () => {
    const r = await api("POST", "/api/rooms", { token: A.token, body: { roomCode: " ab12cd ", language: "python", createdBy: B.user.id } });
    assert.strictEqual(r.status, 201);
    assert.strictEqual(r.data.room.roomCode, "AB12CD");
    assert.strictEqual(r.data.room.createdBy, A.user.id, "createdBy from the body must be ignored");
    assert.strictEqual((await api("POST", "/api/rooms", { token: B.token, body: { roomCode: "ab12cd" } })).status, 409);
    assert.strictEqual((await api("POST", "/api/rooms", { token: B.token, body: { roomCode: "x" } })).status, 400);
    assert.strictEqual((await api("POST", "/api/rooms", { token: B.token, body: { roomCode: "ZZZ999", language: "cobol" } })).status, 400);
    const d = await api("GET", "/api/rooms/ab12cd", { token: B.token });
    assert.strictEqual(d.status, 200);
    assert.ok(!("email" in d.data.room.creator), "creator email must not leak");
    assert.strictEqual((await api("GET", "/api/rooms/AB12CD/members", { token: C.token })).status, 403);
    assert.strictEqual((await api("POST", "/api/rooms/AB12CD/join", { token: B.token })).status, 201);
    assert.strictEqual((await api("POST", "/api/rooms/AB12CD/join", { token: B.token })).status, 200);
    assert.strictEqual((await api("GET", "/api/rooms/AB12CD/members", { token: B.token })).status, 200);
    assert.strictEqual((await api("PATCH", "/api/rooms/AB12CD/close", { token: B.token })).status, 403);
  });

  // ------------------------------------------------------------------ code execution
  test("run: real execution, stdin, compile errors, runtime errors, timeouts, validation", async () => {
    const run = (language, code, input = "") => api("POST", "/api/code/run", { token: A.token, body: { language, code, input } });
    let r = await run("python", "n=int(input())\nprint(n*2)", "21\n");
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.data.output, "42");
    assert.strictEqual(r.data.status, "ok");

    r = await run("cpp", "int main(){ return nope; }");
    assert.strictEqual(r.data.status, "compile_error");
    assert.match(r.data.output, /nope/);

    r = await run("python", "print('a')\nraise SystemExit(3)");
    assert.strictEqual(r.data.status, "runtime_error");
    assert.match(r.data.output, /a\n\[Process exited with code 3\]/);

    r = await run("python", "while True: pass");
    assert.strictEqual(r.data.status, "time_limit");
    assert.match(r.data.output, /Time limit exceeded/);

    assert.strictEqual((await run("cobol", "x")).status, 400);
    assert.strictEqual((await run("python", "")).status, 400);
    assert.strictEqual((await run("python", "x".repeat(70 * 1024))).status, 413);
  });

  // ------------------------------------------------------------------ sockets
  test("socket: auth required", async () => {
    await assert.rejects(connect(undefined), /AUTH_REQUIRED/);
    await assert.rejects(connect("forged"), /AUTH_INVALID/);
  });

  test("socket: join, users list, code sync, language, chat, typing, anti-spoofing, isolation", async () => {
    const sa = await connect(A.token), sb = await connect(B.token);
    const ua = once(sa, "users-update");
    assert.strictEqual((await join(sa, "ab12cd", "Alice")).ok, true); // lowercase id -> normalised
    await ua;
    const usersSeenByA = once(sa, "users-update");
    await join(sb, "AB12CD", "Bobby");
    const list = await usersSeenByA;
    assert.deepStrictEqual(list.map((u) => u.username).sort(), ["Alice", "Bobby"]);

    const gotCode = once(sb, "receive-code");
    sa.emit("code-change", { roomId: "AB12CD", code: "print('sync')" });
    assert.strictEqual(await gotCode, "print('sync')");

    const gotLang = once(sb, "receive-language");
    sa.emit("language-change", { roomId: "AB12CD", language: "java" });
    assert.strictEqual(await gotLang, "java");
    sa.emit("language-change", { roomId: "AB12CD", language: "python" });

    const msg = once(sb, "receive-message");
    sa.emit("send-message", { roomId: "AB12CD", data: { username: "FAKE", text: "hi there" } });
    const m = await msg;
    assert.strictEqual(m.text, "hi there");
    assert.strictEqual(m.username, "Alice", "chat author is taken from the server, not the payload");

    const typing = once(sb, "typing");
    sa.emit("typing", { roomId: "AB12CD", username: "FAKE" });
    assert.strictEqual(await typing, "Alice");

    // C is connected but has NOT joined the room: its events must be ignored
    const sc = await connect(C.token);
    const leak = quiet(sb, "receive-code");
    sc.emit("code-change", { roomId: "AB12CD", code: "HACKED" });
    await leak;
    const room = await models.Room.findOne({ where: { roomCode: "AB12CD" } });
    assert.notStrictEqual(room.code, "HACKED");

    const err = once(sc, "join-error");
    sc.emit("join-room", { roomId: "NOPE00", username: "Carol" });
    assert.match((await err).message, /not found/i);
  });

  test("socket: impersonation is impossible (userId in payload is ignored)", async () => {
    const sb2 = await connect(B.token);
    await join(sb2, "AB12CD", "Bobby");
    const members = await models.RoomMember.findAll({ where: { roomId: (await models.Room.findOne({ where: { roomCode: "AB12CD" } })).id } });
    assert.deepStrictEqual(members.map((m) => m.userId).sort(), [A.user.id, B.user.id].sort());
  });

  test("socket: same user in two tabs stays listed until the last tab leaves; rejoin clears leftAt", async () => {
    const t1 = await connect(C.token), t2 = await connect(C.token);
    await join(t1, "AB12CD", "Carol"); await join(t2, "AB12CD", "Carol");
    const watcher = await connect(A.token); await join(watcher, "AB12CD", "Alice");
    const countCarol = (l) => l.filter((u) => u.userId === C.user.id).length;
    let u = once(watcher, "users-update"); t1.emit("leave-room", { roomId: "AB12CD" });
    assert.strictEqual(countCarol(await u), 1, "still listed because tab 2 is open");
    const room = await models.Room.findOne({ where: { roomCode: "AB12CD" } });
    let row = await models.RoomMember.findOne({ where: { roomId: room.id, userId: C.user.id } });
    assert.strictEqual(row.leftAt, null);
    u = once(watcher, "users-update"); t2.emit("leave-room", { roomId: "AB12CD" });
    assert.strictEqual(countCarol(await u), 0);
    await new Promise((r) => setTimeout(r, 200));
    row = await row.reload(); assert.ok(row.leftAt, "leftAt set after last tab left");
    const t3 = await connect(C.token); await join(t3, "AB12CD", "Carol");
    row = await row.reload(); assert.strictEqual(row.leftAt, null, "rejoin must clear leftAt");
  });

  test("persistence: code survives everyone leaving", async () => {
    const x = await connect(A.token);
    await join(x, "AB12CD", "Alice");
    x.emit("code-change", { roomId: "AB12CD", code: "persisted-value" });
    await new Promise((r) => setTimeout(r, 100));
    for (const s of sockets) s.close();
    await new Promise((r) => setTimeout(r, 600));
    const row = await models.Room.findOne({ where: { roomCode: "AB12CD" } });
    assert.strictEqual(row.code, "persisted-value");
    const z = await connect(B.token);
    const code = once(z, "receive-code");
    await join(z, "AB12CD", "Bobby");
    assert.strictEqual(await code, "persisted-value", "restored from the database");
  });

  // ------------------------------------------------------------------ battle
  const SOLVE0 = "a=list(map(int,input().split()));k=int(input())\ns=sum(a[:k]);b=s\nfor i in range(k,len(a)):\n    s+=a[i]-a[i-k];b=max(b,s)\nprint(b)";

  test("battle: server-authoritative judging, arbitration, persistence, leaderboard", async () => {
    await api("POST", "/api/rooms", { token: A.token, body: { roomCode: "BATTLE", language: "python" } });
    const sa = await connect(A.token), sb = await connect(B.token);
    await join(sa, "BATTLE", "Alice"); await join(sb, "BATTLE", "Bobby");
    const submit = (t, code, extra = {}) => api("POST", "/api/code/submit", { token: t, body: { language: "python", code, roomId: "BATTLE", ...extra } });

    assert.strictEqual((await submit(A.token, SOLVE0)).status, 409, "no battle yet");

    const started = once(sb, "battle-started");
    sa.emit("start-battle", { roomId: "BATTLE" });
    const st = await started;
    assert.strictEqual(st.problemIndex, 0);
    assert.ok(st.timeLeft > 1700);

    const sc = await connect(C.token);
    const bs = once(sc, "battle-state");
    await join(sc, "BATTLE", "Carol");
    assert.strictEqual((await bs).active, true);

    const prob = once(sb, "battle-problem");
    sa.emit("battle-problem-change", { roomId: "BATTLE", problemIndex: 3 });
    assert.strictEqual((await prob).problemIndex, 3);
    assert.strictEqual((await submit(A.token, SOLVE0, { problemIndex: 0 })).status, 409, "out-of-sync view is refused");
    sa.emit("battle-problem-change", { roomId: "BATTLE", problemIndex: 0 });
    await once(sb, "battle-problem");

    // CHEAT 1: client supplies its own expected output + someone else's id -> ignored
    let r = await submit(A.token, "print(1)", { expectedOutput: "1", userId: B.user.id, input: "1", problemIndex: 0 });
    assert.strictEqual(r.data.accepted, false);
    assert.match(r.data.message, /Wrong Answer on test 1\/3/);
    const lastSub = await models.Submission.findOne({ order: [["id", "DESC"]] });
    assert.strictEqual(lastSub.userId, A.user.id, "submission is attributed to the JWT user, not the body");

    r = await submit(A.token, "print(undefined_name)");
    assert.match(r.data.message, /Runtime Error on test 1\/3/);
    r = await api("POST", "/api/code/submit", { token: A.token, body: { language: "cpp", code: "int main(){return x;}", roomId: "BATTLE" } });
    assert.match(r.data.message, /Compilation Error/);

    // CHEAT 2: a client can no longer announce a result over the socket
    const forged = quiet(sa, "battle-result");
    sb.emit("battle-result", { roomId: "BATTLE", username: "Bobby", accepted: true });
    await forged;

    // RACE: both players submit a correct solution at the same instant - exactly one may win
    const evA = once(sa, "battle-result");
    const evC = once(sc, "battle-result");
    const [rb, ra] = await Promise.all([submit(B.token, SOLVE0), submit(A.token, SOLVE0)]);
    assert.strictEqual(rb.data.accepted, true);
    assert.strictEqual(ra.data.accepted, true);
    assert.strictEqual([rb, ra].filter((x) => x.data.won).length, 1, "exactly one winner");
    const winner = rb.data.won ? B : A;
    const loserRes = rb.data.won ? ra : rb;
    assert.match(loserRes.data.message, /opponent solved it first/);
    assert.strictEqual((await evA).userId, winner.user.id);
    assert.strictEqual((await evC).userId, winner.user.id);

    await new Promise((x) => setTimeout(x, 300));
    const battles = await models.Battle.findAll();
    assert.strictEqual(battles.length, 1);
    assert.strictEqual(battles[0].winnerId, winner.user.id);
    assert.strictEqual(battles[0].status, "completed");
    assert.ok(battles[0].loserId && battles[0].loserId !== winner.user.id);

    // battle finished => further submissions are refused until a new battle starts
    assert.strictEqual((await submit(A.token, SOLVE0)).status, 409);
    assert.strictEqual((await api("PATCH", `/api/battles/${battles[0].id}/complete`, { token: C.token, body: { winnerId: C.user.id } })).status, 403);

    const lb = await api("GET", "/api/battles/leaderboard", { token: A.token });
    assert.strictEqual(lb.data.leaderboard[0].userId, winner.user.id);
    assert.strictEqual(lb.data.leaderboard[0].wins, 1);

    const other = winner === A ? B : A;
    assert.strictEqual((await api("GET", `/api/users/${other.user.id}/stats`, { token: winner.token })).status, 403);
    const me = await api("GET", `/api/users/${winner.user.id}/stats`, { token: winner.token });
    assert.strictEqual(me.data.statistics.battles.wins, 1);
  });

  test("battle: End Battle broadcasts; battles can be restarted", async () => {
    const sa = await connect(A.token), sb = await connect(B.token);
    await join(sa, "BATTLE", "Alice"); await join(sb, "BATTLE", "Bobby");
    sa.emit("start-battle", { roomId: "BATTLE" });
    await once(sb, "battle-started");
    const ended = once(sb, "battle-ended");
    sa.emit("end-battle", { roomId: "BATTLE" });
    assert.strictEqual((await ended).reason, "ended");
  });

  // ------------------------------------------------------------------ migrations
  test("schema migrations are idempotent and heal old databases", async () => {
    await sequelize.query("ALTER TABLE rooms DROP COLUMN code");
    await sequelize.query("ALTER TABLE users ADD UNIQUE INDEX email_2 (email)");
    await sequelize.query("ALTER TABLE users ADD UNIQUE INDEX email_3 (email)");
    await models.syncDB();
    await models.syncDB();
    const [cols] = await sequelize.query("SHOW COLUMNS FROM rooms LIKE 'code'");
    assert.strictEqual(cols.length, 1);
    const [idx] = await sequelize.query("SHOW INDEX FROM users WHERE Column_name='email' AND Non_unique=0");
    assert.strictEqual(idx.length, 1, "duplicate unique indexes removed");
  });

  test("utf8mb4: emoji in submitted code is stored", async () => {
    const room = await models.Room.findOne({ where: { roomCode: "BATTLE" } });
    const s = await models.Submission.create({ roomId: room.id, userId: A.user.id, language: "python", code: "print('😀')", accepted: false });
    assert.match((await s.reload()).code, /😀/);
  });
});
