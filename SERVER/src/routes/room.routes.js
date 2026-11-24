const express = require("express");
const { createRoom, getRoomDetails, getRoomMembers, closeRoom, joinRoom } = require("../controllers/room.controller");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.post("/", createRoom);
router.post("/:roomCode/join", joinRoom);
router.get("/:roomCode/members", getRoomMembers);
router.get("/:roomCode", getRoomDetails);
router.patch("/:roomCode/close", closeRoom);

module.exports = router;
