require("dotenv").config();

const http = require("http");
const app = require("./src/app");

const { connectDB } = require("./src/config/database");
const { syncDB } = require("./src/models");
const { initSocket } = require("./src/config/socket");

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectDB();
    await syncDB();

    const server = http.createServer(app);

    initSocket(server);

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error("Server failed to start:", err);
  }
}

startServer();