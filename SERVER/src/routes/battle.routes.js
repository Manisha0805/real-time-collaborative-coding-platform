const express = require("express");

const {
  createBattle,
  getBattleById,
  getRoomBattles,
  completeBattle,
  getLeaderboard,
} = require("../controllers/battle.controller");

const router = express.Router();

// =========================
// Create Battle
// =========================
router.post("/", createBattle);

// =========================
// Leaderboard
// IMPORTANT: /leaderboard before /:id
// =========================
router.get("/leaderboard", getLeaderboard);

// =========================
// Room Battles
// =========================
router.get("/room/:roomCode", getRoomBattles);

// =========================
// Get Battle By ID
// =========================
router.get("/:id", getBattleById);

// =========================
// Complete Battle
// =========================
router.patch("/:id/complete", completeBattle);

module.exports = router;