const bcrypt = require("bcrypt");
const User = require("../models/user");
const { signToken } = require("../middleware/auth");
const { getAdminAuth } = require("../config/firebaseAdmin");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

const publicUser = (user, extra = {}) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt,
  ...extra,
});

const fail = (res, status, message) => res.status(status).json({ success: false, message });

// POST /api/auth/signup
const signup = async (req, res) => {
  let { name, email, password } = req.body || {};
  if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string" || !name || !email || !password)
    return fail(res, 400, "All fields are required");

  name = name.trim();
  email = email.trim().toLowerCase();

  if (name.length < 2 || name.length > 100) return fail(res, 400, "Name must be between 2 and 100 characters long");
  if (!EMAIL_RE.test(email) || email.length > 255) return fail(res, 400, "Invalid email address");
  // bcrypt only uses the first 72 bytes, so longer passwords are rejected instead of silently truncated
  if (password.length < 6) return fail(res, 400, "Password must be at least 6 characters long");
  if (Buffer.byteLength(password) > 72) return fail(res, 400, "Password must be at most 72 bytes long");

  try {
    if (await User.findOne({ where: { email } })) return fail(res, 409, "Email already exists");
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
    return res.status(201).json({ success: true, message: "Signup successful", token: signToken(user), user: publicUser(user) });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return fail(res, 409, "Email already exists");
    console.error("Signup error:", error.message);
    return fail(res, 500, "Internal Server Error");
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  let { email, password } = req.body || {};
  if (typeof email !== "string" || typeof password !== "string" || !email || !password)
    return fail(res, 400, "Email and password are required");

  try {
    const user = await User.findOne({ where: { email: email.trim().toLowerCase() } });
    // Google-only accounts have no local password: bcrypt.compare(pw, null) would throw (HTTP 500)
    const hash = user && user.password ? user.password : DUMMY_HASH;
    const ok = await bcrypt.compare(password, hash);

    if (!user || !user.password || !ok) {
      if (user && !user.password)
        return fail(res, 401, "This account uses Google sign-in. Please continue with Google.");
      return fail(res, 401, "Invalid email or password");
    }
    return res.status(200).json({ success: true, message: "Login successful", token: signToken(user), user: publicUser(user) });
  } catch (error) {
    console.error("Login error:", error.message);
    return fail(res, 500, "Internal Server Error");
  }
};

// POST /api/auth/firebase  (Google sign-in)
const firebaseLogin = async (req, res) => {
  const { token } = req.body || {};
  if (!token || typeof token !== "string") return fail(res, 400, "Firebase token is required");

  const adminAuth = getAdminAuth();
  if (!adminAuth) return fail(res, 503, "Google sign-in is not configured on this server.");

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const { email, name, picture, email_verified: verified } = decoded;
    if (!email) return fail(res, 400, "Email not available from provider");
    // Never log someone into an existing account via an unverified email address
    if (verified !== true) return fail(res, 401, "Your email address is not verified with the provider.");

    const normalized = email.trim().toLowerCase();
    let user = await User.findOne({ where: { email: normalized } });
    if (!user) {
      user = await User.create({
        name: (name || normalized.split("@")[0]).slice(0, 100).padEnd(2, "_"),
        email: normalized,
        password: null,
      });
    }
    return res.status(200).json({
      success: true,
      message: "Firebase login successful",
      token: signToken(user),
      user: publicUser(user, { photo: picture || null }),
    });
  } catch (error) {
    console.error("Firebase login error:", error.code || error.message);
    return fail(res, 401, "Invalid Firebase authentication");
  }
};

module.exports = { signup, login, firebaseLogin };
