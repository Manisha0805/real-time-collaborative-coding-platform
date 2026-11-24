const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Room = sequelize.define(
  "Room",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    roomCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },

    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    language: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "cpp",
    },

    // Last synced editor contents, so a room survives restarts / everyone leaving
    code: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM("active", "closed"),
      allowNull: false,
      defaultValue: "active",
    },
  },
  {
    tableName: "rooms",
    timestamps: true,
  }
);

module.exports = Room;