const { executeCode } = require("../services/execution.service");
const Submission = require("../models/Submission");
const User = require("../models/user");
const Room = require("../models/Room");

// =========================
// Run Code
// =========================

const runCode = async (req, res) => {
  try {
    const {
      language,
      code,
      input = "",
    } = req.body || {};

    console.log("===== RUN REQUEST =====");
    console.log(req.body);
    console.log("=======================");

    if (!language || !code) {
      return res.status(400).json({
        success: false,
        message: "Language and code are required.",
      });
    }

    const startTime = Date.now();

    const output = await executeCode(
      language.toLowerCase(),
      code,
      input
    );

    const executionTime = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      output,
      executionTime,
    });

  } catch (err) {
    console.error("Execution Error:", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Execution failed.",
    });
  }
};

// =========================
// Battle Submit
// =========================

const submitCode = async (req, res) => {
  try {
    const {
      language,
      code,
      input = "",
      expectedOutput,
      roomId,
      username,
      problemIndex = 0,
    } = req.body || {};

    console.log("===== SUBMISSION REQUEST =====");
    console.log(req.body);
    console.log("==============================");

    // =========================
    // Validation
    // =========================

    if (!language || !code) {
      return res.status(400).json({
        success: false,
        message: "Language and code are required.",
      });
    }

    if (!roomId || !username) {
      return res.status(400).json({
        success: false,
        message: "Room ID and username are required.",
      });
    }

    // =========================
    // Find User
    // =========================

    const user = await User.findOne({
      where: {
        name: username,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // =========================
    // Find Room
    // =========================

    const room = await Room.findOne({
      where: {
        roomCode: roomId,
      },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found.",
      });
    }

    // =========================
    // Execute Code
    // =========================

    const startTime = Date.now();

    const output = await executeCode(
      language.toLowerCase(),
      code,
      input
    );

    const executionTime = Date.now() - startTime;

    // =========================
    // Check Answer
    // =========================

    const actual = String(output || "").trim();
    const expected = String(expectedOutput || "").trim();

    const accepted = actual === expected;

    // =========================
    // Save Submission
    // =========================

    const submission = await Submission.create({
      roomId: room.id,
      userId: user.id,
      language: language.toLowerCase(),
      code,
      problemIndex,
      accepted,
      executionTime,
      submittedAt: new Date(),
    });

    console.log(
      `✅ Submission Saved: ${submission.id}`
    );

    // =========================
    // Response
    // =========================

    return res.status(200).json({
      success: true,
      accepted,
      output: actual,
      submissionId: submission.id,
      executionTime,
      message: accepted
        ? "Accepted"
        : "Wrong Answer",
    });

  } catch (err) {
    console.error("Submission Error:", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Submission failed.",
    });
  }
};

// =========================
// Export
// =========================

module.exports = {
  runCode,
  submitCode,
};