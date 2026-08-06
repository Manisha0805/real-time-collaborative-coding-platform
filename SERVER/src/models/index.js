const { sequelize } = require("../config/database");

// =========================
// Import Models
// =========================

require("./user");

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

module.exports = {
  sequelize,
  syncDB,
};