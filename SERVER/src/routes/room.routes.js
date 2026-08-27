const express = require("express");

const {
  createRoom,
  getRoomDetails,
  getRoomMembers,
  closeRoom,
} = require("../controllers/room.controller");

const router = express.Router();

// Create room
router.post("/", createRoom);

// Room members
router.get("/:roomCode/members", getRoomMembers);

// Room details
router.get("/:roomCode", getRoomDetails);

// Close room
router.patch("/:roomCode/close", closeRoom);

module.exports = router;