const { Server } = require("socket.io");
const { config, isOriginAllowed } = require("./env");
const { verifyToken } = require("../middleware/auth");
const { Room, RoomMember, User } = require("../models");
const battleService = require("../services/battle.service");
const languageMap = require("../utils/languageMap");

let io;

// roomCode -> { code, language, dbRoomId, users: Map<socketId,{userId,username}>, saveTimer }
// Live state is kept in memory for speed and persisted to rooms.code (debounced).
// => run ONE server instance (or add the Socket.IO Redis adapter + sticky sessions).
const rooms = new Map();

const MAX_SYNC_CHARS = 200000;
const SAVE_DEBOUNCE_MS = 1500;
const norm = (c) => String(c || "").trim().toUpperCase();

const uniqueUsers = (state) => {
  const seen = new Map();
  for (const [socketId, u] of state.users) if (!seen.has(u.userId)) seen.set(u.userId, { id: socketId, username: u.username, userId: u.userId });
  return [...seen.values()];
};

// Simple per-socket token bucket
function allow(socket, key, perSec, burst) {
  const buckets = (socket.data.buckets = socket.data.buckets || {});
  const now = Date.now();
  const b = (buckets[key] = buckets[key] || { tokens: burst, t: now });
  b.tokens = Math.min(burst, b.tokens + ((now - b.t) / 1000) * perSec);
  b.t = now;
  if (b.tokens < 1) return false;
  b.tokens -= 1;
  return true;
}

// ---- persistence ---------------------------------------------------------------

async function flush(state) {
  clearTimeout(state.saveTimer);
  state.saveTimer = null;
  try {
    await Room.update({ code: state.code, language: state.language }, { where: { id: state.dbRoomId } });
  } catch (e) {
    console.error("Saving room state failed:", e.message);
  }
}
function scheduleSave(state) {
  if (state.saveTimer) return;
  state.saveTimer = setTimeout(() => flush(state), SAVE_DEBOUNCE_MS);
  if (state.saveTimer.unref) state.saveTimer.unref();
}

// ---- membership helpers ----------------------------------------------------------

