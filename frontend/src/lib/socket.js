import { io } from "socket.io-client";

const socketURL = process.env.REACT_APP_SOCKET_URL || process.env.REACT_APP_BACKEND_URL || "http://localhost:3003";

const socket = io(socketURL, {
  withCredentials: true,
  transports: ["websocket", "polling"],
});

export default socket;
