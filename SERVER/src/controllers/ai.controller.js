const { reviewCode, AIUnavailableError } = require("../services/ai.service");

const MAX_CODE_CHARS = 30000;

const aiCodeReview = async (req, res) => {
  const { language, code } = req.body || {};

  if (typeof language !== "string" || typeof code !== "string" || !language || !code.trim())
    return res.status(400).json({ success: false, message: "Language and code are required." });
  if (code.length > MAX_CODE_CHARS)
    return res.status(413).json({ success: false, message: `Code is too long for review (max ${MAX_CODE_CHARS} characters).` });

  try {
    const review = await reviewCode({ language: language.toLowerCase().slice(0, 30), code });
    return res.status(200).json({ success: true, review });
  } catch (error) {
    if (error instanceof AIUnavailableError)
      return res.status(503).json({ success: false, message: error.message });
    // Log details server-side only; never forward provider error text to the browser
    console.error("AI review error:", error.message);
    return res.status(502).json({ success: false, message: "AI review failed. Please try again." });
  }
};

module.exports = { aiCodeReview };
