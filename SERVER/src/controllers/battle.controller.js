const { Op, fn, col } = require("sequelize");
const Battle = require("../models/Battle");
const User = require("../models/user");
const Room = require("../models/Room");
const RoomMember = require("../models/RoomMember");
const Submission = require("../models/Submission");
const { problems } = require("../data/problems");

const fail = (res, status, message) => res.status(status).json({ success: false, message });
const normCode = (c) => String(c || "").trim().toUpperCase();
const playerInclude = (as) => ({ model: User, as, attributes: ["id", "name"] });
const allPlayers = [playerInclude("player1"), playerInclude("player2"), playerInclude("winner"), playerInclude("loser")];

const isRoomMember = async (room, userId) =>
  room.createdBy === userId || !!(await RoomMember.findOne({ where: { roomId: room.id, userId } }));

// POST /api/battles   (the live UI creates battles through the socket; kept for API use)
const createBattle = async (req, res) => {
  try {
    const { roomCode, player1Id, player2Id, problemIndex = 0 } = req.body || {};
    if (!roomCode || !player1Id || !player2Id) return fail(res, 400, "Room code, player1 and player2 are required.");
    if (Number(player1Id) === Number(player2Id)) return fail(res, 400, "A player cannot battle themselves.");
    if (![player1Id, player2Id].map(Number).includes(req.user.id)) return fail(res, 403, "You can only create battles you take part in.");
    if (!Number.isInteger(Number(problemIndex)) || problemIndex < 0 || problemIndex >= problems.length)
      return fail(res, 400, "Invalid problem index.");

    const room = await Room.findOne({ where: { roomCode: normCode(roomCode) } });
    if (!room) return fail(res, 404, "Room not found.");
    for (const id of [player1Id, player2Id])
      if (!(await isRoomMember(room, Number(id)))) return fail(res, 400, "Both players must be members of the room.");

    if (await Battle.findOne({ where: { roomId: room.id, status: "active" } }))
      return fail(res, 409, "This room already has an active battle.");

    const battle = await Battle.create({ roomId: room.id, problemIndex, player1Id, player2Id, status: "active", startedAt: new Date() });
    return res.status(201).json({ success: true, message: "Battle created successfully.", battle });
  } catch (error) {
    console.error("Create battle error:", error.message);
    return fail(res, 500, "Failed to create battle.");
  }
};

// GET /api/battles/:id
const getBattleById = async (req, res) => {
  try {
    const battle = await Battle.findByPk(req.params.id, {
      include: [{ model: Room, as: "room", attributes: ["id", "roomCode", "language", "status"] }, ...allPlayers],
    });
    if (!battle) return fail(res, 404, "Battle not found.");
    if (![battle.player1Id, battle.player2Id].includes(req.user.id)) return fail(res, 403, "You did not take part in this battle.");
    return res.status(200).json({ success: true, battle });
  } catch (error) {
    console.error("Get battle error:", error.message);
    return fail(res, 500, "Failed to fetch battle.");
  }
};

// GET /api/battles/room/:roomCode
const getRoomBattles = async (req, res) => {
  try {
    const room = await Room.findOne({ where: { roomCode: normCode(req.params.roomCode) } });
    if (!room) return fail(res, 404, "Room not found.");
    if (!(await isRoomMember(room, req.user.id))) return fail(res, 403, "You are not a member of this room.");
    const battles = await Battle.findAll({ where: { roomId: room.id }, include: allPlayers, order: [["createdAt", "DESC"]] });
    return res.status(200).json({ success: true, count: battles.length, battles });
  } catch (error) {
    console.error("Get room battles error:", error.message);
    return fail(res, 500, "Failed to fetch room battles.");
  }
};

// PATCH /api/battles/:id/complete
// A player may only claim a win for THEMSELVES, and only if the server holds an
// accepted submission of theirs for this battle. The update is atomic.
const completeBattle = async (req, res) => {
  try {
    const battle = await Battle.findByPk(req.params.id);
    if (!battle) return fail(res, 404, "Battle not found.");
    if (![battle.player1Id, battle.player2Id].includes(req.user.id)) return fail(res, 403, "You did not take part in this battle.");
    if (battle.status !== "active") return fail(res, 400, "Battle is already completed.");

    const winnerId = req.user.id;
    const proof = await Submission.findOne({
      where: {
        roomId: battle.roomId, userId: winnerId, problemIndex: battle.problemIndex,
        accepted: true, submittedAt: { [Op.gte]: battle.startedAt || battle.createdAt },
      },
    });
    if (!proof) return fail(res, 403, "No accepted submission found for you in this battle.");

    const loserId = winnerId === battle.player1Id ? battle.player2Id : battle.player1Id;
    const [updated] = await Battle.update(
      { status: "completed", winnerId, loserId, endedAt: new Date() },
      { where: { id: battle.id, status: "active" } } // atomic: only one caller can win
    );
    if (!updated) return fail(res, 409, "Battle was already completed.");
    await battle.reload();
    return res.status(200).json({ success: true, message: "Battle completed successfully.", battle });
  } catch (error) {
    console.error("Complete battle error:", error.message);
    return fail(res, 500, "Failed to complete battle.");
  }
};

// GET /api/battles/leaderboard  - three aggregate queries, no N+1
const getLeaderboard = async (req, res) => {
  try {
    const grouped = (field) =>
      Battle.findAll({
        attributes: [field, [fn("COUNT", col("id")), "n"]],
        where: { status: "completed", [field]: { [Op.ne]: null } },
        group: [field],
        raw: true,
      });
    const [wins, losses] = await Promise.all([grouped("winnerId"), grouped("loserId")]);

    const stats = {};
    const bump = (id, key, n) => {
      stats[id] = stats[id] || { userId: id, wins: 0, losses: 0 };
      stats[id][key] += Number(n);
    };
    wins.forEach((r) => bump(r.winnerId, "wins", r.n));
    losses.forEach((r) => bump(r.loserId, "losses", r.n));

    const users = await User.findAll({ where: { id: Object.keys(stats).map(Number) }, attributes: ["id", "name"], raw: true });
    const names = Object.fromEntries(users.map((u) => [u.id, u.name]));

    const leaderboard = Object.values(stats)
      .map((p) => {
        const totalBattles = p.wins + p.losses;
        return { ...p, username: names[p.userId] || "Unknown", totalBattles, winRate: totalBattles ? Number(((p.wins / totalBattles) * 100).toFixed(2)) : 0 };
      })
      .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate)
      .slice(0, 100);
    return res.status(200).json({ success: true, count: leaderboard.length, leaderboard });
  } catch (error) {
    console.error("Leaderboard error:", error.message);
    return fail(res, 500, "Failed to fetch leaderboard.");
  }
};

module.exports = { createBattle, getBattleById, getRoomBattles, completeBattle, getLeaderboard };
