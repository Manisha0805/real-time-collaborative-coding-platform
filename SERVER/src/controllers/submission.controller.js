const Submission = require("../models/Submission");
const User = require("../models/user");
const Room = require("../models/Room");

// =========================
// Get My Submissions
// =========================

const getMySubmissions = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({
      where: {
        name: username,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const submissions = await Submission.findAll({
      where: {
        userId: user.id,
      },
      order: [["submittedAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    console.error("Get My Submissions Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch submissions.",
    });
  }
};

// =========================
// Get Room Submissions
// =========================

const getRoomSubmissions = async (req, res) => {
  try {
    const { roomCode } = req.params;

    const room = await Room.findOne({
      where: {
        roomCode,
      },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found.",
      });
    }

    const submissions = await Submission.findAll({
      where: {
        roomId: room.id,
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
      ],
      order: [["submittedAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    console.error("Get Room Submissions Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch room submissions.",
    });
  }
};

// =========================
// Get Submission By ID
// =========================

const getSubmissionById = async (req, res) => {
  try {
    const { id } = req.params;

    const submission = await Submission.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
        {
          model: Room,
          as: "room",
          attributes: ["id", "roomCode", "language", "status"],
        },
      ],
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found.",
      });
    }

    return res.status(200).json({
      success: true,
      submission,
    });
  } catch (error) {
    console.error("Get Submission Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch submission.",
    });
  }
};

module.exports = {
  getMySubmissions,
  getRoomSubmissions,
  getSubmissionById,
};