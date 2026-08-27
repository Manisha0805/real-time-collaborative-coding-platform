import { useState } from "react";
import {
  FaArrowLeft,
  FaArrowRight,
  FaTag,
  FaClock,
} from "react-icons/fa";

const problems = [
  {
    title: "Maximum Sum Subarray of Size K",
    difficulty: "Easy",
    time: "15 min",
    tags: ["Sliding Window", "Array"],
    statement:
      "Given an array of integers and an integer K, find the maximum sum of any contiguous subarray of size K.",
    example: `Input:
arr = [2,1,5,1,3,2]
K = 3

Output:
9`,
    constraints:
      "1 ≤ N ≤ 10⁵\n1 ≤ K ≤ N\n-10⁴ ≤ arr[i] ≤ 10⁴",
 testCases: [
  {
    input: "2 1 5 1 3 2\n3",
    expectedOutput: "9",
  },
  {
    input: "2 3 4 1 5\n2",
    expectedOutput: "7",
  },
],
    },

  {
    title: "Two Sum",
    difficulty: "Easy",
    time: "10 min",
    tags: ["Array", "HashMap"],
    statement:
      "Given an array of integers nums and a target, return the indices of the two numbers such that they add up to target.",
    example: `Input:
nums = [2,7,11,15]
target = 9

Output:
[0,1]`,
    constraints:
      "2 ≤ nums.length ≤ 10⁴\nOnly one valid answer exists.",
  },

  {
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    time: "20 min",
    tags: ["Sliding Window", "String"],
    statement:
      "Find the length of the longest substring without repeating characters.",
    example: `Input:
abcabcbb

Output:
3`,
    constraints:
      "0 ≤ s.length ≤ 5 × 10⁴",
  },
  {
  title: "Reverse String",
  difficulty: "Easy",
  time: "5 min",
  tags: ["String", "Two Pointers"],
  statement:
    "Write a function to reverse a string without using any built-in reverse function.",
  example: `Input:
hello

Output:
olleh`,
  constraints:
    "1 ≤ s.length ≤ 10⁵",
},

{
  title: "Palindrome Number",
  difficulty: "Easy",
  time: "10 min",
  tags: ["Math"],
  statement:
    "Determine whether an integer is a palindrome without converting it to a string.",
  example: `Input:
121

Output:
true`,
  constraints:
    "-2³¹ ≤ x ≤ 2³¹-1",
},

{
  title: "Merge Sorted Arrays",
  difficulty: "Easy",
  time: "15 min",
  tags: ["Array", "Sorting"],
  statement:
    "Merge two sorted arrays into a single sorted array.",
  example: `Input:
[1,3,5]
[2,4,6]

Output:
[1,2,3,4,5,6]`,
  constraints:
    "Arrays are sorted in ascending order.",
},

{
  title: "Best Time to Buy and Sell Stock",
  difficulty: "Easy",
  time: "20 min",
  tags: ["Array", "Greedy"],
  statement:
    "Find the maximum profit by buying and selling a stock exactly once.",
  example: `Input:
[7,1,5,3,6,4]

Output:
5`,
  constraints:
    "1 ≤ prices.length ≤ 10⁵",
},

{
  title: "Product of Array Except Self",
  difficulty: "Medium",
  time: "25 min",
  tags: ["Array", "Prefix Sum"],
  statement:
    "Return an array where each element is the product of all elements except itself.",
  example: `Input:
[1,2,3,4]

Output:
[24,12,8,6]`,
  constraints:
    "Do not use division.",
},

{
  title: "3Sum",
  difficulty: "Medium",
  time: "30 min",
  tags: ["Array", "Two Pointers"],
  statement:
    "Find all unique triplets whose sum equals zero.",
  example: `Input:
[-1,0,1,2,-1,-4]

Output:
[[-1,-1,2],[-1,0,1]]`,
  constraints:
    "1 ≤ nums.length ≤ 3000",
},

{
  title: "Number of Islands",
  difficulty: "Medium",
  time: "30 min",
  tags: ["DFS", "BFS", "Graph"],
  statement:
    "Count the number of islands in a binary grid.",
  example: `Input:
grid=[
['1','1','0'],
['1','0','0'],
['0','0','1']
]

Output:
2`,
  constraints:
    "1 ≤ m,n ≤ 300",
},

{
  title: "Valid Parentheses",
  difficulty: "Easy",
  time: "10 min",
  tags: ["Stack"],
  statement:
    "Determine if the input string has valid parentheses.",
  example: `Input:
()[]{}

Output:
true`,
  constraints:
    "1 ≤ s.length ≤ 10⁴",
},

{
  title: "Climbing Stairs",
  difficulty: "Easy",
  time: "15 min",
  tags: ["DP"],
  statement:
    "Find the number of distinct ways to climb to the top.",
  example: `Input:
5

Output:
8`,
  constraints:
    "1 ≤ n ≤ 45",
},

{
  title: "Coin Change",
  difficulty: "Medium",
  time: "35 min",
  tags: ["Dynamic Programming"],
  statement:
    "Find the minimum number of coins needed to make a given amount.",
  example: `Input:
coins=[1,2,5]
amount=11

Output:
3`,
  constraints:
    "1 ≤ amount ≤ 10⁴",
},

{
  title: "LRU Cache",
  difficulty: "Hard",
  time: "45 min",
  tags: ["HashMap", "Linked List"],
  statement:
    "Design an LRU Cache supporting O(1) get and put operations.",
  example: `Input:
put(1,1)
put(2,2)
get(1)

Output:
1`,
  constraints:
    "Capacity ≤ 3000",
},

{
  title: "Median of Two Sorted Arrays",
  difficulty: "Hard",
  time: "50 min",
  tags: ["Binary Search"],
  statement:
    "Find the median of two sorted arrays in O(log(min(n,m))).",
  example: `Input:
[1,3]
[2]

Output:
2.0`,
  constraints:
    "0 ≤ m,n ≤ 1000",
},
];

