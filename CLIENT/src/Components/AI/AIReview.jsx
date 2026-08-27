import { useState } from "react";
import { reviewCodeWithAI } from "../../Services/aiService";

function AIReview({ language, code, onBack }) {
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleReview = async () => {
    if (!code || !code.trim()) {
      setError("Please write some code first.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setReview(null);

      const data = await reviewCodeWithAI(language, code);

      setReview(data.review);
    } catch (err) {
      console.error("AI Review Error:", err);
      setError(err.message || "AI review failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-900 text-slate-100 p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">

        <div>
          <h2 className="text-2xl font-bold text-white">
            🤖 AI Code Review
          </h2>

          <p className="text-sm text-slate-400 mt-1">
            Get intelligent feedback on your {language} code
          </p>
        </div>

        <button
          onClick={onBack}
          type="button"
          className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition"
        >
          ← Back
        </button>
      </div>

      {/* Analyze Button */}
      <button
        onClick={handleReview}
        disabled={loading}
        type="button"
        className="mb-6 px-5 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 disabled:cursor-not-allowed text-white font-semibold transition"
      >
        {loading ? "🤖 Reviewing..." : "🤖 Analyze My Code"}
      </button>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300">
          ❌ {error}
        </div>
      )}

      {/* Review */}
      {review && (
        <div className="space-y-5">

          {/* Title */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-xl font-bold text-white">
              AI Analysis Result
            </h3>

            <p className="text-sm text-slate-400 mt-1">
              Language: {language}
            </p>
          </div>

          {/* Summary */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h4 className="font-semibold text-blue-400 mb-2">
              Summary
            </h4>

            <p className="text-slate-200 leading-relaxed">
              {review.summary}
            </p>
          </div>

          {/* Complexity + Score */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <p className="text-sm text-slate-400">
                Quality Score
              </p>

              <p className="text-3xl font-bold text-green-400 mt-2">
                {review.qualityScore}/10
              </p>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <p className="text-sm text-slate-400">
                Time Complexity
              </p>

              <p className="text-xl font-bold text-yellow-400 mt-2">
                {review.timeComplexity}
              </p>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <p className="text-sm text-slate-400">
                Space Complexity
              </p>

              <p className="text-xl font-bold text-purple-400 mt-2">
                {review.spaceComplexity}
              </p>
            </div>

          </div>

          {/* Bugs */}
          <ReviewSection
            title="🐛 Bugs"
            items={review.bugs}
            emptyMessage="No bugs found."
          />

          {/* Security */}
          <ReviewSection
            title="🔐 Security Issues"
            items={review.securityIssues}
            emptyMessage="No security issues found."
          />

          {/* Suggestions */}
          <ReviewSection
            title="💡 Suggestions"
            items={review.suggestions}
            emptyMessage="No suggestions."
          />

          {/* Best Practices */}
          <ReviewSection
            title="✅ Best Practices"
            items={review.bestPractices}
            emptyMessage="No additional recommendations."
          />

        </div>
      )}

      {/* Initial State */}
      {!review && !loading && !error && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">

          <div className="text-5xl mb-4">
            🤖
          </div>

          <h3 className="text-xl font-semibold text-white">
            Ready to analyze your code
          </h3>

          <p className="text-slate-400 mt-2">
            Click "Analyze My Code" to get AI-powered feedback.
          </p>

        </div>
      )}

    </div>
  );
}


/* =========================
   Review Section
========================= */

function ReviewSection({ title, items, emptyMessage }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">

      <h4 className="font-semibold text-white mb-3">
        {title}
      </h4>

      {items?.length > 0 ? (
        <ul className="space-y-3">

          {items.map((item, index) => (
            <li
              key={index}
              className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-300 leading-relaxed"
            >
              {item}
            </li>
          ))}

        </ul>
      ) : (
        <p className="text-slate-400">
          {emptyMessage}
        </p>
      )}

    </div>
  );
}

export default AIReview;