const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
app.use(express.json());

app.post("/run", async (req, res) => {
  try {
    const { code, language } = req.body;

    const response = await axios.post(
      "https://api.jdoodle.com/v1/execute",
      {
        clientId:
          "c76f56cf1480a14ea3623e3cfc1d613c",

        clientSecret:
          "75d6d0d92f06bd84aae659a118cdac03b19e5c7208d0666bbab88e600f53e14e",

        script: code,

        language: language,

        versionIndex: "0",
      }
    );

    res.json({
      output: response.data.output,
    });

  } catch (error) {
    console.log(
      error.response?.data || error.message
    );

    res.json({
      output: "Error running code",
    });
  }
});
const rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  

  // 🔹 JOIN ROOM
  socket.on("join-room", ({ roomId, username }) => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = { users: [], code: "// Start coding..." };
    }

    // ❗ prevent duplicate
    const exists = rooms[roomId].users.find(u => u.id === socket.id);

    if (!exists) {
      rooms[roomId].users.push({
        id: socket.id,
        username,
      });
    }

    // 🔥 send current code
    socket.emit("receive-code", rooms[roomId].code);

    // 🔥 update users
    io.to(roomId).emit(
      "update-users",
      rooms[roomId].users.map(u => u.username)
    );

    // 🔔 join notification
    socket.to(roomId).emit("user-joined", username);
  });

  // 🔹 CODE CHANGE
  socket.on("code-change", ({ roomId, code }) => {
    if (rooms[roomId]) {
      rooms[roomId].code = code;
      socket.to(roomId).emit("receive-code", code);
    }
  });
  // 🔹 TYPING
socket.on("typing", ({ roomId, username }) => {
  socket.to(roomId).emit("typing", username);
});

// 🔹 CHAT
socket.on("send-message", ({ roomId, data }) => {
  socket.to(roomId).emit("receive-message", data);
});

  // 🔹 DISCONNECT
  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      const user = rooms[roomId].users.find(u => u.id === socket.id);

      rooms[roomId].users = rooms[roomId].users.filter(
        u => u.id !== socket.id
      );

      if (user) {
        socket.to(roomId).emit("user-left", user.username);
      }

      if (rooms[roomId].users.length === 0) {
        delete rooms[roomId];
      } else {
        io.to(roomId).emit(
          "update-users",
          rooms[roomId].users.map(u => u.username)
        );
      }
    }

    console.log("User disconnected:", socket.id);
  });
});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});


