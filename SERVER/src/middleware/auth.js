const jwt = require("jsonwebtoken");
const { config } = require("../config/env");

const verifyToken = (token) =>
  jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });

const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email }, config.jwtSecret, {
    algorithm: "HS256",
    expiresIn: config.jwtExpiresIn,
  });

const bearer = (req) => {
  const [scheme, value] = String(req.headers.authorization || "").split(" ");
  return scheme && scheme.toLowerCase() === "bearer" && value ? value : null;
};

const requireAuth = (req, res, next) => {
  const token = bearer(req);
  if (!token)
    return res.status(401).json({ success: false, message: "Authentication required." });
  try {
    const payload = verifyToken(token);
    req.user = { id: Number(payload.id), email: payload.email };
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token. Please log in again." });
  }
};

module.exports = { requireAuth, verifyToken, signToken };
