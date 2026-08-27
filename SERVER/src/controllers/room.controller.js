const Room = require("../models/Room");
const User = require("../models/user");
const RoomMember = require("../models/RoomMember");

// =========================
// Create Room
// =========================

const createRoom = async (req, res) => {
  try {
    const {
      roomCode,
      language = "cpp",
      createdBy,
    } = req.body;

    if (!roomCode || !createdBy) {
      return res.status(400).json({
        success: false,
        message: "Room code and creator are required.",
      });
    }

    const existingRoom = await Room.findOne({
      where: { roomCode },
    });

    if (existingRoom) {
      return res.status(409).json({
        success: false,
        message: "Room already exists.",
      });
    }

    const user = await User.findByPk(createdBy);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Creator user not found.",
      });
    }

    const room = await Room.create({
      roomCode: roomCode.trim().toUpperCase(),
      language: language.toLowerCase(),
      createdBy,
      status: "active",
    });

    return res.status(201).json({
      success: true,
      message: "Room created successfully.",
      room,
    });
  } catch (error) {
    console.error("Create Room Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create room.",
    });
  }
};

// =========================
// Get Room Details
// =========================

const getRoomDetails = async (req, res) => {
  try {
    const { roomCode } = req.params;

    const room = await Room.findOne({
      where: {
        roomCode: roomCode.trim().toUpperCase(),
      },
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found.",
      });
    }

    return res.status(200).json({
      success: true,
      room,
    });
  } catch (error) {
    console.error("Get Room Details Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch room details.",
    });
  }
};

// =========================
// Get Room Members
// =========================

const getRoomMembers = async (req, res) => {
  try {
    const { roomCode } = req.params;

    const room = await Room.findOne({
      where: {
        roomCode: roomCode.trim().toUpperCase(),
      },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found.",
      });
    }

    const members = await RoomMember.findAll({
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
    });

    return res.status(200).json({
      success: true,
      roomId: room.id,
      roomCode: room.roomCode,
      count: members.length,
      members,
    });
  } catch (error) {
    console.error("Get Room Members Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch room members.",
    });
  }
};

// =========================
// Close Room
// =========================

const closeRoom = async (req, res) => {
  try {
    const { roomCode } = req.params;

    const room = await Room.findOne({
      where: {
        roomCode: roomCode.trim().toUpperCase(),
      },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found.",
      });
    }

    if (room.status === "closed") {
      return res.status(400).json({
        success: false,
        message: "Room is already closed.",
      });
    }

    await room.update({
      status: "closed",
    });

    return res.status(200).json({
      success: true,
      message: "Room closed successfully.",
      room,
    });
  } catch (error) {
    console.error("Close Room Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to close room.",
    });
  }
};

// =========================
// Join Room
// =========================

const joinRoom = async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    const room = await Room.findOne({
      where: {
        roomCode: roomCode.trim().toUpperCase(),
      },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found.",
      });
    }

    if (room.status === "closed") {
      return res.status(400).json({
        success: false,
        message: "Room is closed.",
      });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Check if already joined
    const existingMember = await RoomMember.findOne({
      where: {
        roomId: room.id,
        userId,
      },
    });

    if (existingMember) {
      return res.status(200).json({
        success: true,
        message: "User is already a member of this room.",
        member: existingMember,
      });
    }

    // Add member
    const member = await RoomMember.create({
      roomId: room.id,
      userId,
    });

    return res.status(201).json({
      success: true,
      message: "Joined room successfully.",
      member,
    });

  } catch (error) {
    console.error("Join Room Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to join room.",
    });
  }
};

// =========================
// Export
// =========================

module.exports = {
  createRoom,
  getRoomDetails,
  getRoomMembers,
  closeRoom,
};