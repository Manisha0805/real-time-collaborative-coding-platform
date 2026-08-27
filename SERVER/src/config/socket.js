const { Server } = require("socket.io");

const Room = require("../models/Room");
const RoomMember = require("../models/RoomMember");
const User = require("../models/user");

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

    socket.on("join-room", async ({ roomId, username }) => {
      try {
        const room = await Room.findOne({
          where: { roomCode: roomId },
        });

        if (!room) {
          console.log(`❌ Room not found: ${roomId}`);
          return;
        }

        const user = await User.findOne({
          where: { name: username },
        });

        if (!user) {
          console.log(`❌ User not found: ${username}`);
          return;
        }

        // Save socket information
        socket.join(roomId);

        socket.roomId = roomId;
        socket.username = username;
        socket.userId = user.id;
        socket.dbRoomId = room.id;

        // ==========================
        // Save Room Member
        // ==========================

        await RoomMember.findOrCreate({
          where: {
            roomId: room.id,
            userId: user.id,
          },
          defaults: {
            joinedAt: new Date(),
            leftAt: null,
          },
        });

        console.log(
          `💾 ${username} added to room_members`
        );

        // ==========================
        // Initialize Room Users
        // ==========================

        if (!roomUsers[roomId]) {
          roomUsers[roomId] = [];
        }

        // Remove duplicate socket/user
        roomUsers[roomId] = roomUsers[roomId].filter(
          (existingUser) =>
            existingUser.id !== socket.id &&
            existingUser.username !== username
        );

        roomUsers[roomId].push({
          id: socket.id,
          username,
          userId: user.id,
        });

        // ==========================
        // Initialize Room State
        // ==========================

        if (!roomState[roomId]) {
          roomState[roomId] = {
            code: "",
            language: room.language || "cpp",

            battle: {
              active: false,
              winner: null,
            },
          };
        }

        // Send users
        io.to(roomId).emit(
          "users-update",
          roomUsers[roomId]
        );

        // Send existing code
        socket.emit(
          "receive-code",
          roomState[roomId].code
        );

        // Send language
        socket.emit(
          "receive-language",
          roomState[roomId].language
        );

        console.log(
          `👤 ${username} joined room ${roomId}`
        );

        console.log(
          `🏠 Room ${roomId} Users: ${roomUsers[roomId].length}`
        );
      } catch (error) {
        console.error(
          "❌ Join Room Error:",
          error
        );
      }
    });

    // ==========================
    // Start Battle
    // ==========================

    socket.on("start-battle", ({ roomId }) => {
      if (!roomState[roomId]) return;

      roomState[roomId].battle = {
        active: true,
        winner: null,
      };

      io.to(roomId).emit("battle-started");

      console.log(
        `⚔ Battle Started: ${roomId}`
      );
    });

    // ==========================
    // Code Sync
    // ==========================

    socket.on("code-change", ({ roomId, code }) => {
      if (roomState[roomId]) {
        roomState[roomId].code = code;
      }

      socket.to(roomId).emit(
        "receive-code",
        code
      );
    });

    // ==========================
    // Language Change
    // ==========================

    socket.on(
      "language-change",
      ({ roomId, language }) => {
        if (roomState[roomId]) {
          roomState[roomId].language = language;
        }

        socket
          .to(roomId)
          .emit(
            "receive-language",
            language
          );
      }
    );

    // ==========================
    // Typing Indicator
    // ==========================

    socket.on(
      "typing",
      ({ roomId, username }) => {
        socket
          .to(roomId)
          .emit("typing", username);
      }
    );

    // ==========================
    // Chat
    // ==========================

    socket.on(
      "send-message",
      ({ roomId, data }) => {
        socket
          .to(roomId)
          .emit(
            "receive-message",
            data
          );
      }
    );

    // ==========================
    // Battle Result
    // ==========================

    socket.on(
      "battle-result",
      ({ roomId, username, accepted }) => {
        socket
          .to(roomId)
          .emit("battle-result", {
            username,
            accepted,
          });
      }
    );

    // ==========================
    // Leave Room
    // ==========================

    socket.on(
      "leave-room",
      async ({ roomId }) => {
        try {
          socket.leave(roomId);

          // Update leftAt in database
          if (socket.dbRoomId && socket.userId) {
            await RoomMember.update(
              {
                leftAt: new Date(),
              },
              {
                where: {
                  roomId: socket.dbRoomId,
                  userId: socket.userId,
                },
              }
            );
          }

          if (roomUsers[roomId]) {
            roomUsers[roomId] =
              roomUsers[roomId].filter(
                (user) =>
                  user.id !== socket.id &&
                  user.username !== socket.username
              );

            io.to(roomId).emit(
              "users-update",
              roomUsers[roomId]
            );

            console.log(
              `👋 ${socket.username} left room ${roomId}`
            );

            console.log(
              `🏠 Room ${roomId} Users: ${roomUsers[roomId].length}`
            );

            if (
              roomUsers[roomId].length === 0
            ) {
              delete roomUsers[roomId];
              delete roomState[roomId];

              console.log(
                `🗑️ Room ${roomId} state deleted`
              );
            }
          }
        } catch (error) {
          console.error(
            "❌ Leave Room Error:",
            error
          );
        }
      }
    );

    // ==========================
    // Disconnect
    // ==========================

    socket.on(
      "disconnect",
      async (reason) => {
        const roomId = socket.roomId;

        try {
          // Update database
          if (socket.dbRoomId && socket.userId) {
            await RoomMember.update(
              {
                leftAt: new Date(),
              },
              {
                where: {
                  roomId: socket.dbRoomId,
                  userId: socket.userId,
                },
              }
            );
          }

          if (
            roomId &&
            roomUsers[roomId]
          ) {
            roomUsers[roomId] =
              roomUsers[roomId].filter(
                (user) =>
                  user.id !== socket.id &&
                  user.username !== socket.username
              );

            io.to(roomId).emit(
              "users-update",
              roomUsers[roomId]
            );

            console.log(
              `🏠 Room ${roomId} Users: ${roomUsers[roomId].length}`
            );

            if (
              roomUsers[roomId].length === 0
            ) {
              delete roomUsers[roomId];
              delete roomState[roomId];

              console.log(
                `🗑️ Room ${roomId} state deleted`
              );
            }
          }
        } catch (error) {
          console.error(
            "❌ Disconnect DB Error:",
            error
          );
        }

        console.log(
          `❌ Socket Disconnected: ${socket.id} | Reason: ${reason}`
        );
      }
    );
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error(
      "Socket.IO not initialized"
    );
  }

  return io;
};

module.exports = {
  initSocket,
  getIO,
};