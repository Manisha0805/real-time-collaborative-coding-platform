const express = require("express");

const router = express.Router();

const {
  runCode,
  submitCode,
} = require("../controllers/code.controller");
// =========================
// Code Execution Routes
// =========================

// Execute Source Code
router.post("/run", runCode);

// Future Routes
router.post("/submit", submitCode);
// router.get("/history/:roomId", getExecutionHistory);

module.exports = router;