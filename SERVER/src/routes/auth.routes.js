const express = require("express");

const router = express.Router();

const {
  signup,
  login,
  firebaseLogin,
} = require("../controllers/auth.controller");

// =========================
// Authentication Routes
// =========================

router.post("/signup", signup);

router.post("/login", login);

router.post("/firebase", firebaseLogin);

module.exports = router;