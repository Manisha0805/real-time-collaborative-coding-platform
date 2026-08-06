const express = require("express");

const router = express.Router();

const { signup } = require("../controllers/auth.controller");

// =========================
// Authentication Routes
// =========================

// Register User
router.post("/signup", signup);

// Future Routes
// router.post("/login", login);
// router.post("/logout", logout);
// router.get("/profile", verifyToken, getProfile);

module.exports = router;