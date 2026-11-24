const Submission = require("../models/Submission");
const User = require("../models/user");
const Room = require("../models/Room");
const RoomMember = require("../models/RoomMember");
const { config } = require("../config/env");
const exec = require("../services/execution.service");
const battleService = require("../services/battle.service");
const { getProblem } = require("../data/problems");
const { outputsMatch } = require("../utils/compare");
const { ExecutionUnavailableError } = require("../services/execution/errors");

const fail = (res, status, message, extra = {}) => res.status(status).json({ success: false, message, ...extra });
const normCode = (c) => String(c || "").trim().toUpperCase();

function sendExecError(res, err) {
  if (err instanceof ExecutionUnavailableError)
    return fail(res, err.code === "EXEC_BUSY" ? 429 : 503, err.message, { code: err.code });
  if (err.status === 400) return fail(res, 400, err.message);
  console.error("Execution error:", err.message);
  return fail(res, 500, "Execution failed.");
}

function validateSource(language, code, res) {
  if (typeof language !== "string" || typeof code !== "string" || !language || !code.trim()) {
    fail(res, 400, "Language and code are required.");
    return false;
  }
  if (!exec.isSupportedLanguage(language.toLowerCase())) {
    fail(res, 400, `Unsupported language: ${language}`);
    return false;
  }
  if (Buffer.byteLength(code) > config.exec.maxCodeBytes) {
    fail(res, 413, `Code is too large (max ${Math.round(config.exec.maxCodeBytes / 1024)} KB).`);
    return false;
  }
  return true;
}

// POST /api/code/run
const runCode = async (req, res) => {
  const { language, code, input = "" } = req.body || {};
  if (!validateSource(language, code, res)) return;
  if (typeof input !== "string" || Buffer.byteLength(input) > config.exec.maxInputBytes)
    return fail(res, 413, `Input is too large (max ${Math.round(config.exec.maxInputBytes / 1024)} KB).`);

  try {
    const started = Date.now();
    const result = await exec.executeCode(language.toLowerCase(), code, [input]);
    const s = exec.summarize(result, 0);
    return res.status(200).json({
      success: true,
      output: exec.consoleOutput(result, 0), // what the Output panel shows (unchanged field)
      executionTime: Date.now() - started,
      status: s.status,
      statusLabel: s.statusLabel,
      stdout: s.stdout,
      stderr: s.stderr,
      compileOutput: s.compileOutput,
      exitCode: s.exitCode,
    });
  } catch (err) {
    return sendExecError(res, err);
  }
};

// POST /api/code/submit  (Battle Mode)
// The client only sends its code. The user is taken from the JWT, the test
// cases live on the server, and the winner is decided here - nothing the
// client claims about correctness is trusted.
const submitCode = async (req, res) => {
  const { language, code, roomId, problemIndex } = req.body || {};
  if (!validateSource(language, code, res)) return;
  if (!roomId) return fail(res, 400, "Room ID is required.");

  const roomCode = normCode(roomId);
  try {
    const [user, room] = await Promise.all([
      User.findByPk(req.user.id),
      Room.findOne({ where: { roomCode } }),
    ]);
    if (!user) return fail(res, 401, "Your account no longer exists. Please log in again.");
    if (!room) return fail(res, 404, "Room not found.");
    if (!(await RoomMember.findOne({ where: { roomId: room.id, userId: user.id } })))
      return fail(res, 403, "Join the room before submitting.");

    const battle = battleService.get(roomCode);
    if (!battle) return fail(res, 409, "No active battle in this room. Start a battle first.");
    if (Date.now() > battle.endsAt) return fail(res, 409, "Battle time is over.");
    if (problemIndex !== undefined && Number(problemIndex) !== battle.problemIndex)
      return fail(res, 409, `The battle is on problem ${battle.problemIndex + 1}. Your view is out of sync - switch to it and resubmit.`);

    const problem = getProblem(battle.problemIndex);
    if (!problem) return fail(res, 500, "This problem has no judge data configured.");
    battleService.addParticipant(roomCode, user.id);

    const started = Date.now();
    const result = await exec.executeCode(language.toLowerCase(), code, problem.tests.map((t) => t.input));
    const executionTime = Date.now() - started;

    // ---- verdict ----------------------------------------------------------------
    let accepted = false;
    let message;
    let output = "";
    let passed = 0;
    const total = problem.tests.length;

    if (result.compile && result.compile.exitCode !== 0) {
      output = exec.consoleOutput(result);
      message = `Compilation Error:\n${output}`;
    } else {
      for (let i = 0; i < total; i++) {
        const run = result.runs[i];
        const status = run ? exec.classifyRun(run) : "runtime_error";
        if (status !== "ok") {
          output = exec.consoleOutput(result, i);
          const label = { time_limit: "Time Limit Exceeded", memory_limit: "Memory Limit Exceeded", runtime_error: "Runtime Error" }[status];
          message = `${label} on test ${i + 1}/${total}${output ? `:\n${output}` : ""}`;
          break;
        }
        if (!outputsMatch(run.stdout, problem.tests[i].output, problem.compare)) {
          output = run.stdout.slice(0, 2000).trim();
          message = `Wrong Answer on test ${i + 1}/${total}. Try again.`;
          break;
        }
        passed++;
      }
      accepted = passed === total;
    }

    // ---- persist + arbitrate ----------------------------------------------------
    const submission = await Submission.create({
      roomId: room.id, userId: user.id, language: language.toLowerCase(), code,
      problemIndex: battle.problemIndex, accepted, executionTime, submittedAt: new Date(),
    });

    let won = false;
    if (accepted) {
      const outcome = battleService.declareWinner(roomCode, user.id, user.name);
      won = outcome.won;
      message = won
        ? "Accepted"
        : outcome.reason === "time-over"
        ? "Accepted, but the battle time is over."
        : "Accepted, but your opponent solved it first.";
    }

    return res.status(200).json({
      success: true, accepted, won, message, output, passed, total,
      problemIndex: battle.problemIndex, submissionId: submission.id, executionTime,
    });
  } catch (err) {
    return sendExecError(res, err);
  }
};

module.exports = { runCode, submitCode };
