const { Server } = require("socket.io");

let io;

// Store users of every room
const roomUsers = {};

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`✅ User Connected: ${socket.id}`);

    // ==========================
    // Join Room
    // ==========================
    socket.on("join-room", ({ roomId, username }) => {
      socket.join(roomId);

      socket.roomId = roomId;
      socket.username = username;

      if (!roomUsers[roomId]) {
        roomUsers[roomId] = [];
      }

      // Prevent duplicate entries
      roomUsers[roomId] = roomUsers[roomId].filter(
        (user) => user.id !== socket.id
      );

      roomUsers[roomId].push({
        id: socket.id,
        username,
      });

      io.to(roomId).emit("users-update", roomUsers[roomId]);

      console.log(`${username} joined room ${roomId}`);
    });

    // ==========================
    // Code Sync
    // ==========================
    socket.on("code-change", ({ roomId, code }) => {
      socket.to(roomId).emit("receive-code", code);
    });

    // ==========================
    // Language Change
    // ==========================
    socket.on("language-change", ({ roomId, language }) => {
      socket.to(roomId).emit("receive-language", language);
    });

    // ==========================
    // Typing Indicator
    // ==========================
    socket.on("typing", ({ roomId, username }) => {
  console.log("Typing Event:", roomId, username);

io.to(roomId).emit("typing", username);});

    // ==========================
    // Chat
    // ==========================
    socket.on("send-message", ({ roomId, data }) => {
      socket.to(roomId).emit("receive-message", data);
    });

    // ==========================
    // Leave Room
    // ==========================
    socket.on("leave-room", ({ roomId }) => {
      socket.leave(roomId);

      if (roomUsers[roomId]) {
        roomUsers[roomId] = roomUsers[roomId].filter(
          (user) => user.id !== socket.id
        );

        io.to(roomId).emit("users-update", roomUsers[roomId]);
      }

      console.log(`${socket.id} left ${roomId}`);
    });

    // ==========================
    // Disconnect
    // ==========================
    socket.on("disconnect", () => {
      const roomId = socket.roomId;

      if (roomId && roomUsers[roomId]) {
        roomUsers[roomId] = roomUsers[roomId].filter(
          (user) => user.id !== socket.id
        );

        io.to(roomId).emit("users-update", roomUsers[roomId]);
      }

      console.log(`❌ User Disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }

  return io;
};

module.exports = {
  initSocket,
  getIO,
};