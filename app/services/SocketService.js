import { io } from "socket.io-client";

const SOCKET_URL = "https://undeaf-crashing-ellie.ngrok-free.dev";

class SocketService {
    constructor() {
        this.socket = null;
        this.token = null;
        this.currentAgencyId = null; // Track current agency
        this.isConnecting = false;
        this.connectionCallbacks = [];
        this.activeListeners = new Set(); // Track active listeners
    }

    connect(token, agencyId = null) {
        // If already connecting or connected with same token and agency, skip
        if ((this.socket?.connected || this.isConnecting) && 
            this.token === token && 
            this.currentAgencyId === agencyId) {
            console.log("♻️ Using existing socket connection for agency:", agencyId); // FIXED: removed extra "66"
            return this.socket;
        }

        // If agency changed, disconnect old socket
        if (this.currentAgencyId !== agencyId && this.socket?.connected) {
            console.log("🔄 Agency changed, reconnecting socket");
            this.disconnect();
        }

        if (!token) {
            console.error("❌ Connection failed: No token provided");
            return null;
        }

        this.token = token;
        this.currentAgencyId = agencyId;
        this.isConnecting = true;

        console.log("🔌 Connecting socket for agency:", agencyId);

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
            console.log("✅ Socket Connected for agency:", this.currentAgencyId);
            this.isConnecting = false;
            this.notifyConnectionChange(true);
            
            // Request conversation list on connect (backend already sends it automatically)
            console.log("📋 Socket connected, ready to receive conversation list");
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
                        this.connect(this.token, this.currentAgencyId);
                    }
                }, 2000);
            }
        });

        // Listen for error events from backend
        this.socket.on("error", (error) => {
            console.error("❌ Socket error from server:", error);
        });

        return this.socket;
    }

    updateAgencyContext(agencyId) {
        if (this.currentAgencyId !== agencyId) {
            console.log("🔄 Updating socket agency context to:", agencyId);
            this.currentAgencyId = agencyId;
            if (this.socket?.connected && this.token) {
                this.connect(this.token, agencyId);
            }
        }
    }

    // Simple emitter methods
    sendMessage(receiverId, content, receiverModel = "Agency") {
        if (!this.socket?.connected) {
            console.error("❌ Send failed: Socket not connected");
            return false;
        }

        console.log("📤 Sending message to:", receiverId, "agency:", this.currentAgencyId);
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

    // Listener methods - IMPROVED: Allow multiple listeners for same event
    onConversationList(callback) {
        console.log("📊 Setting up conversation list listener");
        this.socket?.on("conversation_list", callback);
        this.activeListeners.add('conversation_list');
        return () => {
            this.socket?.off("conversation_list", callback);
        };
    }

    onNewMessage(callback) {
        console.log("📨 Setting up new message listener");
        this.socket?.on("receive_message", callback);
        this.activeListeners.add('receive_message');
        return () => {
            this.socket?.off("receive_message", callback);
        };
    }

    onSentMessage(callback) {
        console.log("✅ Setting up sent message listener");
        this.socket?.on("sent_message", callback);
        this.activeListeners.add('sent_message');
        return () => {
            this.socket?.off("sent_message", callback);
        };
    }

    onConversationUpdate(callback) {
        console.log("🔄 Setting up conversation update listener");
        this.socket?.on("conversation_updated", callback);
        this.activeListeners.add('conversation_updated');
        return () => {
            this.socket?.off("conversation_updated", callback);
        };
    }

    onError(callback) {
        console.log("🚨 Setting up error listener");
        this.socket?.on("error", callback);
        this.activeListeners.add('error');
        return () => {
            this.socket?.off("error", callback);
        };
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

    getCurrentAgencyId() {
        return this.currentAgencyId;
    }

    // Cleanup methods - IMPROVED
    removeListener(event, callback = null) {
        if (callback) {
            this.socket?.off(event, callback);
        } else {
            this.socket?.off(event);
        }
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
            this.currentAgencyId = null;
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