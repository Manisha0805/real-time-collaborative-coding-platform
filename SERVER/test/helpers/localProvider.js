// TEST-ONLY execution provider: runs the real runner script on the local machine
// (no container isolation). Never wired into production code paths.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { RUNNER_SCRIPT, buildEnv, parseRunnerOutput } = require("../../src/services/execution/runnerScript");

const hasPython = spawnSync("sh", ["-c", "command -v python"]).status === 0;

module.exports = {
  async run({ lang, code, inputs, limits }) {
    const l = { ...lang };
    if (!hasPython) l.run = l.run.replace(/^python /, "python3 ");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rtc-it-"));
    const env = { ...process.env, ...buildEnv({ lang: l, code, inputs, limits }), SANDBOX_DIR: dir };
    const r = spawnSync("sh", ["-c", RUNNER_SCRIPT], { env, maxBuffer: 50 * 1024 * 1024 });
    fs.rmSync(dir, { recursive: true, force: true });
    const p = parseRunnerOutput(r.stdout);
    return { compile: p.compile, runs: p.runs };
  },
  async ping() {},
};
