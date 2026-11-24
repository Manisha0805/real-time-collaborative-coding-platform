const express = require("express");
const { signup, login, firebaseLogin } = require("../controllers/auth.controller");
const { authLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/firebase", authLimiter, firebaseLogin);

module.exports = router;
