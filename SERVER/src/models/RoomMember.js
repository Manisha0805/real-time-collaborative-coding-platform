const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const RoomMember = sequelize.define(
  "RoomMember",
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

    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    joinedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    leftAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "room_members",
    timestamps: true,

    indexes: [
      {
        unique: true,
        fields: ["roomId", "userId"],
      },
    ],
  }
);

module.exports = RoomMember;