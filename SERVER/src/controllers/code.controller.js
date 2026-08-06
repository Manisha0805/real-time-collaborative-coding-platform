const { executeCode } = require("../services/execution.service");

const runCode = async (req, res) => {
  try {
    const { language, code, input = "" } = req.body;

    console.log("===== RUN REQUEST =====");
    console.log(req.body);
    console.log("=======================");

    if (!language || !code) {
      return res.status(400).json({
        success: false,
        message: "Language and code are required.",
      });
    }

    const output = await executeCode(
      language.toLowerCase(),
      code,
      input
    );

    return res.status(200).json({
      success: true,
      output,
    });

  } catch (err) {
    console.error("Execution Error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  runCode,
};