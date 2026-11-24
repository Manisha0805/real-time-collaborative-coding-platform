// Authoritative, server-side battle state. One active battle per room.
// Clients can no longer declare themselves winners: a win is only recorded
// after the server has judged a submission as accepted (see code.controller).
const { config } = require("../config/env");
const { Battle, Room } = require("../models");
const { problems } = require("../data/problems");

const battles = new Map(); // roomCode -> state
let notify = () => {};

const setNotifier = (fn) => { notify = fn; };

const timeLeft = (b) => Math.max(0, Math.ceil((b.endsAt - Date.now()) / 1000));

const publicState = (b) =>
  b
    ? { active: !b.finished, problemIndex: b.problemIndex, timeLeft: timeLeft(b), winnerId: b.winnerId }
    : { active: false };

function get(roomCode) {
  const b = battles.get(roomCode);
  return b && !b.finished ? b : null;
}

function start(roomCode, { starterId, starterName }) {
  const existing = get(roomCode);
  if (existing) return { state: existing, created: false };
  const now = Date.now();
  const b = {
    roomCode,
    starterId,
    problemIndex: 0,
    startedAt: new Date(now),
    endsAt: now + config.battleDurationSec * 1000,
    participants: new Set([starterId]),
    winnerId: null,
    finished: false,
    timer: null,
  };
  b.timer = setTimeout(() => end(roomCode, "timeout"), config.battleDurationSec * 1000);
  if (b.timer.unref) b.timer.unref();
  battles.set(roomCode, b);
  notify(roomCode, "battle-started", { ...publicState(b), startedBy: starterName });
  return { state: b, created: true };
}

function addParticipant(roomCode, userId) {
  const b = get(roomCode);
  if (b) b.participants.add(userId);
}

function setProblem(roomCode, index) {
  const b = get(roomCode);
  if (!b || !Number.isInteger(index) || index < 0 || index >= problems.length) return false;
  b.problemIndex = index;
  notify(roomCode, "battle-problem", { problemIndex: index });
  return true;
}

async function persist(b, status, winnerId) {
  const players = [...b.participants];
  if (players.length < 2) return; // solo practice: nothing meaningful to record
  const room = await Room.findOne({ where: { roomCode: b.roomCode } });
  if (!room) return;
  const first = winnerId || players[0];
  const second = players.find((p) => p !== first);
  await Battle.create({
    roomId: room.id,
    problemIndex: b.problemIndex,
    player1Id: first,
    player2Id: second,
    winnerId: winnerId || null,
    loserId: winnerId ? second : null,
    status,
    startedAt: b.startedAt,
    endedAt: new Date(),
  });
}

/** Synchronous check-and-set => race-free: the first accepted submission wins. */
function declareWinner(roomCode, userId, username) {
  const b = get(roomCode);
  if (!b) return { won: false, reason: "no-active-battle" };
  if (b.winnerId) return { won: false, reason: "already-won", winnerId: b.winnerId };
  if (Date.now() > b.endsAt) return { won: false, reason: "time-over" };
  b.winnerId = userId;
  b.finished = true;
  clearTimeout(b.timer);
  notify(roomCode, "battle-result", { username, userId, accepted: true });
  persist(b, "completed", userId).catch((e) => console.error("Persist battle failed:", e.message));
  return { won: true };
}

function end(roomCode, reason = "ended") {
  const b = get(roomCode);
  if (!b) return false;
  b.finished = true;
  clearTimeout(b.timer);
  notify(roomCode, "battle-ended", { reason });
  if (reason === "timeout") persist(b, "timeout", null).catch((e) => console.error("Persist battle failed:", e.message));
  return true;
}

const stateFor = (roomCode) => publicState(get(roomCode));

module.exports = { setNotifier, get, start, addParticipant, setProblem, declareWinner, end, stateFor, timeLeft };
