const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Battle = sequelize.define(
  "Battle",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    roomId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    problemIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    player1Id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    player2Id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    winnerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    loserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM(
        "pending",
        "active",
        "completed",
        "cancelled",
        "timeout"
      ),
      allowNull: false,
      defaultValue: "pending",
    },

    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    endedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "battles",
    timestamps: true,

    indexes: [
      {
        fields: ["roomId"],
      },
      {
        fields: ["player1Id"],
      },
      {
        fields: ["player2Id"],
      },
      {
        fields: ["winnerId"],
      },
      {
        fields: ["status"],
      },
    ],
  }
);

module.exports = Battle;