// Authoritative judge data for Battle Mode. The index of each entry MUST match
// the order of the `problems` array in CLIENT/src/Components/ProblemPanel.jsx.
//
// The client never sees (or sends) expected outputs. Test cases for problem 0
// come from the original project; problems 1-14 had no test cases or defined
// I/O format, so the formats below follow the convention already used by
// problem 0:   arrays -> one line, space separated; scalars -> own line.
// The same formats are documented to players in ProblemPanel.jsx.

const problems = [
  { // 0
    title: "Maximum Sum Subarray of Size K",
    compare: { mode: "tokens" },
    tests: [
      { input: "2 1 5 1 3 2\n3\n", output: "9" },
      { input: "2 3 4 1 5\n2\n", output: "7" },
      { input: "-1 -2 -3 -4\n2\n", output: "-3" },
    ],
  },
  { // 1  output: the two indices, ascending, space separated
    title: "Two Sum",
    compare: { mode: "tokens" },
    tests: [
      { input: "2 7 11 15\n9\n", output: "0 1" },
      { input: "3 2 4\n6\n", output: "1 2" },
      { input: "3 3\n6\n", output: "0 1" },
    ],
  },
  { // 2
    title: "Longest Substring Without Repeating Characters",
    compare: { mode: "tokens" },
    tests: [
      { input: "abcabcbb\n", output: "3" },
      { input: "bbbbb\n", output: "1" },
      { input: "pwwkew\n", output: "3" },
    ],
  },
  { // 3
    title: "Reverse String",
    compare: { mode: "tokens" },
    tests: [
      { input: "hello\n", output: "olleh" },
      { input: "Hannah\n", output: "hannaH" },
      { input: "a\n", output: "a" },
    ],
  },
  { // 4  output: true / false
    title: "Palindrome Number",
    compare: { mode: "tokens", ignoreCase: true },
    tests: [
      { input: "121\n", output: "true" },
      { input: "-121\n", output: "false" },
      { input: "10\n", output: "false" },
    ],
  },
  { // 5
    title: "Merge Sorted Arrays",
    compare: { mode: "tokens" },
    tests: [
      { input: "1 3 5\n2 4 6\n", output: "1 2 3 4 5 6" },
      { input: "1 1 2\n1 3\n", output: "1 1 1 2 3" },
      { input: "0\n5 6\n", output: "0 5 6" },
    ],
  },
  { // 6
    title: "Best Time to Buy and Sell Stock",
    compare: { mode: "tokens" },
    tests: [
      { input: "7 1 5 3 6 4\n", output: "5" },
      { input: "7 6 4 3 1\n", output: "0" },
      { input: "2 4 1\n", output: "2" },
    ],
  },
  { // 7
    title: "Product of Array Except Self",
    compare: { mode: "tokens" },
    tests: [
      { input: "1 2 3 4\n", output: "24 12 8 6" },
      { input: "-1 1 0 -3 3\n", output: "0 0 9 0 0" },
      { input: "2 3\n", output: "3 2" },
    ],
  },
  { // 8  output: one triplet per line ("a b c", ascending), lines in any order; nothing if none
    title: "3Sum",
    compare: { mode: "lines-any-order" },
    tests: [
      { input: "-1 0 1 2 -1 -4\n", output: "-1 -1 2\n-1 0 1" },
      { input: "0 1 1\n", output: "" },
      { input: "0 0 0 0\n", output: "0 0 0" },
    ],
  },
  { // 9  input: "m n" then m rows of n characters (0/1, no spaces)
    title: "Number of Islands",
    compare: { mode: "tokens" },
    tests: [
      { input: "3 3\n110\n100\n001\n", output: "2" },
      { input: "4 5\n11000\n11000\n00100\n00011\n", output: "3" },
      { input: "1 1\n0\n", output: "0" },
    ],
  },
  { // 10
    title: "Valid Parentheses",
    compare: { mode: "tokens", ignoreCase: true },
    tests: [
      { input: "()[]{}\n", output: "true" },
      { input: "(]\n", output: "false" },
      { input: "([)]\n", output: "false" },
    ],
  },
  { // 11
    title: "Climbing Stairs",
    compare: { mode: "tokens" },
    tests: [
      { input: "5\n", output: "8" },
      { input: "2\n", output: "2" },
      { input: "45\n", output: "1836311903" },
    ],
  },
  { // 12  output: minimum coins, or -1
    title: "Coin Change",
    compare: { mode: "tokens" },
    tests: [
      { input: "1 2 5\n11\n", output: "3" },
      { input: "2\n3\n", output: "-1" },
      { input: "1\n0\n", output: "0" },
    ],
  },
  { // 13  input: capacity, q, then q lines "put k v" / "get k"; output: result of each get, one per line (-1 if missing)
    title: "LRU Cache",
    compare: { mode: "lines" },
    tests: [
      { input: "2\n3\nput 1 1\nput 2 2\nget 1\n", output: "1" },
      { input: "2\n9\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 2\nput 4 4\nget 1\nget 3\nget 4\n", output: "1\n-1\n-1\n3\n4" },
      { input: "1\n5\nput 2 1\nget 2\nput 3 2\nget 2\nget 3\n", output: "1\n-1\n2" },
    ],
  },
  { // 14  output: median (compared numerically, so "2" == "2.0")
    title: "Median of Two Sorted Arrays",
    compare: { mode: "numeric" },
    tests: [
      { input: "1 3\n2\n", output: "2.0" },
      { input: "1 2\n3 4\n", output: "2.5" },
      { input: "0 0\n0 0\n", output: "0.0" },
    ],
  },
];

module.exports = { problems, getProblem: (i) => (Number.isInteger(i) ? problems[i] : undefined) };
