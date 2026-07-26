const { sequelize } = require("../config/database");

// Import all models
require("./user");

const syncDB = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log("✅ Database synced successfully");
  } catch (error) {
    console.error("❌ Database sync failed:", error);
    throw error;
  }
};

module.exports = {
  sequelize,
  syncDB,
};