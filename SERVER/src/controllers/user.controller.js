const User = require("../models/user");
const Submission = require("../models/Submission");
const Battle = require("../models/Battle");

// =========================
// Get User Statistics
// =========================

const getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    // Check user
    const user = await User.findByPk(userId, {
      attributes: ["id", "name", "email", "createdAt"],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // =========================
    // Submission Stats
    // =========================

    const submissions = await Submission.findAll({
      where: {
        userId,
      },
      attributes: ["id", "accepted"],
    });

    const totalSubmissions = submissions.length;

    const acceptedSubmissions = submissions.filter(
      (submission) => submission.accepted === true
    ).length;

    const wrongSubmissions =
      totalSubmissions - acceptedSubmissions;

    const acceptanceRate =
      totalSubmissions > 0
        ? Number(
            ((acceptedSubmissions / totalSubmissions) * 100).toFixed(2)
          )
        : 0;

    // =========================
    // Battle Stats
    // =========================

    const battles = await Battle.findAll({
      where: {
        [require("sequelize").Op.or]: [
          { player1Id: userId },
          { player2Id: userId },
        ],
      },
      attributes: [
        "id",
        "player1Id",
        "player2Id",
        "winnerId",
        "status",
      ],
    });

    const completedBattles = battles.filter(
      (battle) => battle.status === "completed"
    );

    const wins = completedBattles.filter(
      (battle) => Number(battle.winnerId) === Number(userId)
    ).length;

    const losses = completedBattles.filter(
      (battle) =>
        battle.winnerId &&
        Number(battle.winnerId) !== Number(userId)
    ).length;

    const totalBattles = completedBattles.length;

    const winRate =
      totalBattles > 0
        ? Number(((wins / totalBattles) * 100).toFixed(2))
        : 0;

    // =========================
    // Response
    // =========================

    return res.status(200).json({
      success: true,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        joinedAt: user.createdAt,
      },

      statistics: {
        submissions: {
          total: totalSubmissions,
          accepted: acceptedSubmissions,
          wrong: wrongSubmissions,
          acceptanceRate,
        },

        battles: {
          total: totalBattles,
          wins,
          losses,
          winRate,
        },
      },
    });
  } catch (error) {
    console.error("Get User Stats Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch user statistics.",
    });
  }
};

module.exports = {
  getUserStats,
};