function ProblemPanel({ onSubmit, loading }) {  const [currentProblem, setCurrentProblem] = useState(0);

  const problem = problems[currentProblem];

  return (
    <div className="h-full bg-slate-900 flex flex-col">

      {/* Header */}
      <div className="border-b border-slate-700 p-5">

        <h2 className="text-2xl font-bold">
          Problem Statement
        </h2>

        <div className="flex items-center gap-3 mt-3">

          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold
            ${
              problem.difficulty === "Easy"
                ? "bg-green-600"
                : problem.difficulty === "Medium"
                ? "bg-yellow-500 text-black"
                : "bg-red-600"
            }`}
          >
            {problem.difficulty}
          </span>

          <span className="flex items-center gap-2 text-slate-400">
            <FaClock />
            {problem.time}
          </span>

        </div>

      </div>

      {/* Scrollable */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">

        {/* Title */}
        <div>

          <h1 className="text-2xl font-bold text-blue-400">
            {problem.title}
          </h1>

        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">

          {problem.tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full text-sm"
            >
              <FaTag />
              {tag}
            </span>
          ))}

        </div>

        {/* Description */}
        <div className="bg-slate-800 rounded-xl p-4">

          <h3 className="font-semibold text-lg mb-3">
            Description
          </h3>

          <p className="text-slate-300 leading-7">
            {problem.statement}
          </p>

        </div>

        {/* Example */}
        <div className="bg-slate-800 rounded-xl p-4">

          <h3 className="font-semibold text-lg mb-3">
            Example
          </h3>

          <pre className="bg-black rounded-lg p-4 overflow-auto text-green-400 text-sm">
            {problem.example}
          </pre>

        </div>

        {/* Constraints */}
        <div className="bg-slate-800 rounded-xl p-4">

          <h3 className="font-semibold text-lg mb-3">
            Constraints
          </h3>

          <pre className="text-slate-300 whitespace-pre-wrap">
            {problem.constraints}
          </pre>

        </div>

      </div>

      {/* Footer */}
      <div className="border-t border-slate-700 p-4">

        {/* Progress */}
        <div className="w-full bg-slate-700 rounded-full h-2 mb-4">

          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{
              width: `${((currentProblem + 1) / problems.length) * 100}%`,
            }}
          />

        </div>

        <div className="flex items-center justify-between">

          <button
            disabled={currentProblem === 0}
            onClick={() => setCurrentProblem((prev) => prev - 1)}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 px-4 py-2 rounded-lg"
          >
            <FaArrowLeft />
            Previous
          </button>

          <span className="text-slate-400">
            {currentProblem + 1} / {problems.length}
          </span>

<button
  onClick={onSubmit}
  disabled={loading}
  className="w-full mb-3 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 font-semibold text-white"
>
  {loading ? "Submitting..." : "Submit Solution"}
</button>

          <button
            disabled={currentProblem === problems.length - 1}
            onClick={() => setCurrentProblem((prev) => prev + 1)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 px-4 py-2 rounded-lg"
          >
            Next
            <FaArrowRight />
          </button>

        </div>

      </div>

    </div>
  );
}

export default ProblemPanel;