async function removeSocket(socket) {
  const roomCode = socket.data.roomCode;
  if (!roomCode) return;
  socket.data.roomCode = null;
  socket.leave(roomCode);

  const state = rooms.get(roomCode);
  if (!state) return;
  state.users.delete(socket.id);

  // Only mark the user as "left" when their LAST tab/socket in the room is gone
  const stillPresent = [...state.users.values()].some((u) => u.userId === socket.data.userId);
  if (!stillPresent) {
    await RoomMember.update({ leftAt: new Date() }, { where: { roomId: state.dbRoomId, userId: socket.data.userId } })
      .catch((e) => console.error("Updating leftAt failed:", e.message));
  }
  io.to(roomCode).emit("users-update", uniqueUsers(state));

  if (state.users.size === 0) {
    await flush(state);
    rooms.delete(roomCode);
  }
}

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: (origin, cb) => cb(null, isOriginAllowed(origin)),
      methods: ["GET", "POST"],
      credentials: true,
    },
    maxHttpBufferSize: 1e6,
  });

  battleService.setNotifier((roomCode, event, payload) => io.to(roomCode).emit(event, payload));

  // Handshake authentication: identity comes from the JWT, never from event payloads
  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error("AUTH_REQUIRED"));
    try {
      socket.data.userId = Number(verifyToken(token).id);
      next();
    } catch {
      next(new Error("AUTH_INVALID"));
    }
  });

  io.on("connection", (socket) => {
    const inRoom = (roomId) => socket.data.roomCode && socket.data.roomCode === norm(roomId);
    const stateOf = () => rooms.get(socket.data.roomCode);

    socket.on("join-room", async (payload, ack) => {
      const reply = (r) => typeof ack === "function" && ack(r);
      const fail = (message) => { socket.emit("join-error", { message }); reply({ ok: false, message }); };
      try {
        const roomCode = norm(payload && payload.roomId);
        if (!roomCode) return fail("Room ID is required.");

        if (socket.data.roomCode && socket.data.roomCode !== roomCode) await removeSocket(socket);

        const room = await Room.findOne({ where: { roomCode } });
        if (!room) return fail("Room not found.");
        if (room.status === "closed") return fail("Room is closed.");
        const user = await User.findByPk(socket.data.userId);
        if (!user) return fail("Your account no longer exists. Please log in again.");

        const username = String((payload && payload.username) || "").trim().slice(0, 25) || user.name;

        // No awaits between get and set => a concurrent join can't create a second state object
        socket.join(roomCode);
        let state = rooms.get(roomCode);
        if (!state) {
          state = { code: room.code || "", language: room.language || "cpp", dbRoomId: room.id, users: new Map(), saveTimer: null };
          rooms.set(roomCode, state);
        }
        state.users.set(socket.id, { userId: user.id, username });
        Object.assign(socket.data, { roomCode, username });

        const [member, created] = await RoomMember.findOrCreate({
          where: { roomId: room.id, userId: user.id },
          defaults: { joinedAt: new Date(), leftAt: null },
        });
        // findOrCreate "defaults" only apply on creation: a rejoin must clear leftAt explicitly
        if (!created) await member.update({ leftAt: null, joinedAt: member.leftAt ? new Date() : member.joinedAt });

        io.to(roomCode).emit("users-update", uniqueUsers(state));
        socket.emit("receive-code", state.code);
        socket.emit("receive-language", state.language);

        const battle = battleService.stateFor(roomCode);
        if (battle.active) {
          battleService.addParticipant(roomCode, user.id);
          socket.emit("battle-state", battle);
        }
        reply({ ok: true });
      } catch (error) {
        console.error("Join room error:", error.message);
        fail("Could not join the room.");
      }
    });

    socket.on("code-change", (p) => {
      if (!p || !inRoom(p.roomId) || typeof p.code !== "string" || p.code.length > MAX_SYNC_CHARS) return;
      if (!allow(socket, "code", 30, 60)) return;
      const state = stateOf();
      if (!state) return;
      state.code = p.code;
      scheduleSave(state);
      socket.to(socket.data.roomCode).emit("receive-code", p.code);
    });

    socket.on("language-change", (p) => {
      if (!p || !inRoom(p.roomId) || !languageMap[p.language] || !languageMap[p.language].fileName) return;
      const state = stateOf();
      if (!state) return;
      state.language = p.language;
      scheduleSave(state);
      socket.to(socket.data.roomCode).emit("receive-language", p.language);
    });

    socket.on("typing", (p) => {
      if (!p || !inRoom(p.roomId) || !allow(socket, "typing", 5, 5)) return;
      socket.to(socket.data.roomCode).emit("typing", socket.data.username); // server-known name: can't be spoofed
    });

    socket.on("send-message", (p) => {
      if (!p || !inRoom(p.roomId) || !allow(socket, "chat", 3, 8)) return;
      const text = String((p.data && p.data.text) || "").trim().slice(0, 1000);
      if (!text) return;
      socket.to(socket.data.roomCode).emit("receive-message", { username: socket.data.username, text, ts: Date.now() });
    });

    // ---- Battle: all state transitions are decided by the server ----
    socket.on("start-battle", (p) => {
      if (!p || !inRoom(p.roomId)) return;
      const state = stateOf();
      const { created } = battleService.start(socket.data.roomCode, { starterId: socket.data.userId, starterName: socket.data.username });
      if (state) for (const u of state.users.values()) battleService.addParticipant(socket.data.roomCode, u.userId);
      if (!created) socket.emit("battle-state", battleService.stateFor(socket.data.roomCode)); // already running: just sync this client
    });

    socket.on("battle-problem-change", (p) => {
      if (!p || !inRoom(p.roomId)) return;
      battleService.setProblem(socket.data.roomCode, Number(p.problemIndex));
    });

    socket.on("end-battle", (p) => {
      if (!p || !inRoom(p.roomId)) return;
      battleService.end(socket.data.roomCode, "ended");
    });

    socket.on("leave-room", () => removeSocket(socket));
    socket.on("disconnect", () => removeSocket(socket));
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
};

async function flushAll() {
  await Promise.all([...rooms.values()].map(flush));
}

module.exports = { initSocket, getIO, flushAll };
