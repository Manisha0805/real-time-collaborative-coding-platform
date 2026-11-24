const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const User = require("./user");
const Room = require("./Room");
const RoomMember = require("./RoomMember");
const Submission = require("./Submission");
const Battle = require("./Battle");

User.hasMany(Room, {
  foreignKey: "createdBy",
  as: "rooms",
});

Room.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
});

User.hasMany(RoomMember, {
  foreignKey: "userId",
  as: "roomMemberships",
});

RoomMember.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

Room.hasMany(RoomMember, {
  foreignKey: "roomId",
  as: "members",
});

RoomMember.belongsTo(Room, {
  foreignKey: "roomId",
  as: "room",
});

User.hasMany(Submission, {
  foreignKey: "userId",
  as: "submissions",
});

Submission.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

Room.hasMany(Submission, {
  foreignKey: "roomId",
  as: "submissions",
});

Submission.belongsTo(Room, {
  foreignKey: "roomId",
  as: "room",
});

Room.hasMany(Battle, {
  foreignKey: "roomId",
  as: "battles",
});

Battle.belongsTo(Room, {
  foreignKey: "roomId",
  as: "room",
});

User.hasMany(Battle, {
  foreignKey: "player1Id",
  as: "battlesAsPlayer1",
});

Battle.belongsTo(User, {
  foreignKey: "player1Id",
  as: "player1",
});

User.hasMany(Battle, {
  foreignKey: "player2Id",
  as: "battlesAsPlayer2",
});

Battle.belongsTo(User, {
  foreignKey: "player2Id",
  as: "player2",
});

User.hasMany(Battle, {
  foreignKey: "winnerId",
  as: "wonBattles",
});

Battle.belongsTo(User, {
  foreignKey: "winnerId",
  as: "winner",
});

User.hasMany(Battle, {
  foreignKey: "loserId",
  as: "lostBattles",
});

Battle.belongsTo(User, {
  foreignKey: "loserId",
  as: "loser",
});

// ---------------------------------------------------------------------------
// Schema management
//
// sequelize.sync({ alter: true }) is NOT used: on MySQL it re-adds unique
// indexes on every restart (eventually hitting the 64-key limit). Instead:
// sync() creates missing tables, and ensureSchema() applies small idempotent
// migrations to tables that already exist.
// ---------------------------------------------------------------------------

const ensureColumn = async (table, column, definition) => {
  const qi = sequelize.getQueryInterface();
  const description = await qi.describeTable(table);
  if (!description[column]) {
    await qi.addColumn(table, column, definition);
    console.log(`Migration: added ${table}.${column}`);
  }
};

// Remove duplicate single-column UNIQUE indexes left behind by older
// sync({alter:true}) runs (email, email_2, email_3 ...). Keeps the first.
const dedupeUniqueIndexes = async (table, column) => {
  const qi = sequelize.getQueryInterface();
  const indexes = await qi.showIndex(table);
  const uniques = indexes.filter(
    (ix) =>
      ix.unique &&
      ix.name !== "PRIMARY" &&
      ix.fields &&
      ix.fields.length === 1 &&
      ix.fields[0].attribute === column
  );
  for (const ix of uniques.slice(1)) {
    try {
      await qi.removeIndex(table, ix.name);
      console.log(`Migration: dropped duplicate index ${table}.${ix.name}`);
    } catch (e) {
      console.warn(`Could not drop index ${ix.name}: ${e.message}`);
    }
  }
};

const ensureSchema = async () => {
  await ensureColumn("rooms", "code", { type: DataTypes.TEXT("long"), allowNull: true });
  await dedupeUniqueIndexes("users", "email");
  await dedupeUniqueIndexes("rooms", "roomCode");
};

const syncDB = async () => {
  try {
    await sequelize.sync();
    await ensureSchema();
    console.log("Database synced");
  } catch (error) {
    console.error("Database sync failed:", error.message);
    throw error;
  }
};

module.exports = {
  sequelize,
  syncDB,
  User,
  Room,
  RoomMember,
  Submission,
  Battle,
};
