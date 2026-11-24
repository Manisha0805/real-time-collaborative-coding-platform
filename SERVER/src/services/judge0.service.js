// Judge0 provider (EXECUTION_PROVIDER=judge0). Judge0 is a separate, isolated
// execution service (see deploy/judge0). This file only talks to its REST API.
const axios = require("axios");
const languageMap = require("../utils/languageMap");
const { config } = require("../config/env");
const { ExecutionUnavailableError } = require("./execution/errors");

const b64 = (s) => Buffer.from(String(s ?? ""), "utf8").toString("base64");
const unb64 = (s) => (s ? Buffer.from(s, "base64").toString("utf8") : "");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function headers() {
  const h = { "Content-Type": "application/json" };
  const { judge0AuthToken, judge0AuthHeader, judge0ExtraHeaders } = config.exec;
  if (judge0AuthToken) h[judge0AuthHeader] = judge0AuthToken;
  if (judge0ExtraHeaders) {
    try { Object.assign(h, JSON.parse(judge0ExtraHeaders)); }
    catch { console.warn("JUDGE0_EXTRA_HEADERS is not valid JSON; ignored."); }
  }
  return h;
}

const client = () =>
  axios.create({ baseURL: config.exec.judge0Url, headers: headers(), timeout: 15000 });

function wrapError(e) {
  if (e instanceof ExecutionUnavailableError) return e;
  const status = e.response?.status;
  if (status === 401 || status === 403) {
    console.error("Judge0 rejected our credentials - check JUDGE0_AUTH_TOKEN / JUDGE0_AUTH_HEADER.");
    return new ExecutionUnavailableError("Code execution service is misconfigured.");
  }
  if (status === 429) return new ExecutionUnavailableError("Code execution service is busy. Try again shortly.", "EXEC_BUSY");
  if (status === 400 || status === 422) {
    console.error("Judge0 rejected the submission:", JSON.stringify(e.response?.data));
    return new ExecutionUnavailableError("Code execution service rejected the request.");
  }
  console.error("Judge0 request failed:", e.code || status || e.message);
  return new ExecutionUnavailableError("Code execution service is unavailable. Try again later.");
}

// ---- language id resolution (by name, robust across Judge0 versions) ---------

let languageCache = null;

const versionOf = (name) => (name.match(/(\d+(?:\.\d+)*)\)?\s*$/) || [, "0"])[1].split(".").map(Number);
const cmpVersion = (a, b) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] || 0) - (b[i] || 0);
    if (d) return d;
  }
  return 0;
};

function pickLanguageIds(list) {
  const ids = {};
  for (const key of Object.keys(languageMap)) {
    const def = languageMap[key];
    if (!def || !def.judge0) continue;
    const forced = process.env[`JUDGE0_LANG_${key.toUpperCase()}`];
    if (forced) { ids[key] = Number(forced); continue; }
    const candidates = list.filter((l) => def.judge0.match.test(l.name));
    candidates.sort((a, b) => cmpVersion(versionOf(b.name), versionOf(a.name)));
    ids[key] = candidates.length ? candidates[0].id : def.judge0.fallbackId;
  }
  return ids;
}

async function languageId(key) {
  if (!languageCache) {
    try {
      const { data } = await client().get("/languages");
      languageCache = pickLanguageIds(data);
    } catch (e) {
      throw wrapError(e);
    }
  }
  return languageCache[key];
}

// ---- execution ---------------------------------------------------------------

async function submitOne({ id, code, input, lang, limits }) {
  const http = client();
  const memKb = Math.min((lang.memoryMb || limits.memoryMb) * 1024, 512000);
  let token;
  try {
    const { data } = await http.post("/submissions?base64_encoded=true&wait=false", {
      language_id: id,
      source_code: b64(code),
      stdin: b64(input),
      cpu_time_limit: limits.runTimeoutSec,
      wall_time_limit: Math.min(limits.runTimeoutSec * 3, 20),
      memory_limit: memKb,
    });
    token = data.token;
  } catch (e) { throw wrapError(e); }

  const deadline = Date.now() + (limits.compileTimeoutSec + limits.runTimeoutSec * 3 + 20) * 1000;
  let delay = 250;
  while (Date.now() < deadline) {
    await sleep(delay);
    delay = Math.min(delay * 1.5, 1000);
    try {
      const { data } = await http.get(
        `/submissions/${token}?base64_encoded=true&fields=status,stdout,stderr,compile_output,message,time,memory,exit_code,exit_signal`
      );
      if (data.status && data.status.id > 2) return data;
    } catch (e) { throw wrapError(e); }
  }
  throw new ExecutionUnavailableError("Code execution timed out in the queue. Try again.", "EXEC_BUSY");
}

async function run({ langKey, lang, code, inputs, limits }) {
  const id = await languageId(langKey);
  const result = { compile: { exitCode: 0, output: "" }, runs: [] };

  for (let i = 0; i < inputs.length; i++) {
    const r = await submitOne({ id, code, input: inputs[i], lang, limits });
    const sid = r.status.id;

    if (sid === 6) { // Compilation Error
      result.compile = { exitCode: 1, output: unb64(r.compile_output) || unb64(r.message) };
      result.runs = [];
      return result;
    }
    if (sid === 13 || sid === 14) {
      console.error("Judge0 internal error:", r.status.description, unb64(r.message));
      throw new ExecutionUnavailableError("Code execution service reported an internal error.");
    }

    const exitCode = r.exit_code ?? (sid === 3 ? 0 : 1);
    result.runs.push({
      index: i,
      exitCode,
      timeMs: Math.round(parseFloat(r.time || "0") * 1000),
      memoryKb: r.memory || null,
      stdout: unb64(r.stdout),
      // Judge0 puts runtime diagnostics (e.g. "Exited with error status 1") in `message`
      stderr: unb64(r.stderr) || (sid >= 7 ? unb64(r.message) : ""),
      outputTruncated: false,
      timedOut: sid === 5,
      memoryExceeded: false,
    });
  }
  return result;
}

async function ping() {
  try { await client().get("/system_info"); } catch (e) { throw wrapError(e); }
}

module.exports = { run, ping, pickLanguageIds, _resetCache: () => { languageCache = null; } };
