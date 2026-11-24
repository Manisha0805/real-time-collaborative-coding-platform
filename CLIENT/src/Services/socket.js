import { io } from "socket.io-client";
import { SOCKET_URL } from "../config";
import { getToken } from "../API/client";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  // The server verifies this JWT during the handshake; it is read fresh on every (re)connect.
  auth: (cb) => cb({ token: getToken() }),
  // Socket.IO default: start with HTTP long-polling, then upgrade to WebSocket.
  // Works through proxies/CDNs that block a direct WebSocket handshake.
  transports: ["polling", "websocket"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});
