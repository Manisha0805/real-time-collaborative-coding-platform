const { sequelize } = require("../config/database");

// =========================
// Import Models
// =========================

const User = require("./user");
const Room = require("./Room");
const RoomMember = require("./RoomMember");
const Submission = require("./Submission");
const Battle = require("./Battle");

// =========================
// User ↔ Room
// =========================

User.hasMany(Room, {
  foreignKey: "createdBy",
  as: "rooms",
});

Room.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
});

// =========================
// User ↔ RoomMember
// =========================

User.hasMany(RoomMember, {
  foreignKey: "userId",
  as: "roomMemberships",
});

RoomMember.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// =========================
// Room ↔ RoomMember
// =========================

Room.hasMany(RoomMember, {
  foreignKey: "roomId",
  as: "members",
});

RoomMember.belongsTo(Room, {
  foreignKey: "roomId",
  as: "room",
});

// =========================
// User ↔ Submission
// =========================

User.hasMany(Submission, {
  foreignKey: "userId",
  as: "submissions",
});

Submission.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// =========================
// Room ↔ Submission
// =========================

Room.hasMany(Submission, {
  foreignKey: "roomId",
  as: "submissions",
});

Submission.belongsTo(Room, {
  foreignKey: "roomId",
  as: "room",
});

// =========================
// Battle Associations
// =========================

// Room → Battles
Room.hasMany(Battle, {
  foreignKey: "roomId",
  as: "battles",
});

Battle.belongsTo(Room, {
  foreignKey: "roomId",
  as: "room",
});

// Player 1
User.hasMany(Battle, {
  foreignKey: "player1Id",
  as: "battlesAsPlayer1",
});

Battle.belongsTo(User, {
  foreignKey: "player1Id",
  as: "player1",
});

// Player 2
User.hasMany(Battle, {
  foreignKey: "player2Id",
  as: "battlesAsPlayer2",
});

Battle.belongsTo(User, {
  foreignKey: "player2Id",
  as: "player2",
});

// Winner
User.hasMany(Battle, {
  foreignKey: "winnerId",
  as: "wonBattles",
});

Battle.belongsTo(User, {
  foreignKey: "winnerId",
  as: "winner",
});

// Loser
User.hasMany(Battle, {
  foreignKey: "loserId",
  as: "lostBattles",
});

Battle.belongsTo(User, {
  foreignKey: "loserId",
  as: "loser",
});

// =========================
// Sync Database
// =========================

const syncDB = async () => {
  try {
    if (process.env.NODE_ENV === "development") {
      await sequelize.sync({ alter: true });
    } else {
      await sequelize.sync();
    }

    console.log("✅ Database Synced Successfully");
  } catch (error) {
    console.error("❌ Database Sync Failed");
    console.error(error.message);

    throw error;
  }
};

// =========================
// Export
// =========================

module.exports = {
  sequelize,
  syncDB,
};