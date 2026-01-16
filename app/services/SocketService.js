// services/SocketService.js
import { io } from "socket.io-client";

// Change this to your backend URL
const SOCKET_URL = "https://undeaf-crashing-ellie.ngrok-free.dev";

class SocketService {
  constructor() {
    this.socket = null;
    this.userId = null;
  }

  connect(userId) {
    if (this.socket?.connected && this.userId === userId) return;

    this.userId = userId;
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(SOCKET_URL, {
      transports: ["websocket"],
      extraHeaders: {
        "ngrok-skip-browser-warning": "true"
      },
      query: { userId },
      reconnection: true,
      reconnectionAttempts: 5,
    });

    // Basic connection events
    this.socket.on("connect", () => {
      console.log("✅ Connected to Socket Server");
    });

    this.socket.on("connect_error", (err) => {
      console.log("❌ Socket Error:", err.message);
      console.log("❌ Socket Connection Error Details:", err.message);

    });
  }

  joinRoom(roomId) {
    this.socket?.emit("user_connected", roomId);
    this.socket.on('connected', (data) => {
      console.log(`📡 Joined room: ${data.userId}`);
    });
  }

  on(event, callback) {
    this.socket?.on(event, callback);
  }

  emit(event, data) {
    this.socket?.emit(event, data);
  }

  removeListener(event) {
    this.socket?.off(event);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.userId = null;
    }
  }
}

// Create a single instance
const socketService = new SocketService();
export default socketService;