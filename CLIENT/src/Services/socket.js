import { io } from "socket.io-client";

const SOCKET_URL = "https://real-time-collaborative-coding-platform-8rvo.onrender.com";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});