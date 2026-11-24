const Room = require("../models/Room");
const User = require("../models/user");
const RoomMember = require("../models/RoomMember");
const { isSupportedLanguage } = require("../services/execution.service");

const ROOM_CODE_RE = /^[A-Z0-9_-]{3,50}$/;
const normCode = (c) => String(c || "").trim().toUpperCase();
const fail = (res, status, message) => res.status(status).json({ success: false, message });

const findRoom = (roomCode) => Room.findOne({ where: { roomCode: normCode(roomCode) } });

const isMemberOrOwner = async (room, userId) =>
  room.createdBy === userId || !!(await RoomMember.findOne({ where: { roomId: room.id, userId } }));

// POST /api/rooms
const createRoom = async (req, res) => {
  try {
    const roomCode = normCode(req.body?.roomCode); // normalise BEFORE the duplicate check
    const language = String(req.body?.language || "cpp").toLowerCase();

    if (!ROOM_CODE_RE.test(roomCode)) return fail(res, 400, "Room code must be 3-50 letters, numbers, - or _.");
    if (!isSupportedLanguage(language)) return fail(res, 400, "Unsupported language.");

    if (await Room.findOne({ where: { roomCode } })) return fail(res, 409, "Room already exists.");

    // Creator is always the authenticated user (the body's createdBy is ignored)
    const room = await Room.create({ roomCode, language, createdBy: req.user.id, status: "active" });
    return res.status(201).json({ success: true, message: "Room created successfully.", room });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return fail(res, 409, "Room already exists.");
    if (error.name === "SequelizeForeignKeyConstraintError") return fail(res, 401, "Your account no longer exists. Please log in again.");
    console.error("Create room error:", error.message);
    return fail(res, 500, "Failed to create room.");
  }
};

// GET /api/rooms/:roomCode
const getRoomDetails = async (req, res) => {
  try {
    const room = await Room.findOne({
      where: { roomCode: normCode(req.params.roomCode) },
      attributes: { exclude: ["code"] },
      include: [{ model: User, as: "creator", attributes: ["id", "name"] }],
    });
    if (!room) return fail(res, 404, "Room not found.");
    if (room.status === "closed") return fail(res, 410, "Room is closed.");
    return res.status(200).json({ success: true, room });
  } catch (error) {
    console.error("Get room error:", error.message);
    return fail(res, 500, "Failed to fetch room details.");
  }
};

// GET /api/rooms/:roomCode/members
const getRoomMembers = async (req, res) => {
  try {
    const room = await findRoom(req.params.roomCode);
    if (!room) return fail(res, 404, "Room not found.");
    if (!(await isMemberOrOwner(room, req.user.id))) return fail(res, 403, "You are not a member of this room.");

    const members = await RoomMember.findAll({
      where: { roomId: room.id },
      include: [{ model: User, as: "user", attributes: ["id", "name"] }],
    });
    return res.status(200).json({ success: true, roomId: room.id, roomCode: room.roomCode, count: members.length, members });
  } catch (error) {
    console.error("Get members error:", error.message);
    return fail(res, 500, "Failed to fetch room members.");
  }
};

// PATCH /api/rooms/:roomCode/close   (creator only)
const closeRoom = async (req, res) => {
  try {
    const room = await findRoom(req.params.roomCode);
    if (!room) return fail(res, 404, "Room not found.");
    if (room.createdBy !== req.user.id) return fail(res, 403, "Only the room creator can close this room.");
    if (room.status === "closed") return fail(res, 400, "Room is already closed.");
    await room.update({ status: "closed" });
    return res.status(200).json({ success: true, message: "Room closed successfully.", room });
  } catch (error) {
    console.error("Close room error:", error.message);
    return fail(res, 500, "Failed to close room.");
  }
};

// POST /api/rooms/:roomCode/join   (was implemented but never routed)
const joinRoom = async (req, res) => {
  try {
    const room = await findRoom(req.params.roomCode);
    if (!room) return fail(res, 404, "Room not found.");
    if (room.status === "closed") return fail(res, 400, "Room is closed.");

    const [member, created] = await RoomMember.findOrCreate({
      where: { roomId: room.id, userId: req.user.id },
      defaults: { joinedAt: new Date(), leftAt: null },
    });
    return res.status(created ? 201 : 200).json({
      success: true,
      message: created ? "Joined room successfully." : "User is already a member of this room.",
      member,
    });
  } catch (error) {
    console.error("Join room error:", error.message);
    return fail(res, 500, "Failed to join room.");
  }
};

module.exports = { createRoom, getRoomDetails, getRoomMembers, closeRoom, joinRoom };
