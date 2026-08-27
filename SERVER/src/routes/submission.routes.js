const express = require("express");

const {
  getMySubmissions,
  getRoomSubmissions,
  getSubmissionById,
} = require("../controllers/submission.controller");

const router = express.Router();

// User ki submission history
router.get("/user/:username", getMySubmissions);

// Room ki saari submissions
router.get("/room/:roomCode", getRoomSubmissions);

// Single submission
router.get("/:id", getSubmissionById);

module.exports = router;