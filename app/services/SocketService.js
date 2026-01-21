import { io } from "socket.io-client";

const SOCKET_URL = "https://undeaf-crashing-ellie.ngrok-free.dev";

class SocketService {
    constructor() {
        this.socket = null;
        this.token = null;
        this.isConnecting = false;
        this.connectionCallbacks = [];
        this.activeListeners = new Set(); // Track active listeners
    }

    connect(token) {
        // If already connecting or connected with same token, skip
        if ((this.socket?.connected || this.isConnecting) && this.token === token) {
            console.log("♻️ Using existing socket connection");
            return this.socket;
        }

        if (!token) {
            console.error("❌ Connection failed: No token provided");
            return null;
        }

        this.token = token;
        this.isConnecting = true;

        this.socket = io(SOCKET_URL, {
            transports: ["websocket"],
            auth: { token: token },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
        });

        // Connection events
        this.socket.on("connect", () => {
            console.log("✅ Socket Connected");
            this.isConnecting = false;
            this.notifyConnectionChange(true);
        });

        this.socket.on("connect_error", (err) => {
            console.error("❌ Socket Error:", err.message);
            this.isConnecting = false;
            this.notifyConnectionChange(false);
        });

        this.socket.on("disconnect", (reason) => {
            console.warn("🔌 Socket Disconnected:", reason);
            this.notifyConnectionChange(false);
            
            if (reason === "io server disconnect" || reason === "transport close") {
                console.log("🔄 Server disconnected, will attempt to reconnect...");
                setTimeout(() => {
                    if (this.token && !this.socket?.connected) {
                        console.log("Attempting to reconnect...");
                        this.connect(this.token);
                    }
                }, 2000);
            }
        });

        return this.socket;
    }

    // Simple emitter methods
    sendMessage(receiverId, content, receiverModel = "Agency") {
        if (!this.socket?.connected) {
            console.error("❌ Send failed: Socket not connected");
            return false;
        }

        console.log("📤 Sending message to:", receiverId);
        this.socket.emit("send_message", {
            receiver: receiverId,
            content: content,
            receiverModel: receiverModel
        });
        return true;
    }

    getConversations() {
        if (!this.socket?.connected) {
            console.error("❌ Not connected, cannot get conversations");
            return false;
        }
        console.log("📋 Requesting conversation list");
        this.socket.emit("get_conversations");
        return true;
    }

    // Listener methods - FIXED: Don't remove existing listeners
    onConversationList(callback) {
        // Check if we already have this listener
        if (this.activeListeners.has('conversation_list')) {
            console.log("📊 Conversation list listener already active");
            return;
        }
        
        console.log("📊 Setting up conversation list listener");
        this.socket?.on("conversation_list", callback);
        this.activeListeners.add('conversation_list');
    }

    onNewMessage(callback) {
        if (this.activeListeners.has('receive_message')) {
            console.log("📨 New message listener already active");
            return;
        }
        
        console.log("📨 Setting up new message listener");
        this.socket?.on("receive_message", callback);
        this.activeListeners.add('receive_message');
    }

    onSentMessage(callback) {
        if (this.activeListeners.has('sent_message')) {
            console.log("✅ Sent message listener already active");
            return;
        }
        
        console.log("✅ Setting up sent message listener");
        this.socket?.on("sent_message", callback);
        this.activeListeners.add('sent_message');
    }

    onConversationUpdate(callback) {
        if (this.activeListeners.has('conversation_updated')) {
            console.log("🔄 Conversation update listener already active");
            return;
        }
        
        console.log("🔄 Setting up conversation update listener");
        this.socket?.on("conversation_updated", callback);
        this.activeListeners.add('conversation_updated');
    }

    // Connection state methods
    onConnectionChange(callback) {
        this.connectionCallbacks.push(callback);
        return () => {
            this.connectionCallbacks = this.connectionCallbacks.filter(cb => cb !== callback);
        };
    }

    notifyConnectionChange(isConnected) {
        this.connectionCallbacks.forEach(callback => {
            try {
                callback(isConnected);
            } catch (error) {
                console.error("Error in connection callback:", error);
            }
        });
    }

    getConnectionState() {
        return this.socket?.connected || false;
    }

    // Cleanup methods - only use when needed
    removeListener(event) {
        this.socket?.off(event);
        this.activeListeners.delete(event);
        console.log(`🗑️ Removed listener for ${event}`);
    }

    removeAllListeners() {
        this.socket?.removeAllListeners();
        this.activeListeners.clear();
        this.connectionCallbacks = [];
        console.log("🗑️ Removed all listeners");
    }

    disconnect() {
        if (this.socket) {
            console.log("🔌 Disconnecting socket");
            this.socket.disconnect();
            this.socket = null;
            this.token = null;
            this.isConnecting = false;
            this.connectionCallbacks = [];
            this.activeListeners.clear();
        }
    }
    
    // Helper to check if listeners are active
    hasListener(event) {
        return this.activeListeners.has(event);
    }
}

export default new SocketService();