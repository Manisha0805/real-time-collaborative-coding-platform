const { reviewCode } = require("../services/ai.service");

const aiCodeReview = async (req, res) => {
  try {
    const { language, code } = req.body || {};

    console.log("========== AI CODE REVIEW ==========");
    console.log("Language:", language);
    console.log("Code length:", code?.length || 0);

    if (!language || !code) {
      return res.status(400).json({
        success: false,
        message: "Language and code are required.",
      });
    }

    if (!code.trim()) {
      return res.status(400).json({
        success: false,
        message: "Code cannot be empty.",
      });
    }

    const review = await reviewCode({
      language: language.toLowerCase(),
      code,
    });

    console.log("✅ AI Review Generated");

    return res.status(200).json({
      success: true,
      review,
    });
  } catch (error) {
    console.error("❌ AI Code Review Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "AI code review failed.",
    });
  }
};

module.exports = {
  aiCodeReview,
};