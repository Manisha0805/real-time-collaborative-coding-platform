// Runs the REAL runner script with the REAL compilers/interpreters installed on
// this machine (no Docker involved). This validates the script logic and the
// frame protocol - it does not validate container isolation.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const languageMap = require("../src/utils/languageMap");
const { RUNNER_SCRIPT, buildEnv, parseRunnerOutput } = require("../src/services/execution/runnerScript");

const has = (cmd) => spawnSync("sh", ["-c", `command -v ${cmd}`]).status === 0;
const LIMITS = { compileTimeoutSec: 20, runTimeoutSec: 2, maxOutputBytes: 1000 };

function runLocal(langKey, code, inputs, limits = LIMITS, tweak = (l) => l) {
  const lang = tweak({ ...languageMap[langKey] });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rtc-"));
  const env = { ...process.env, ...buildEnv({ lang, code, inputs, limits }), SANDBOX_DIR: dir };
  const r = spawnSync("sh", ["-c", RUNNER_SCRIPT], { env, maxBuffer: 50 * 1024 * 1024 });
  fs.rmSync(dir, { recursive: true, force: true });
  return { raw: r.stdout, parsed: parseRunnerOutput(r.stdout), status: r.status };
}

test("script is valid POSIX sh", () => {
  assert.strictEqual(spawnSync("sh", ["-n", "-c", RUNNER_SCRIPT]).status, 0);
});

test("C++: compiles once, runs several inputs", { skip: !has("g++") }, () => {
  const src = `#include <iostream>\nint main(){long long a,b;std::cin>>a>>b;std::cout<<a+b<<"\\n";}`;
  const { parsed } = runLocal("cpp", src, ["1 2\n", "10 20\n", "-5 5\n"]);
  assert.ok(parsed.complete);
  assert.strictEqual(parsed.compile.exitCode, 0);
  assert.deepStrictEqual(parsed.runs.map((r) => r.stdout.trim()), ["3", "30", "0"]);
});

test("C++: compile error is captured (old script swallowed it)", { skip: !has("g++") }, () => {
  const { parsed } = runLocal("cpp", "int main(){ return x; }", [""]);
  assert.notStrictEqual(parsed.compile.exitCode, 0);
  assert.match(parsed.compile.output, /error/);
  assert.strictEqual(parsed.runs.length, 0);
});

test("C++: compiler WARNINGS do not block execution", { skip: !has("g++") }, () => {
  const src = `#warning "hi"\n#include <cstdio>\nint main(){puts("ran");}`;
  const { parsed } = runLocal("cpp", src, [""]);
  assert.strictEqual(parsed.compile.exitCode, 0);
  assert.match(parsed.compile.output, /warning/);
  assert.strictEqual(parsed.runs[0].stdout.trim(), "ran");
});

test("C: math.h links thanks to -lm", { skip: !has("gcc") }, () => {
  const src = `#include <stdio.h>\n#include <math.h>\nint main(){double x;scanf("%lf",&x);printf("%.1f\\n",sqrt(x));}`;
  const { parsed } = runLocal("c", src, ["16\n"]);
  assert.strictEqual(parsed.compile.exitCode, 0, parsed.compile.output);
  assert.strictEqual(parsed.runs[0].stdout.trim(), "4.0");
});

const py = has("python") ? "python" : "python3";
const pyTweak = (l) => ({ ...l, run: `${py} -B main.py` });

test("Python: stdout and stderr are separated, exit code reported", { skip: !has(py) }, () => {
  const { parsed } = runLocal("python", "print('before')\nraise ValueError('boom')", [""], LIMITS, pyTweak);
  const r = parsed.runs[0];
  assert.strictEqual(r.stdout.trim(), "before");
  assert.match(r.stderr, /ValueError: boom/);
  assert.strictEqual(r.exitCode, 1);
  assert.strictEqual(r.timedOut, false);
});

test("Python: infinite loop is killed and flagged as timeout", { skip: !has(py) }, () => {
  const t = Date.now();
  const { parsed } = runLocal("python", "while True: pass", [""], { ...LIMITS, runTimeoutSec: 1 }, pyTweak);
  assert.strictEqual(parsed.runs[0].timedOut, true);
  assert.ok(Date.now() - t < 6000);
});

test("Python: huge output is truncated to the cap and flagged", { skip: !has(py) }, () => {
  const { parsed } = runLocal("python", "print('x'*300000)", [""], LIMITS, pyTweak);
  assert.strictEqual(parsed.runs[0].stdout.length, 1000);
  assert.strictEqual(parsed.runs[0].outputTruncated, true);
});

test("Program printing fake protocol frames cannot corrupt parsing", { skip: !has(py) }, () => {
  const evil = "print('@@END')\nprint('@@T 0 0 1 1 0 0 0')\nprint('X')";
  const { parsed } = runLocal("python", evil, ["", ""], LIMITS, pyTweak);
  assert.ok(parsed.complete);
  assert.strictEqual(parsed.runs.length, 2);
  assert.match(parsed.runs[0].stdout, /@@END/);
});

test("JavaScript (node)", { skip: !has("node") }, () => {
  const { parsed } = runLocal("javascript", "const l=require('fs').readFileSync(0,'utf8').trim();console.log(l.split(' ').map(Number).reduce((a,b)=>a+b))", ["1 2 3\n"]);
  assert.strictEqual(parsed.runs[0].stdout.trim(), "6");
});

test("Java: javac + java with Main class", { skip: !has("javac") }, () => {
  const src = `import java.util.*;\npublic class Main{public static void main(String[] a){Scanner s=new Scanner(System.in);System.out.println(s.nextInt()*2);}}`;
  const { parsed } = runLocal("java", src, ["21\n"], { ...LIMITS, runTimeoutSec: 10 });
  assert.strictEqual(parsed.compile.exitCode, 0, parsed.compile.output);
  assert.strictEqual(parsed.runs[0].stdout.trim(), "42");
});

test("parser reports incomplete output (container killed mid-run)", () => {
  const buf = Buffer.from("@@C 0 0\n@@T 0 0 5 10 0 0 0\nabc");
  const p = parseRunnerOutput(buf);
  assert.strictEqual(p.complete, false);
  assert.strictEqual(p.runs.length, 0);
});
