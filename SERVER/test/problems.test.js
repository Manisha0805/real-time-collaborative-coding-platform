const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { problems } = require("../src/data/problems");
const { outputsMatch } = require("../src/utils/compare");

const nums = (l) => l.trim().split(/\s+/).filter(Boolean).map(Number);

// Independent reference solutions (stdin text -> stdout text)
const ref = [
  (i) => { const [a, k] = i.trim().split("\n"); const x = nums(a), K = +k; let s = x.slice(0, K).reduce((p, c) => p + c, 0), b = s; for (let j = K; j < x.length; j++) { s += x[j] - x[j - K]; b = Math.max(b, s); } return String(b); },
  (i) => { const [a, t] = i.trim().split("\n"); const x = nums(a); for (let p = 0; p < x.length; p++) for (let q = p + 1; q < x.length; q++) if (x[p] + x[q] === +t) return `${p} ${q}`; return ""; },
  (i) => { const s = i.trim(); let best = 0, st = 0; const m = new Map(); for (let j = 0; j < s.length; j++) { if (m.has(s[j]) && m.get(s[j]) >= st) st = m.get(s[j]) + 1; m.set(s[j], j); best = Math.max(best, j - st + 1); } return String(best); },
  (i) => [...i.trim()].reverse().join(""),
  (i) => { const n = +i.trim(); if (n < 0) return "false"; const s = String(n); return String(s === [...s].reverse().join("")); },
  (i) => { const [a, b] = i.trim().split("\n"); return [...nums(a), ...nums(b)].sort((p, q) => p - q).join(" "); },
  (i) => { const x = nums(i); let mn = Infinity, best = 0; for (const v of x) { mn = Math.min(mn, v); best = Math.max(best, v - mn); } return String(best); },
  (i) => { const x = nums(i); return x.map((_, j) => x.reduce((p, c, k) => (k === j ? p : p * c), 1)).join(" "); },
  (i) => { const x = nums(i).sort((a, b) => a - b); const out = new Set(); for (let a = 0; a < x.length; a++) for (let b = a + 1; b < x.length; b++) for (let c = b + 1; c < x.length; c++) if (x[a] + x[b] + x[c] === 0) out.add(`${x[a]} ${x[b]} ${x[c]}`); return [...out].join("\n"); },
  (i) => { const L = i.trim().split("\n"); const [m, n] = nums(L[0]); const g = L.slice(1, 1 + m).map((r) => [...r]); let c = 0; const dfs = (r, q) => { if (r < 0 || q < 0 || r >= m || q >= n || g[r][q] !== "1") return; g[r][q] = "0"; dfs(r + 1, q); dfs(r - 1, q); dfs(r, q + 1); dfs(r, q - 1); }; for (let r = 0; r < m; r++) for (let q = 0; q < n; q++) if (g[r][q] === "1") { c++; dfs(r, q); } return String(c); },
  (i) => { const st = []; const pair = { ")": "(", "]": "[", "}": "{" }; for (const ch of i.trim()) { if ("([{".includes(ch)) st.push(ch); else if (st.pop() !== pair[ch]) return "false"; } return String(st.length === 0); },
  (i) => { const n = +i.trim(); let a = 1, b = 1; for (let j = 2; j <= n; j++) [a, b] = [b, a + b]; return String(b); },
  (i) => { const [a, t] = i.trim().split("\n"); const c = nums(a), T = +t; const dp = Array(T + 1).fill(Infinity); dp[0] = 0; for (let s = 1; s <= T; s++) for (const x of c) if (x <= s) dp[s] = Math.min(dp[s], dp[s - x] + 1); return String(dp[T] === Infinity ? -1 : dp[T]); },
  (i) => { const L = i.trim().split("\n"); const cap = +L[0], q = +L[1]; const m = new Map(); const out = []; for (const line of L.slice(2, 2 + q)) { const [op, k, v] = line.split(" "); if (op === "put") { m.delete(k); m.set(k, v); if (m.size > cap) m.delete(m.keys().next().value); } else if (m.has(k)) { const val = m.get(k); m.delete(k); m.set(k, val); out.push(val); } else out.push("-1"); } return out.join("\n"); },
  (i) => { const [a, b] = i.trim().split("\n"); const x = [...nums(a), ...nums(b)].sort((p, q) => p - q); const n = x.length; return String(n % 2 ? x[(n - 1) / 2] : (x[n / 2 - 1] + x[n / 2]) / 2); },
];

test("there is a reference solution for every problem", () => assert.strictEqual(ref.length, problems.length));

problems.forEach((p, idx) => {
  test(`problem ${idx} "${p.title}": reference solution reproduces every expected output`, () => {
    assert.ok(p.tests.length >= 2);
    p.tests.forEach((t, k) => {
      const got = ref[idx](t.input);
      assert.ok(outputsMatch(got, t.output, p.compare), `test ${k}: reference gave ${JSON.stringify(got)}, bank says ${JSON.stringify(t.output)}`);
    });
  });
});

test("server problem order matches client ProblemPanel.jsx titles", (t) => {
  const file = path.join(__dirname, "../../CLIENT/src/Components/ProblemPanel.jsx");
  if (!fs.existsSync(file)) return t.skip("client not present");
  const titles = [...fs.readFileSync(file, "utf8").matchAll(/^\s*title:\s*"([^"]+)"/gm)].map((m) => m[1]);
  assert.deepStrictEqual(titles, problems.map((p) => p.title));
});
