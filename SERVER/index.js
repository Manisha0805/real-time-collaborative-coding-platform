require("dotenv").config();
const app = require("./src/app"); // ✅ Import app.js
const { connectDB } = require("./src/config/database");
const { syncDB } = require("./src/models");
const setupSocket = require("./src/config/socket");

async function startServer() {
  try {
    await connectDB();
    await syncDB();

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(error);
  }
}

startServer();