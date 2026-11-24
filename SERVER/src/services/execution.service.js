// Execution facade. Controllers only talk to this file.
//   EXECUTION_PROVIDER=docker  -> sandbox containers on a Docker host (dev / single VPS)
//   EXECUTION_PROVIDER=judge0  -> remote Judge0 service (PaaS-friendly; see deploy/judge0)
const languageMap = require("../utils/languageMap");
const { config } = require("../config/env");
const { ExecutionUnavailableError } = require("./execution/errors");

let providerOverride = null; // tests only
const provider = () => {
  if (providerOverride) return providerOverride;
  return config.exec.provider === "judge0" ? require("./judge0.service") : require("./execution/dockerProvider");
};

// ---- concurrency gate -------------------------------------------------------

let active = 0;
const waiters = [];

function acquire() {
  const { maxConcurrent, maxQueue, queueTimeoutMs } = config.exec;
  if (active < maxConcurrent) { active++; return Promise.resolve(); }
  if (waiters.length >= maxQueue)
    return Promise.reject(new ExecutionUnavailableError("The server is busy running other code. Please retry in a few seconds.", "EXEC_BUSY"));
  return new Promise((resolve, reject) => {
    const w = { resolve };
    w.timer = setTimeout(() => {
      waiters.splice(waiters.indexOf(w), 1);
      reject(new ExecutionUnavailableError("The server is busy running other code. Please retry in a few seconds.", "EXEC_BUSY"));
    }, queueTimeoutMs);
    waiters.push(w);
  });
}
function release() {
  const next = waiters.shift();
  if (next) { clearTimeout(next.timer); next.resolve(); } else active--;
}

// ---- public API ---------------------------------------------------------------

const limitsFromConfig = () => ({
  compileTimeoutSec: config.exec.compileTimeoutSec,
  runTimeoutSec: config.exec.runTimeoutSec,
  memoryMb: config.exec.memoryMb,
  cpus: config.exec.cpus,
  maxOutputBytes: config.exec.maxOutputBytes,
});

const isSupportedLanguage = (l) => typeof l === "string" && Object.prototype.hasOwnProperty.call(languageMap, l) && !!languageMap[l].fileName;

/**
 * Compile once and run the program once per entry in `inputs`.
 * Returns { compile: {exitCode, output}, runs: [{stdout, stderr, exitCode, timeMs,
 * timedOut, memoryExceeded, outputTruncated}] }.  If compilation fails, runs is [].
 */
async function executeCode(language, code, inputs = [""]) {
  const key = String(language || "").toLowerCase();
  if (!isSupportedLanguage(key)) throw Object.assign(new Error(`Unsupported language: ${language}`), { status: 400 });
  const lang = languageMap[key];
  const limits = limitsFromConfig();

  await acquire();
  try {
    return await provider().run({ langKey: key, lang, code, inputs, limits });
  } finally {
    release();
  }
}

function classifyRun(run) {
  if (run.timedOut) return "time_limit";
  if (run.memoryExceeded) return "memory_limit";
  if (run.exitCode !== 0) return "runtime_error";
  return "ok";
}

const LABELS = {
  ok: "Success",
  compile_error: "Compilation Error",
  runtime_error: "Runtime Error",
  time_limit: "Time Limit Exceeded",
  memory_limit: "Memory Limit Exceeded",
};

function javaHint(text) {
  return /class \w+ is public, should be declared in a file named/.test(text)
    ? "\n\nHint: name your public class Main."
    : "";
}

/** Human-readable console text for one run (what the Output panel shows). */
function consoleOutput(result, runIndex = 0) {
  if (result.compile && result.compile.exitCode !== 0) {
    const text = result.compile.output.trim() || "Compilation failed.";
    return text + javaHint(text);
  }
  const run = result.runs[runIndex];
  if (!run) return "";
  let out = run.stdout;
  if (run.stderr) out += (out && !out.endsWith("\n") ? "\n" : "") + run.stderr;
  out = out.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  const status = classifyRun(run);
  const notes = [];
  if (status === "time_limit") notes.push(`Time limit exceeded (${config.exec.runTimeoutSec}s)`);
  else if (status === "memory_limit") notes.push("Memory limit exceeded");
  else if (status === "runtime_error") notes.push(`Process exited with code ${run.exitCode}`);
  if (run.outputTruncated) notes.push("Output truncated");
  if (notes.length) out += (out && !out.endsWith("\n") ? "\n" : "") + notes.map((n) => `[${n}]`).join("\n");
  return out.trim();
}

/** Machine-readable summary of one run. */
function summarize(result, runIndex = 0) {
  if (result.compile && result.compile.exitCode !== 0)
    return { status: "compile_error", statusLabel: LABELS.compile_error, stdout: "", stderr: "", compileOutput: result.compile.output, exitCode: result.compile.exitCode, timeMs: 0 };
  const run = result.runs[runIndex] || {};
  const status = run ? classifyRun(run) : "runtime_error";
  return {
    status, statusLabel: LABELS[status],
    stdout: run.stdout || "", stderr: run.stderr || "",
    compileOutput: result.compile ? result.compile.output : "",
    exitCode: run.exitCode, timeMs: run.timeMs || 0,
    truncated: !!run.outputTruncated,
  };
}

async function checkHealth() {
  await provider().ping();
}

module.exports = {
  executeCode, classifyRun, consoleOutput, summarize, isSupportedLanguage, checkHealth,
  _setProvider: (p) => { providerOverride = p; },
  _state: () => ({ active, queued: waiters.length }),
};
