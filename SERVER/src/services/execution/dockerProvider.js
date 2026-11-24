const Docker = require("dockerode");
const { Writable } = require("stream");
const { config } = require("../../config/env");
const { ExecutionUnavailableError } = require("./errors");
const { RUNNER_SCRIPT, buildEnv, parseRunnerOutput } = require("./runnerScript");

const LABEL = "rtc.sandbox";
let docker;

function getDocker() {
  if (docker) return docker;
  const sock = config.exec.dockerSocketPath;
  if (sock) docker = new Docker({ socketPath: sock });
  else if (process.env.DOCKER_HOST) docker = new Docker(); // dockerode honours DOCKER_HOST
  else if (process.platform === "win32") docker = new Docker({ socketPath: "//./pipe/dockerDesktopLinuxEngine" });
  else docker = new Docker({ socketPath: "/var/run/docker.sock" });
  return docker;
}
// Test hook
function _setDocker(d) { docker = d; }

class Collector extends Writable {
  constructor(cap, onOverflow) {
    super();
    this.cap = cap;
    this.size = 0;
    this.chunks = [];
    this.overflow = false;
    this.onOverflow = onOverflow;
  }
  _write(chunk, _enc, cb) {
    if (this.size + chunk.length > this.cap) {
      const room = Math.max(0, this.cap - this.size);
      if (room) this.chunks.push(chunk.slice(0, room));
      this.size = this.cap;
      if (!this.overflow) {
        this.overflow = true;
        if (this.onOverflow) this.onOverflow();
      }
    } else {
      this.chunks.push(chunk);
      this.size += chunk.length;
    }
    cb();
  }
  buffer() { return Buffer.concat(this.chunks); }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- images ---------------------------------------------------------------

const pulling = new Map();

async function imagePresent(image) {
  try { await getDocker().getImage(image).inspect(); return true; } catch (e) {
    if (e.statusCode === 404) return false;
    throw e;
  }
}

function startPull(image) {
  if (pulling.has(image)) return pulling.get(image);
  const d = getDocker();
  const p = new Promise((resolve, reject) => {
    d.pull(image, (err, stream) => {
      if (err) return reject(err);
      d.modem.followProgress(stream, (e) => (e ? reject(e) : resolve()));
    });
  }).finally(() => pulling.delete(image));
  pulling.set(image, p);
  p.catch((e) => console.error(`Image pull failed for ${image}:`, e.message));
  return p;
}

async function pullImage(image) {
  await startPull(image);
}

async function ensureImage(image) {
  if (await imagePresent(image)) return;
  if (config.exec.autoPullImages) startPull(image); // background: never block a request on a large pull
  throw new ExecutionUnavailableError(
    `The runtime image "${image}" is being prepared. Please try again in a minute.`,
    "EXEC_IMAGE_PREPARING"
  );
}

// ---- janitor ----------------------------------------------------------------

async function cleanupStaleContainers(maxAgeSec = 120) {
  try {
    const list = await getDocker().listContainers({ all: true, filters: { label: [LABEL] } });
    const now = Date.now() / 1000;
    for (const c of list) {
      if (now - c.Created > maxAgeSec) {
        await getDocker().getContainer(c.Id).remove({ force: true, v: true }).catch(() => {});
      }
    }
  } catch (e) {
    console.warn("Sandbox janitor skipped:", e.message);
  }
}

// ---- execution --------------------------------------------------------------

async function run({ lang, code, inputs, limits }) {
  const d = getDocker();
  await ensureImage(lang.image).catch((e) => {
    if (e instanceof ExecutionUnavailableError) throw e;
    console.error("Docker is not reachable:", e.message); // details stay in the server log
    throw new ExecutionUnavailableError("Code execution is temporarily unavailable. Please try again later.");
  });

  const memMb = lang.memoryMb || limits.memoryMb;
  const memBytes = memMb * 1024 * 1024;
  const env = buildEnv({ lang, code, inputs, limits });
  let container;

  try {
    container = await d.createContainer({
      Image: lang.image,
      Cmd: ["sh", "-c", RUNNER_SCRIPT],
      Env: Object.entries(env).map(([k, v]) => `${k}=${v}`),
      WorkingDir: "/sandbox",
      User: "65534:65534", // nobody
      Tty: false,
      AttachStdout: true,
      AttachStderr: true,
      OpenStdin: false,
      NetworkDisabled: true,
      Labels: { [LABEL]: "1" },
      HostConfig: {
        NetworkMode: "none",
        Memory: memBytes,
        MemorySwap: memBytes, // no swap
        NanoCpus: Math.round(limits.cpus * 1e9),
        PidsLimit: lang.pids || 128,
        CapDrop: ["ALL"],
        SecurityOpt: ["no-new-privileges"],
        ReadonlyRootfs: true,
        Tmpfs: {
          "/sandbox": "rw,exec,nosuid,nodev,size=64m,mode=1777",
          "/tmp": "rw,exec,nosuid,nodev,size=64m,mode=1777",
        },
        Ulimits: [
          { Name: "fsize", Soft: 32 * 1024 * 1024, Hard: 32 * 1024 * 1024 },
          { Name: "nofile", Soft: 256, Hard: 256 },
          { Name: "core", Soft: 0, Hard: 0 },
        ],
      },
    });
  } catch (e) {
    if (e.statusCode === 404)
      throw new ExecutionUnavailableError("Runtime image is not available yet. Please try again shortly.", "EXEC_IMAGE_PREPARING");
    console.error("Could not create sandbox container:", e.message);
    throw new ExecutionUnavailableError("Code execution is temporarily unavailable. Please try again later.");
  }

  let killedForOverflow = false;
  let hardTimeout = false;
  try {
    const frameCap = (limits.maxOutputBytes * 2 + 256) * inputs.length + limits.maxOutputBytes + 2048;
    const killNow = () => { killedForOverflow = true; container.kill().catch(() => {}); };
    const out = new Collector(frameCap, killNow);
    const err = new Collector(8192);

    const stream = await container.attach({ stream: true, stdout: true, stderr: true });
    d.modem.demuxStream(stream, out, err);
    const streamDone = new Promise((res) => {
      stream.on("end", res); stream.on("close", res); stream.on("error", res);
    });

    await container.start();

    const hardMs = limits.hardTimeoutMs ?? (limits.compileTimeoutSec + limits.runTimeoutSec * inputs.length + 15) * 1000;
    const timer = setTimeout(() => { hardTimeout = true; container.kill().catch(() => {}); }, hardMs);
    await container.wait();
    clearTimeout(timer);
    await Promise.race([streamDone, sleep(2000)]);

    let oomKilled = false;
    try { oomKilled = !!(await container.inspect()).State.OOMKilled; } catch { /* ignore */ }

    const parsed = parseRunnerOutput(out.buffer());
    for (const r of parsed.runs) r.memoryExceeded = oomKilled && r.exitCode === 137 && !r.timedOut;

    if (!parsed.complete) {
      // Runner was cut short (killed). Explain the run that did not finish.
      if (!parsed.compile && killedForOverflow) {
        parsed.compile = { exitCode: 0, output: "" }; // flooded output is the program's fault, not an infrastructure error
      }
      if (!parsed.compile) {
        const stderrText = err.buffer().toString("utf8").trim();
        console.error("Sandbox runner failed to start:", stderrText);
        throw new ExecutionUnavailableError("Code execution is temporarily unavailable. Please try again later.");
      }
      if (parsed.compile.exitCode === 0 || parsed.compile.exitCode === undefined) {
        parsed.runs.push({
          index: parsed.runs.length, exitCode: 137, timeMs: limits.runTimeoutSec * 1000,
          stdout: "", stderr: "", outputTruncated: killedForOverflow,
          timedOut: hardTimeout && !oomKilled, memoryExceeded: oomKilled,
        });
      }
    }
    return { compile: parsed.compile, runs: parsed.runs };
  } finally {
    if (container) await container.remove({ force: true, v: true }).catch((e) =>
      console.error("Sandbox cleanup failed:", e.message));
  }
}

async function ping() {
  await getDocker().ping();
}

module.exports = { run, ping, pullImage, cleanupStaleContainers, _setDocker, Collector };
