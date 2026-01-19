// services/SocketService.js
import { io } from "socket.io-client";

const SOCKET_URL = "https://undeaf-crashing-ellie.ngrok-free.dev";

class SocketService {
  constructor() {
    this.socket = null;
    this.token = null;
  }

  // Just call this once when the app loads or user logs in
  connect(token) {
    if (this.socket?.connected || !token) return;

    this.token = token;
    
    this.socket = io(SOCKET_URL, {
      transports: ["websocket"],
      extraHeaders: { "ngrok-skip-browser-warning": "true" },
      auth: { token: token }, 
    });

    this.socket.on("connect", () => console.log("✅ Chat Online"));
    this.socket.on("connect_error", (err) => console.log("❌ Chat Offline:", err.message));
  }

  /**
   * EASY SEND: Just pass the receiver ID and the text.
   * We default the receiverModel to 'Agency' for your specific use case.
   */
  sendMessage(receiverId, content, receiverModel = "Agency") {
    if (!this.socket?.connected) return console.warn("Cannot send: Socket disconnected");

    this.socket.emit("send_message", {
      receiver: receiverId,
      content: content,
      receiverModel: receiverModel
    });
  }

  // EASY LISTEN: Just provide a function to run when a message arrives
  onNewMessage(callback) {
    this.socket?.on("receive_message", (data) => {
      // data.message contains the full object from backend
      callback(data.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

const socketService = new SocketService();
export default socketService;