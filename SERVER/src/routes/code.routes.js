const express = require("express");
const { runCode, submitCode } = require("../controllers/code.controller");
const { requireAuth } = require("../middleware/auth");
const { runLimiter, submitLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.post("/run", requireAuth, runLimiter, runCode);
router.post("/submit", requireAuth, submitLimiter, submitCode);

module.exports = router;
