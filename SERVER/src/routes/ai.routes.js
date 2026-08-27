const express = require("express");

const { aiCodeReview } = require("../controllers/ai.controller");

const router = express.Router();

// Test AI route
router.get("/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AI route working",
  });
});

// AI Code Review
router.post("/review", aiCodeReview);

module.exports = router;