import { io } from "socket.io-client";
import backendURL from "./backendUrl";

const socket = io(backendURL, {
  withCredentials: true,
  transports: ["websocket", "polling"],
});

export default socket;
