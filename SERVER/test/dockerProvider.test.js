// Exercises the Docker provider against a FAKE Docker daemon that emits real
// multiplexed (8-byte header) streams. It validates our orchestration logic and the
// container hardening options we send - NOT the behaviour of a real daemon.
const test = require("node:test");
const assert = require("node:assert");
const { PassThrough } = require("stream");
const Docker = require("dockerode");

process.env.JWT_SECRET = "x".repeat(40);
const provider = require("../src/services/execution/dockerProvider");
const languageMap = require("../src/utils/languageMap");
const { ExecutionUnavailableError } = require("../src/services/execution/errors");

const modem = new Docker().modem;
const frame = (type, text) => {
  const b = Buffer.from(text);
  const h = Buffer.alloc(8);
  h[0] = type; h.writeUInt32BE(b.length, 4);
  return Buffer.concat([h, b]);
};
const LIMITS = { compileTimeoutSec: 10, runTimeoutSec: 2, memoryMb: 256, cpus: 1, maxOutputBytes: 1000 };
const OK_OUT = "@@C 0 0\n@@T 0 0 12 3 0 0 0\nhi\n@@END\n";

function fakeDocker({ imagePresent = true, stdout = OK_OUT, oom = false, hang = false, flood = false } = {}) {
  const calls = { created: null, removed: false, killed: 0, pulled: 0 };
  const container = {
    async attach() {
      const s = new PassThrough();
      container._stream = s;
      return s;
    },
    async start() {
      setTimeout(() => {
        if (flood) { const big = frame(1, "x".repeat(50000)); const iv = setInterval(() => container._stream.write(big), 1); container._iv = iv; return; }
        if (hang) return;
        container._stream.write(frame(1, stdout));
        container._stream.end();
        container._exit();
      }, 5);
    },
    wait: () => new Promise((res) => { container._exit = () => res({ StatusCode: 0 }); }),
    async inspect() { return { State: { OOMKilled: oom } }; },
    async kill() { calls.killed++; clearInterval(container._iv); container._stream.end(); container._exit(); },
    async remove() { calls.removed = true; },
  };
  return {
    calls,
    modem,
    getImage: () => ({ inspect: async () => { if (!imagePresent) throw Object.assign(new Error("no"), { statusCode: 404 }); return {}; } }),
    pull: (img, cb) => { calls.pulled++; cb(null, new PassThrough()); },
    createContainer: async (opts) => { calls.created = opts; return container; },
  };
}
const run = (docker, extra = {}, inputs = [""], lang = languageMap.python) => {
  provider._setDocker(docker);
  return provider.run({ lang, code: "SECRET_USER_CODE", inputs, limits: { ...LIMITS, ...extra } });
};

test("container is created with the full hardening profile", async () => {
  const d = fakeDocker();
  await run(d);
  const o = d.calls.created, h = o.HostConfig;
  assert.strictEqual(h.NetworkMode, "none");
  assert.strictEqual(o.NetworkDisabled, true);
  assert.strictEqual(h.ReadonlyRootfs, true);
  assert.deepStrictEqual(h.CapDrop, ["ALL"]);
  assert.ok(h.SecurityOpt.includes("no-new-privileges"));
  assert.ok(h.PidsLimit > 0 && h.PidsLimit <= 256);
  assert.strictEqual(h.Memory, h.MemorySwap, "swap must be disabled");
  assert.strictEqual(h.NanoCpus, 1e9);
  assert.strictEqual(o.User, "65534:65534");
  assert.ok(h.Tmpfs["/sandbox"].includes("size="));
  assert.ok(h.Ulimits.some((u) => u.Name === "fsize"));
});

test("user code is passed via env (base64), never inside the script text", async () => {
  const d = fakeDocker();
  await run(d);
  const cmd = d.calls.created.Cmd.join(" ");
  assert.ok(!cmd.includes("SECRET_USER_CODE"));
  const env = d.calls.created.Env.find((e) => e.startsWith("SRC_B64="));
  assert.strictEqual(Buffer.from(env.split("=")[1], "base64").toString(), "SECRET_USER_CODE");
});

test("Java gets its larger memory/pid budget", async () => {
  const d = fakeDocker();
  await run(d, {}, [""], languageMap.java);
  assert.strictEqual(d.calls.created.HostConfig.Memory, 512 * 1024 * 1024);
  assert.strictEqual(d.calls.created.HostConfig.PidsLimit, 256);
});

test("successful run: output demultiplexed and container removed", async () => {
  const d = fakeDocker();
  const r = await run(d);
  assert.strictEqual(r.runs[0].stdout, "hi\n");
  assert.strictEqual(r.compile.exitCode, 0);
  assert.strictEqual(d.calls.removed, true);
});

test("OOM kill is reported as memory limit", async () => {
  const d = fakeDocker({ oom: true, stdout: "@@C 0 0\n@@T 0 137 50 0 0 0 0\n@@END\n" });
  const r = await run(d);
  assert.strictEqual(r.runs[0].memoryExceeded, true);
});

test("hung container is hard-killed, flagged as timeout, and cleaned up", async () => {
  const d = fakeDocker({ hang: true });
  // The runner "compiled" fine but never finished: simulate the partial frame
  const orig = d.createContainer;
  d.createContainer = async (o) => { const c = await orig(o); const st = c.start; c.start = async () => { await st(); c._stream.write(frame(1, "@@C 0 0\n")); }; return c; };
  const r = await run(d, { hardTimeoutMs: 150 });
  assert.ok(d.calls.killed >= 1);
  assert.strictEqual(r.runs[0].timedOut, true);
  assert.strictEqual(d.calls.removed, true);
});

test("output flood kills the container instead of exhausting server memory", async () => {
  const d = fakeDocker({ flood: true });
  const r = await run(d, { hardTimeoutMs: 5000 });
  assert.ok(d.calls.killed >= 1);
  assert.strictEqual(r.runs[0].outputTruncated, true);
});

test("missing image: friendly 'preparing' error and background pull", async () => {
  const d = fakeDocker({ imagePresent: false });
  await assert.rejects(run(d), (e) => e instanceof ExecutionUnavailableError && e.code === "EXEC_IMAGE_PREPARING");
  assert.strictEqual(d.calls.pulled, 1);
  assert.strictEqual(d.calls.created, null, "no container may be created without the image");
});

test("daemon down => ExecutionUnavailableError (HTTP 503), not a crash", async () => {
  const d = fakeDocker();
  d.getImage = () => ({ inspect: async () => { throw new Error("connect ENOENT /var/run/docker.sock"); } });
  await assert.rejects(run(d), (e) => e instanceof ExecutionUnavailableError && /temporarily unavailable/.test(e.message));
});
