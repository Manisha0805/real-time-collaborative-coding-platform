const express = require("express");
const { getMySubmissions, getRoomSubmissions, getSubmissionById } = require("../controllers/submission.controller");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/user/:username", getMySubmissions);
router.get("/room/:roomCode", getRoomSubmissions);
router.get("/:id", getSubmissionById);

module.exports = router;
