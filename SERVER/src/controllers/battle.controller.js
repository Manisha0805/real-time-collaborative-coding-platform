const Battle = require("../models/Battle");
const User = require("../models/user");
const Room = require("../models/Room");

// =========================
// Create Battle
// =========================
const createBattle = async (req, res) => {
  try {
    console.log("========== CREATE BATTLE ==========");
    console.log("BODY:", req.body);

    const {
      roomCode,
      player1Id,
      player2Id,
      problemIndex = 0,
    } = req.body || {};

    if (!roomCode || !player1Id || !player2Id) {
      return res.status(400).json({
        success: false,
        message: "Room code, player1 and player2 are required.",
      });
    }

    // Normalize room code
    const normalizedRoomCode = String(roomCode)
      .trim()
      .toUpperCase();

    console.log("Searching Room:", normalizedRoomCode);

    // Find room
    const room = await Room.findOne({
      where: {
        roomCode: normalizedRoomCode,
      },
    });

    console.log("FOUND ROOM:", room ? room.toJSON() : null);

    if (!room) {
      // Debug: show rooms actually visible to this backend
      const allRooms = await Room.findAll({
        attributes: ["id", "roomCode", "createdBy", "status"],
      });

      console.log(
        "ROOMS VISIBLE TO BACKEND:",
        allRooms.map((r) => r.toJSON())
      );

      return res.status(404).json({
        success: false,
        message: "Room not found.",
        searchedRoom: normalizedRoomCode,
      });
    }

    // Find players
    const player1 = await User.findByPk(player1Id);
    const player2 = await User.findByPk(player2Id);

    if (!player1 || !player2) {
      return res.status(404).json({
        success: false,
        message: "One or both players not found.",
      });
    }

    if (Number(player1Id) === Number(player2Id)) {
      return res.status(400).json({
        success: false,
        message: "A player cannot battle themselves.",
      });
    }

    // Create battle
    const battle = await Battle.create({
      roomId: room.id,
      problemIndex,
      player1Id,
      player2Id,
      status: "active",
      startedAt: new Date(),
    });

    console.log("✅ BATTLE CREATED:", battle.toJSON());

    return res.status(201).json({
      success: true,
      message: "Battle created successfully.",
      battle,
    });

  } catch (error) {
    console.error("❌ Create Battle Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// Get Battle By ID
// =========================

const getBattleById = async (req, res) => {
  try {
    const { id } = req.params;

    const battle = await Battle.findByPk(id, {
      include: [
        {
          model: Room,
          as: "room",
          attributes: [
            "id",
            "roomCode",
            "language",
            "status",
          ],
        },
        {
          model: User,
          as: "player1",
          attributes: ["id", "name"],
        },
        {
          model: User,
          as: "player2",
          attributes: ["id", "name"],
        },
        {
          model: User,
          as: "winner",
          attributes: ["id", "name"],
        },
        {
          model: User,
          as: "loser",
          attributes: ["id", "name"],
        },
      ],
    });

    if (!battle) {
      return res.status(404).json({
        success: false,
        message: "Battle not found.",
      });
    }

    return res.status(200).json({
      success: true,
      battle,
    });
  } catch (error) {
    console.error("Get Battle Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch battle.",
    });
  }
};

// =========================
// Get Room Battles
// =========================

const getRoomBattles = async (req, res) => {
  try {
    const { roomCode } = req.params;

    const room = await Room.findOne({
      where: { roomCode },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found.",
      });
    }

    const battles = await Battle.findAll({
      where: {
        roomId: room.id,
      },
      include: [
        {
          model: User,
          as: "player1",
          attributes: ["id", "name"],
        },
        {
          model: User,
          as: "player2",
          attributes: ["id", "name"],
        },
        {
          model: User,
          as: "winner",
          attributes: ["id", "name"],
        },
        {
          model: User,
          as: "loser",
          attributes: ["id", "name"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      count: battles.length,
      battles,
    });
  } catch (error) {
    console.error("Get Room Battles Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch room battles.",
    });
  }
};

// =========================
// Complete Battle
// =========================

const completeBattle = async (req, res) => {
  try {
    const { id } = req.params;
    const { winnerId } = req.body;

    if (!winnerId) {
      return res.status(400).json({
        success: false,
        message: "Winner ID is required.",
      });
    }

    const battle = await Battle.findByPk(id);

    if (!battle) {
      return res.status(404).json({
        success: false,
        message: "Battle not found.",
      });
    }

    if (battle.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Battle is already completed.",
      });
    }

    const winnerIsPlayer1 =
      Number(winnerId) === Number(battle.player1Id);

    const winnerIsPlayer2 =
      Number(winnerId) === Number(battle.player2Id);

    if (!winnerIsPlayer1 && !winnerIsPlayer2) {
      return res.status(400).json({
        success: false,
        message: "Winner must be one of the battle players.",
      });
    }

    const loserId = winnerIsPlayer1
      ? battle.player2Id
      : battle.player1Id;

    await battle.update({
      status: "completed",
      winnerId,
      loserId,
      endedAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: "Battle completed successfully.",
      battle,
    });
  } catch (error) {
    console.error("Complete Battle Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to complete battle.",
    });
  }
};

// =========================
// Battle Leaderboard
// =========================

const getLeaderboard = async (req, res) => {
  try {
    const battles = await Battle.findAll({
      where: {
        status: "completed",
      },
      include: [
        {
          model: User,
          as: "winner",
          attributes: ["id", "name"],
        },
      ],
      order: [["endedAt", "DESC"]],
    });

    const stats = {};

    for (const battle of battles) {
      if (!battle.winner) continue;

      const winnerId = battle.winner.id;
      const winnerName = battle.winner.name;

      if (!stats[winnerId]) {
        stats[winnerId] = {
          userId: winnerId,
          username: winnerName,
          wins: 0,
          losses: 0,
          totalBattles: 0,
        };
      }

      stats[winnerId].wins++;
      stats[winnerId].totalBattles++;
    }

    // Add losses
    for (const battle of battles) {
      const loserId = battle.loserId;

      if (!loserId) continue;

      const loser = await User.findByPk(loserId, {
        attributes: ["id", "name"],
      });

      if (!loser) continue;

      if (!stats[loser.id]) {
        stats[loser.id] = {
          userId: loser.id,
          username: loser.name,
          wins: 0,
          losses: 0,
          totalBattles: 0,
        };
      }

      stats[loser.id].losses++;
      stats[loser.id].totalBattles++;
    }

    const leaderboard = Object.values(stats)
      .map((player) => ({
        ...player,
        winRate:
          player.totalBattles > 0
            ? Number(
                ((player.wins / player.totalBattles) * 100).toFixed(2)
              )
            : 0,
      }))
      .sort((a, b) => {
        if (b.wins !== a.wins) {
          return b.wins - a.wins;
        }

        return b.winRate - a.winRate;
      });

    return res.status(200).json({
      success: true,
      count: leaderboard.length,
      leaderboard,
    });
  } catch (error) {
    console.error("Leaderboard Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch leaderboard.",
    });
  }
};

module.exports = {
  createBattle,
  getBattleById,
  getRoomBattles,
  completeBattle,
  getLeaderboard,
};