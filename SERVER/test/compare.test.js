const test = require("node:test");
const assert = require("node:assert");
const { outputsMatch } = require("../src/utils/compare");

test("tokens mode ignores whitespace layout", () => {
  assert.ok(outputsMatch("24 12 8 6\n", "24\n12\n8\n6"));
  assert.ok(!outputsMatch("24 12 8", "24 12 8 6"));
});
test("ignoreCase handles Python True/False", () => {
  assert.ok(outputsMatch("True\n", "true", { ignoreCase: true }));
  assert.ok(!outputsMatch("True\n", "true"));
});
test("numeric mode: 2 == 2.0", () => {
  assert.ok(outputsMatch("2", "2.0", { mode: "numeric" }));
  assert.ok(!outputsMatch("2.5", "2.0", { mode: "numeric" }));
});
test("lines-any-order", () => {
  assert.ok(outputsMatch("-1 0 1\n-1 -1 2\n", "-1 -1 2\n-1 0 1", { mode: "lines-any-order" }));
  assert.ok(outputsMatch("", "", { mode: "lines-any-order" }));
  assert.ok(!outputsMatch("1 2 3", "", { mode: "lines-any-order" }));
});
