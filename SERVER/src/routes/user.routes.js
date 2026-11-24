const express = require("express");
const { getUserStats } = require("../controllers/user.controller");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/:userId/stats", requireAuth, getUserStats);

module.exports = router;
