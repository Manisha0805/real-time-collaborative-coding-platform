const express = require("express");

const {
  getUserStats,
} = require("../controllers/user.controller");

const router = express.Router();

// =========================
// User Statistics
// =========================

router.get("/:userId/stats", getUserStats);

module.exports = router;