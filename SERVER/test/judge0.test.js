// Judge0 client tested against a fake Judge0 HTTP server that follows Judge0's documented API.
const test = require("node:test");
const assert = require("node:assert");
const http = require("http");

process.env.JWT_SECRET = "x".repeat(40);
const { config } = require("../src/config/env");
const judge0 = require("../src/services/judge0.service");
const languageMap = require("../src/utils/languageMap");
const { ExecutionUnavailableError } = require("../src/services/execution/errors");

const b64 = (s) => Buffer.from(s).toString("base64");
const LANGS = [
  { id: 50, name: "C (GCC 9.2.0)" }, { id: 103, name: "C (GCC 14.1.0)" },
  { id: 54, name: "C++ (GCC 9.2.0)" }, { id: 105, name: "C++ (GCC 14.1.0)" },
  { id: 62, name: "Java (OpenJDK 13.0.1)" }, { id: 91, name: "Java (JDK 17.0.6)" },
  { id: 63, name: "JavaScript (Node.js 12.14.0)" }, { id: 93, name: "JavaScript (Node.js 18.15.0)" },
  { id: 71, name: "Python (3.8.1)" }, { id: 92, name: "Python (3.11.2)" }, { id: 70, name: "Python (2.7.17)" },
];

let server, seen, scenario;
test.before(async () => {
  const subs = new Map();
  server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      seen.push({ method: req.method, url: req.url, headers: req.headers, body: body && JSON.parse(body) });
      const json = (code, o) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(o)); };
      if (config.exec.judge0AuthToken && req.headers["x-auth-token"] !== config.exec.judge0AuthToken) return json(403, { error: "forbidden" });
      if (req.url === "/languages") return json(200, LANGS);
      if (req.method === "POST" && req.url.startsWith("/submissions")) {
        const token = "tok" + subs.size; subs.set(token, JSON.parse(body)); return json(201, { token });
      }
      const m = req.url.match(/^\/submissions\/(tok\d+)/);
      if (m) {
        const sub = subs.get(m[1]);
        const polls = (sub._polls = (sub._polls || 0) + 1);
        if (polls < 2) return json(200, { status: { id: 2, description: "Processing" } });
        return json(200, scenario(sub));
      }
      json(404, {});
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  config.exec.judge0Url = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());
test.beforeEach(() => { seen = []; judge0._resetCache(); config.exec.judge0AuthToken = ""; });

const LIMITS = { compileTimeoutSec: 10, runTimeoutSec: 2, memoryMb: 256, cpus: 1, maxOutputBytes: 1000 };
const go = (key, inputs = [""]) => judge0.run({ langKey: key, lang: languageMap[key], code: "src", inputs, limits: LIMITS });

test("language ids are resolved by name, preferring the newest version (never Python 2)", () => {
  const ids = judge0.pickLanguageIds(LANGS);
  assert.deepStrictEqual([ids.c, ids.cpp, ids.java, ids.javascript, ids.python], [103, 105, 91, 93, 92]);
});

test("falls back to known ids when the name list has no match", () => {
  const ids = judge0.pickLanguageIds([]);
  assert.strictEqual(ids.python, 71);
});

test("JUDGE0_LANG_<KEY> forces an id", () => {
  process.env.JUDGE0_LANG_PYTHON = "999";
  assert.strictEqual(judge0.pickLanguageIds(LANGS).python, 999);
  delete process.env.JUDGE0_LANG_PYTHON;
});

test("accepted run: base64 in/out, limits sent, polling works", async () => {
  scenario = () => ({ status: { id: 3 }, stdout: b64("42\n"), stderr: null, time: "0.012", memory: 900, exit_code: 0 });
  const r = await go("python", ["21\n"]);
  assert.strictEqual(r.runs[0].stdout, "42\n");
  assert.strictEqual(r.runs[0].exitCode, 0);
  assert.strictEqual(r.runs[0].timeMs, 12);
  const post = seen.find((s) => s.method === "POST");
  assert.strictEqual(post.body.language_id, 92);
  assert.strictEqual(Buffer.from(post.body.stdin, "base64").toString(), "21\n");
  assert.strictEqual(post.body.cpu_time_limit, 2);
  assert.ok(post.body.memory_limit <= 512000);
});

test("compile error -> compile.exitCode != 0 and no runs", async () => {
  scenario = () => ({ status: { id: 6 }, compile_output: b64("main.cpp: error: boom") });
  const r = await go("cpp", ["a", "b"]);
  assert.notStrictEqual(r.compile.exitCode, 0);
  assert.match(r.compile.output, /boom/);
  assert.strictEqual(r.runs.length, 0);
  assert.strictEqual(seen.filter((s) => s.method === "POST").length, 1, "stops after the first compile error");
});

test("time limit and runtime error mapping", async () => {
  scenario = (sub) => (Buffer.from(sub.stdin, "base64").toString() === "tle"
    ? { status: { id: 5 }, time: "2.0" }
    : { status: { id: 11, description: "Runtime Error (NZEC)" }, stderr: b64("Traceback..."), exit_code: 1 });
  const r = await go("python", ["tle", "boom"]);
  assert.strictEqual(r.runs[0].timedOut, true);
  assert.strictEqual(r.runs[1].exitCode, 1);
  assert.match(r.runs[1].stderr, /Traceback/);
});

test("auth token header is sent, and wrong/missing token => unavailable (not a crash)", async () => {
  config.exec.judge0AuthToken = "s3cret";
  scenario = () => ({ status: { id: 3 }, stdout: b64("ok") , exit_code: 0 });
  assert.strictEqual((await go("python")).runs[0].stdout, "ok");
  assert.strictEqual(seen[0].headers["x-auth-token"], "s3cret");
  judge0._resetCache(); config.exec.judge0AuthToken = "wrong";
  const bad = config.exec.judge0AuthToken;
  config.exec.judge0AuthToken = "s3cret"; // server expects s3cret
  config.exec.judge0ExtraHeaders = JSON.stringify({ "X-Auth-Token": "nope" });
  await assert.rejects(go("python"), (e) => e instanceof ExecutionUnavailableError);
  config.exec.judge0ExtraHeaders = ""; void bad;
});

test("Judge0 down => ExecutionUnavailableError", async () => {
  const keep = config.exec.judge0Url;
  config.exec.judge0Url = "http://127.0.0.1:1";
  await assert.rejects(go("python"), (e) => e instanceof ExecutionUnavailableError);
  config.exec.judge0Url = keep;
});

test("internal error status is surfaced as unavailable", async () => {
  scenario = () => ({ status: { id: 13, description: "Internal Error" }, message: b64("cgroup") });
  await assert.rejects(go("python"), (e) => e instanceof ExecutionUnavailableError);
});
