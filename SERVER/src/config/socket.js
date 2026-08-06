const { Server } = require("socket.io");

let io;

// Store users of every room
const roomUsers = {};

// Store room state
const roomState = {};

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`✅ Socket Connected: ${socket.id}`);

    // Debug every incoming event
    socket.onAny((event, ...args) => {
      console.log(`📡 ${socket.id} -> ${event}`, args);
    });

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

      if (!roomState[roomId]) {
        roomState[roomId] = {
          code: "",
          language: "cpp",
        };
      }

      // Remove duplicate socket/user
      roomUsers[roomId] = roomUsers[roomId].filter(
        (user) => user.id !== socket.id && user.username !== username,
      );

      roomUsers[roomId].push({
        id: socket.id,
        username,
      });

      io.to(roomId).emit("users-update", roomUsers[roomId]);

      socket.emit("receive-code", roomState[roomId].code);
      socket.emit("receive-language", roomState[roomId].language);

      console.log(`👤 ${username} joined room ${roomId}`);
      console.log(`🏠 Room ${roomId} Users: ${roomUsers[roomId].length}`);
    });

    // ==========================
    // Code Sync
    // ==========================
    socket.on("code-change", ({ roomId, code }) => {
      if (roomState[roomId]) {
        roomState[roomId].code = code;
      }

      socket.to(roomId).emit("receive-code", code);
    });

    // ==========================
    // Language Change
    // ==========================
    socket.on("language-change", ({ roomId, language }) => {
      if (roomState[roomId]) {
        roomState[roomId].language = language;
      }

      socket.to(roomId).emit("receive-language", language);
    });

    // ==========================
    // Typing Indicator
    // ==========================
    socket.on("typing", ({ roomId, username }) => {
      socket.to(roomId).emit("typing", username);
    });

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
          (user) => user.id !== socket.id && user.username !== socket.username,
        );

        io.to(roomId).emit("users-update", roomUsers[roomId]);

        console.log(`👋 ${socket.username} left room ${roomId}`);
        console.log(`🏠 Room ${roomId} Users: ${roomUsers[roomId].length}`);

        if (roomUsers[roomId].length === 0) {
          delete roomUsers[roomId];
          delete roomState[roomId];
          console.log(`🗑️ Room ${roomId} deleted`);
        }
      }
    });

    // ==========================
    // Disconnect
    // ==========================
    socket.on("disconnect", (reason) => {
      const roomId = socket.roomId;

      if (roomId && roomUsers[roomId]) {
        roomUsers[roomId] = roomUsers[roomId].filter(
          (user) => user.id !== socket.id && user.username !== socket.username,
        );

        io.to(roomId).emit("users-update", roomUsers[roomId]);

        console.log(`🏠 Room ${roomId} Users: ${roomUsers[roomId].length}`);

        if (roomUsers[roomId].length === 0) {
          delete roomUsers[roomId];
          delete roomState[roomId];
          console.log(`🗑️ Room ${roomId} deleted`);
        }
      }

      console.log(`❌ Socket Disconnected: ${socket.id} | Reason: ${reason}`);
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
