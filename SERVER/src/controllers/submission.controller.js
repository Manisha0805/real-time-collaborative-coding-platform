const Submission = require("../models/Submission");
const User = require("../models/user");
const Room = require("../models/Room");
const RoomMember = require("../models/RoomMember");

const fail = (res, status, message) => res.status(status).json({ success: false, message });

// GET /api/submissions/user/:username  (only your own; names are not unique, so the JWT decides who "you" are)
const getMySubmissions = async (req, res) => {
  try {
    const me = await User.findByPk(req.user.id, { attributes: ["id", "name"] });
    if (!me) return fail(res, 404, "User not found.");
    if (String(req.params.username || "").toLowerCase() !== me.name.toLowerCase())
      return fail(res, 403, "You can only view your own submissions.");
    const submissions = await Submission.findAll({ where: { userId: me.id }, order: [["submittedAt", "DESC"]], limit: 200 });
    return res.status(200).json({ success: true, count: submissions.length, submissions });
  } catch (error) {
    console.error("Get my submissions error:", error.message);
    return fail(res, 500, "Failed to fetch submissions.");
  }
};

// GET /api/submissions/room/:roomCode  (members only; other players' source code is not exposed)
const getRoomSubmissions = async (req, res) => {
  try {
    const room = await Room.findOne({ where: { roomCode: String(req.params.roomCode).trim().toUpperCase() } });
    if (!room) return fail(res, 404, "Room not found.");
    const member = room.createdBy === req.user.id || (await RoomMember.findOne({ where: { roomId: room.id, userId: req.user.id } }));
    if (!member) return fail(res, 403, "You are not a member of this room.");

    const rows = await Submission.findAll({
      where: { roomId: room.id },
      include: [{ model: User, as: "user", attributes: ["id", "name"] }],
      order: [["submittedAt", "DESC"]],
      limit: 500,
    });
    const submissions = rows.map((s) => {
      const j = s.toJSON();
      if (j.userId !== req.user.id) delete j.code;
      return j;
    });
    return res.status(200).json({ success: true, count: submissions.length, submissions });
  } catch (error) {
    console.error("Get room submissions error:", error.message);
    return fail(res, 500, "Failed to fetch room submissions.");
  }
};

// GET /api/submissions/:id  (owner only)
const getSubmissionById = async (req, res) => {
  try {
    const submission = await Submission.findByPk(req.params.id, {
      include: [
        { model: User, as: "user", attributes: ["id", "name"] },
        { model: Room, as: "room", attributes: ["id", "roomCode", "language", "status"] },
      ],
    });
    if (!submission) return fail(res, 404, "Submission not found.");
    if (submission.userId !== req.user.id) return fail(res, 403, "You can only view your own submissions.");
    return res.status(200).json({ success: true, submission });
  } catch (error) {
    console.error("Get submission error:", error.message);
    return fail(res, 500, "Failed to fetch submission.");
  }
};

module.exports = { getMySubmissions, getRoomSubmissions, getSubmissionById };
