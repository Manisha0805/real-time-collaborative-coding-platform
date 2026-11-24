const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Submission = sequelize.define(
  "Submission",
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

    language: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },

    code: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
    },

    problemIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    accepted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    executionTime: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },

    submittedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "submissions",
    timestamps: true,

    indexes: [
      {
        fields: ["roomId"],
      },
      {
        fields: ["userId"],
      },
      {
        fields: ["accepted"],
      },
    ],
  }
);

module.exports = Submission;