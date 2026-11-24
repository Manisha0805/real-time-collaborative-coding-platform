const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

// Limit per authenticated user when available, otherwise per IP.
const keyGenerator = (req) => (req.user ? `u:${req.user.id}` : ipKeyGenerator(req.ip));

const make = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    keyGenerator,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, message },
  });

module.exports = {
  authLimiter: make(15 * 60 * 1000, 40, "Too many attempts. Please try again later."),
  runLimiter: make(60 * 1000, 30, "You are running code too quickly. Slow down a little."),
  submitLimiter: make(60 * 1000, 15, "You are submitting too quickly. Slow down a little."),
  aiLimiter: make(60 * 1000, 8, "Too many AI review requests. Please wait a minute."),
};
