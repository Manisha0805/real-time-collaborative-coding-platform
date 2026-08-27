const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const reviewCode = async ({ language, code }) => {
  if (!language || !code) {
    throw new Error("Language and code are required.");
  }

  const prompt = `
You are an expert programming mentor and code reviewer.

Review the following ${language} code.

CODE:
${code}

Return the review in this exact JSON format:

{
  "summary": "short overall review",
  "qualityScore": 0,
  "timeComplexity": "O(...)",
  "spaceComplexity": "O(...)",
  "bugs": [],
  "securityIssues": [],
  "suggestions": [],
  "bestPractices": []
}

Rules:
- qualityScore must be between 0 and 10.
- Identify actual bugs only.
- Do not invent bugs.
- Explain time and space complexity accurately.
- Keep suggestions practical.
- Return ONLY valid JSON.
`;

  try {
    const model = genAI.getGenerativeModel({
model: "gemini-3.6-flash",
    });

    const result = await model.generateContent(prompt);

    const response = result.response;

    let text = response.text().trim();

    // Gemini sometimes returns JSON inside ```json ... ```
    if (text.startsWith("```")) {
      text = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
    }

    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error("❌ AI JSON Parse Error:");
      console.error(text);

      throw new Error("AI returned an invalid JSON response.");
    }
  } catch (error) {
    console.error("❌ Gemini API Error:", error);

    throw new Error(
      error.message || "Failed to generate AI code review."
    );
  }
};

module.exports = {
  reviewCode,
};