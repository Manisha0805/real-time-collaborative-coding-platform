const express = require("express");
const { aiCodeReview } = require("../controllers/ai.controller");
const { requireAuth } = require("../middleware/auth");
const { aiLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.get("/test", (req, res) => res.status(200).json({ success: true, message: "AI route working" }));
router.post("/review", requireAuth, aiLimiter, aiCodeReview);

module.exports = router;
