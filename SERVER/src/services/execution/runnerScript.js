// The sandbox "runner": a small POSIX sh script executed INSIDE the container.
// User code, stdin data and limits are passed through environment variables
// (base64 for user data) - they are never interpolated into the script text,
// so there is no shell-injection surface.
//
// Output protocol (written by the script to the container's stdout; the user
// program's own stdout/stderr are redirected to files and re-emitted framed by
// byte length, so program output can never be mistaken for framing):
//   @@C <compileExit> <len>\n<len bytes compiler output>
//   @@T <idx> <exit> <ms> <outLen> <errLen> <truncated> <timedOut>\n<out><err>
//   @@END\n

const RUNNER_SCRIPT = `
set -u
cd "\${SANDBOX_DIR:-/sandbox}" || exit 99
printf '%s' "$SRC_B64" | base64 -d > "$SRC_FILE" || exit 98

if [ -n "$COMPILE_CMD" ]; then
  timeout -s KILL "$COMPILE_TIMEOUT" $COMPILE_CMD > .c.out 2>&1
  crc=$?
  head -c "$MAX_OUT" .c.out > .c.cut
  clen=$(wc -c < .c.cut)
  printf '@@C %s %s\\n' "$crc" "$clen"
  cat .c.cut
  if [ "$crc" -ne 0 ]; then printf '@@END\\n'; exit 0; fi
else
  printf '@@C 0 0\\n'
fi

i=0
while [ "$i" -lt "$NTESTS" ]; do
  eval "b64=\\"\\\${IN_$i:-}\\""
  printf '%s' "$b64" | base64 -d > .in
  t0=$(date +%s%N)
  timeout -s KILL "$RUN_TIMEOUT" $RUN_CMD < .in > .out 2> .err
  rc=$?
  t1=$(date +%s%N)
  ms=$(( (t1 - t0) / 1000000 ))
  olen=$(wc -c < .out)
  elen=$(wc -c < .err)
  trunc=0
  if [ "$olen" -gt "$MAX_OUT" ] || [ "$elen" -gt "$MAX_OUT" ]; then trunc=1; fi
  head -c "$MAX_OUT" .out > .out2
  head -c "$MAX_OUT" .err > .err2
  o2=$(wc -c < .out2)
  e2=$(wc -c < .err2)
  to=0
  if [ "$rc" -eq 137 ] && [ "$ms" -ge $(( RUN_TIMEOUT * 1000 - 150 )) ]; then to=1; fi
  printf '@@T %s %s %s %s %s %s %s\\n' "$i" "$rc" "$ms" "$o2" "$e2" "$trunc" "$to"
  cat .out2 .err2
  i=$((i + 1))
done
printf '@@END\\n'
`;

const b64 = (s) => Buffer.from(String(s), "utf8").toString("base64");

/** Environment for the runner (object of KEY -> VALUE). */
function buildEnv({ lang, code, inputs, limits }) {
  const env = {
    SRC_B64: b64(code),
    SRC_FILE: lang.fileName,
    COMPILE_CMD: lang.compile || "",
    RUN_CMD: lang.run,
    COMPILE_TIMEOUT: String(limits.compileTimeoutSec),
    RUN_TIMEOUT: String(limits.runTimeoutSec),
    NTESTS: String(inputs.length),
    MAX_OUT: String(limits.maxOutputBytes),
    HOME: "/sandbox",
    PYTHONDONTWRITEBYTECODE: "1",
    LANG: "C.UTF-8",
  };
  inputs.forEach((inp, i) => {
    env[`IN_${i}`] = b64(inp);
  });
  return env;
}

/** Parse the framed output. Returns what could be parsed plus a `complete` flag. */
function parseRunnerOutput(buf) {
  const result = { compile: null, runs: [], complete: false };
  let pos = 0;

  const readLine = () => {
    const nl = buf.indexOf(0x0a, pos);
    if (nl === -1) return null;
    const line = buf.slice(pos, nl).toString("utf8");
    pos = nl + 1;
    return line;
  };
  const take = (n) => {
    if (pos + n > buf.length) return null;
    const s = buf.slice(pos, pos + n);
    pos += n;
    return s;
  };

  while (pos < buf.length) {
    const header = readLine();
    if (header === null) break;
    const p = header.split(" ");

    if (p[0] === "@@C") {
      const body = take(Number(p[2]));
      if (!body) break;
      result.compile = { exitCode: Number(p[1]), output: body.toString("utf8") };
    } else if (p[0] === "@@T") {
      const outLen = Number(p[4]);
      const errLen = Number(p[5]);
      const out = take(outLen);
      const err = out && take(errLen);
      if (!out || !err) break;
      result.runs.push({
        index: Number(p[1]),
        exitCode: Number(p[2]),
        timeMs: Number(p[3]),
        stdout: out.toString("utf8"),
        stderr: err.toString("utf8"),
        outputTruncated: p[6] === "1",
        timedOut: p[7] === "1",
      });
    } else if (p[0] === "@@END") {
      result.complete = true;
      break;
    } else {
      break; // protocol violation
    }
  }
  return result;
}

module.exports = { RUNNER_SCRIPT, buildEnv, parseRunnerOutput };
