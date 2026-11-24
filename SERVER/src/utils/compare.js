// Output comparison used by the judge.
// Modes:
//   tokens           whitespace-insensitive token comparison (default)
//   lines            line-by-line, trailing whitespace / trailing blank lines ignored
//   lines-any-order  same lines in any order (e.g. 3Sum triplets)
//   numeric          tokens compared as numbers (1e-6 tolerance): "2" == "2.0"
// Option ignoreCase makes comparisons case-insensitive (true/True).

const norm = (s) => String(s ?? "").replace(/\r\n?/g, "\n");
const lines = (s) => {
  const arr = norm(s).split("\n").map((l) => l.replace(/\s+$/, ""));
  while (arr.length && arr[arr.length - 1] === "") arr.pop();
  return arr;
};
const tokens = (s) => norm(s).split(/\s+/).filter(Boolean);

function outputsMatch(actual, expected, { mode = "tokens", ignoreCase = false } = {}) {
  const c = (x) => (ignoreCase ? x.toLowerCase() : x);

  if (mode === "lines") {
    const a = lines(actual).map(c);
    const e = lines(expected).map(c);
    return a.length === e.length && a.every((v, i) => v === e[i]);
  }
  if (mode === "lines-any-order") {
    const a = lines(actual).map((l) => c(l.trim().replace(/\s+/g, " "))).sort();
    const e = lines(expected).map((l) => c(l.trim().replace(/\s+/g, " "))).sort();
    return a.length === e.length && a.every((v, i) => v === e[i]);
  }
  if (mode === "numeric") {
    const a = tokens(actual);
    const e = tokens(expected);
    return (
      a.length === e.length &&
      a.every((v, i) => {
        const x = Number(v);
        const y = Number(e[i]);
        return Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - y) <= 1e-6;
      })
    );
  }
  const a = tokens(actual).map(c);
  const e = tokens(expected).map(c);
  return a.length === e.length && a.every((v, i) => v === e[i]);
}

module.exports = { outputsMatch };
