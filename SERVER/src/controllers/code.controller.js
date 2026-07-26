const axios = require("axios");

const languageConfig = {
  javascript: { language: "javascript", version: "18.15.0" },
  typescript: { language: "typescript", version: "5.0.3" },
  python: { language: "python", version: "3.10.0" },
  cpp: { language: "cpp", version: "10.2.0" },
  c: { language: "c", version: "10.2.0" },
  java: { language: "java", version: "15.0.2" },
  php: { language: "php", version: "8.2.3" },
  go: { language: "go", version: "1.20.2" },
  rust: { language: "rust", version: "1.68.2" },
  ruby: { language: "ruby", version: "3.0.1" },
};

const runCode = async (req, res) => {
  try {
    const { language, code, input = "" } = req.body;

    if (!language || !code) {
      return res.status(400).json({
        error: "Language and code are required.",
      });
    }

    const config = languageConfig[language];

    if (!config) {
      return res.status(400).json({
        error: `Unsupported language: ${language}`,
      });
    }

    const response = await axios.post(
      "https://emkc.org/api/v2/piston/execute",
      {
        language: config.language,
        version: config.version,
        files: [
          {
            content: code,
          },
        ],
        stdin: input,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const result = response.data.run;

    return res.status(200).json({
      output:
        result.stdout ||
        result.stderr ||
        result.output ||
        result.compile_output ||
        "No Output",
    });
  } catch (err) {
    console.error(err.response?.data || err.message);

    return res.status(500).json({
      error: err.response?.data || err.message,
    });
  }
};

module.exports = {
  runCode,
};