const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const admin = require("../config/firebaseAdmin");

// =========================
// Generate JWT
// =========================
const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing in .env");
  }

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );
};

// =========================
// SIGNUP
// =========================
const signup = async (req, res) => {
  try {
    console.log("SIGNUP REQUEST BODY:", req.body);

    let { name, email, password } = req.body;

    console.log("NAME RECEIVED:", name);
    console.log("NAME LENGTH:", name?.length);
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    name = name.trim();
    email = email.trim().toLowerCase();

    if (name.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must be at least 2 characters long",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const existingUser = await User.findOne({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: "Signup successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Signup Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// =========================
// LOGIN
// =========================
const login = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    email = email.trim().toLowerCase();

    const user = await User.findOne({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// =========================
// FIREBASE LOGIN
// Google / GitHub
// =========================
const firebaseLogin = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Firebase token is required",
      });
    }

    // Verify Firebase token
   const decodedToken = await admin.verifyIdToken(token);

    const {
      uid,
      email,
      name,
      picture,
    } = decodedToken;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email not available from provider",
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    // Find existing user
    let user = await User.findOne({
      where: {
        email: normalizedEmail,
      },
    });

    // Create user if doesn't exist
    if (!user) {
      user = await User.create({
        name: name || normalizedEmail.split("@")[0],
        email: normalizedEmail,

        // OAuth users don't have a local password
        password: null,
      });
    }

    const jwtToken = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Firebase login successful",
      token: jwtToken,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        photo: picture || null,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Firebase Login Error:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid Firebase authentication",
    });
  }
};

// =========================
// EXPORT
// =========================

module.exports = {
  signup,
  login,
  firebaseLogin,
};