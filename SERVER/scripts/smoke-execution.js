#!/usr/bin/env node
// End-to-end check of the code-execution backend you have configured
// (EXECUTION_PROVIDER=docker or judge0). Run it on the machine/host that will run
// the server:
//
//     npm run smoke:exec
//
// It executes real programs, including hostile ones (infinite loop, fork bomb,
// memory bomb, output flood, network access, filesystem writes) and prints PASS/FAIL.
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
process.env.JWT_SECRET = process.env.JWT_SECRET || "smoke-test-only-secret-value-0000000000";

const { config } = require("../src/config/env");
const exec = require("../src/services/execution.service");

const isDocker = config.exec.provider === "docker";
const results = [];

async function check(name, fn, { dockerOnly = false } = {}) {
  if (dockerOnly && !isDocker) { results.push({ name, status: "SKIP" }); return; }
  const t = Date.now();
  try {
    const detail = await fn();
    results.push({ name, status: "PASS", ms: Date.now() - t, detail });
  } catch (e) {
    results.push({ name, status: "FAIL", ms: Date.now() - t, detail: e.message });
  }
}
const ok = (c, m) => { if (!c) throw new Error(m); };
const one = async (lang, code, input = "") => {
  const r = await exec.executeCode(lang, code, [input]);
  return { r, run: r.runs[0], text: exec.consoleOutput(r, 0), s: exec.summarize(r, 0) };
};

const HELLO = {
  python: 'print("hello")',
  javascript: 'console.log("hello")',
  c: '#include <stdio.h>\nint main(){puts("hello");return 0;}',
  cpp: '#include <iostream>\nint main(){std::cout<<"hello\\n";}',
  java: 'public class Main{public static void main(String[] a){System.out.println("hello");}}',
};

(async () => {
  console.log(`Provider: ${config.exec.provider}${isDocker ? "" : " @ " + config.exec.judge0Url}\n`);

  for (const [lang, code] of Object.entries(HELLO))
    await check(`hello world: ${lang}`, async () => { const { s } = await one(lang, code); ok(s.stdout.trim() === "hello", `got ${JSON.stringify(s.stdout)} / stderr ${JSON.stringify(s.stderr)}`); });

  await check("stdin is delivered", async () => {
    const { text } = await one("python", "print(int(input())*2)", "21\n"); ok(text === "42", `got ${JSON.stringify(text)}`);
  });
  await check("compile error is reported", async () => {
    const { s } = await one("cpp", "int main(){return nope;}"); ok(s.status === "compile_error" && /nope/.test(s.compileOutput), JSON.stringify(s));
  });
  await check("runtime error reports exit code + stderr", async () => {
    const { s } = await one("python", "import sys\nsys.stderr.write('bad\\n')\nsys.exit(3)"); ok(s.status === "runtime_error" && s.exitCode === 3 && /bad/.test(s.stderr), JSON.stringify(s));
  });
  await check(`infinite loop is stopped (~${config.exec.runTimeoutSec}s limit)`, async () => {
    const { s } = await one("python", "while True: pass"); ok(s.status === "time_limit", `status=${s.status}`);
  });
  await check("huge output is truncated, server survives", async () => {
    const { run } = await one("python", "while True: print('x'*1000)"); ok(run.outputTruncated || run.timedOut, "output was not capped");
  });
  await check("memory bomb is stopped", async () => {
    const { s } = await one("python", "a=[]\nwhile True: a.append(bytearray(50_000_000))"); ok(s.status !== "ok", `status=${s.status}`);
  });
  await check("fork bomb cannot take the host down", async () => {
    const t = Date.now();
    const { s } = await one("python", "import os\nwhile True:\n    try: os.fork()\n    except OSError: pass");
    ok(s.status !== "ok" && Date.now() - t < 60000, `status=${s.status}`);
  }, { dockerOnly: true });
  await check("network is blocked", async () => {
    const { text } = await one("python", "import socket\ntry:\n    socket.create_connection(('1.1.1.1',53),2); print('REACHED')\nexcept Exception as e: print('blocked')");
    ok(text.includes("blocked") && !text.includes("REACHED"), `got ${JSON.stringify(text)}`);
  }, { dockerOnly: true });
  await check("root filesystem is read-only", async () => {
    const { text } = await one("python", "try:\n    open('/pwned','w').write('x'); print('WROTE')\nexcept Exception: print('denied')");
    ok(text.includes("denied"), `got ${JSON.stringify(text)}`);
  }, { dockerOnly: true });
  await check("code runs as an unprivileged user (not root)", async () => {
    const { text } = await one("python", "import os; print(os.getuid())"); ok(text !== "0" && text !== "", `uid=${text}`);
  }, { dockerOnly: true });
  await check("concurrent runs are handled", async () => {
    const rs = await Promise.all([1, 2, 3, 4, 5].map((i) => one("python", `print(${i})`)));
    ok(rs.every((x, i) => x.text === String(i + 1)), "mixed up outputs");
  });
  if (isDocker)
    await check("no sandbox containers are left behind", async () => {
      const Docker = require("dockerode");
      const d = config.exec.dockerSocketPath ? new Docker({ socketPath: config.exec.dockerSocketPath }) : new Docker();
      const left = await d.listContainers({ all: true, filters: { label: ["rtc.sandbox"] } });
      ok(left.length === 0, `${left.length} leftover container(s)`);
    });

  const w = Math.max(...results.map((r) => r.name.length));
  console.log("");
  for (const r of results)
    console.log(`${r.status.padEnd(5)} ${r.name.padEnd(w)}  ${r.ms != null ? r.ms + " ms" : ""}${r.status === "FAIL" ? "   <- " + r.detail : ""}`);
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log(`\n${results.filter((r) => r.status === "PASS").length} passed, ${failed} failed, ${results.filter((r) => r.status === "SKIP").length} skipped`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("Smoke test crashed:", e.message); process.exit(2); });
