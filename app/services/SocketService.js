import { io } from "socket.io-client";

const SOCKET_URL = "https://undeaf-crashing-ellie.ngrok-free.dev";

class SocketService {
    constructor() {
        this.socket = null;
        this.token = null;
        this.currentAgencyId = null; 
        this.isConnecting = false;
        this.connectionCallbacks = [];
        this.activeListeners = new Set(); 
    }

    connect(token, agencyId = null) {
        // If already connecting or connected with same token and agency, skip
        if ((this.socket?.connected || this.isConnecting) && 
            this.token === token && 
            this.currentAgencyId === agencyId) {
            console.log("♻️ Using existing socket connection for agency:", agencyId);
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
            
            // Backend automatically sends conversation list on connect
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

    // ====== BACKEND EVENT EMITTERS ======
    
    /**
     * Send a message to a recipient
     * @param {string} receiverId - ID of the recipient
     * @param {string} content - Message content
     * @param {string} receiverModel - Model type (default: "Agency")
     */
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

    // ====== BACKEND EVENT LISTENERS ======

    /**
     * Listen for conversation list (automatically sent by backend on connect)
     * Backend sends full chat history and chat list
     * @param {Function} callback - Callback function to handle conversation list
     * @returns {Function} Cleanup function
     */
    onConversationList(callback) {
        if (!this.socket) {
            console.error("❌ Socket not initialized");
            return () => {};
        }

        console.log("📊 Setting up conversation_list listener");
        this.socket.on("conversation_list", callback);
        this.activeListeners.add('conversation_list');
        
        return () => {
            this.socket?.off("conversation_list", callback);
            this.activeListeners.delete('conversation_list');
        };
    }

    /**
     * Listen for incoming messages from other users
     * @param {Function} callback - Callback function to handle received messages
     * @returns {Function} Cleanup function
     */
    onReceiveMessage(callback) {
        if (!this.socket) {
            console.error("❌ Socket not initialized");
            return () => {};
        }

        console.log("📨 Setting up receive_message listener");
        this.socket.on("receive_message", callback);
        this.activeListeners.add('receive_message');
        
        return () => {
            this.socket?.off("receive_message", callback);
            this.activeListeners.delete('receive_message');
        };
    }

    /**
     * Listen for sent message confirmation (delivery status)
     * Shows if message is delivered
     * @param {Function} callback - Callback function to handle sent message status
     * @returns {Function} Cleanup function
     */
    onSentMessage(callback) {
        if (!this.socket) {
            console.error("❌ Socket not initialized");
            return () => {};
        }

        console.log("✅ Setting up sent_message listener");
        this.socket.on("sent_message", callback);
        this.activeListeners.add('sent_message');
        
        return () => {
            this.socket?.off("sent_message", callback);
            this.activeListeners.delete('sent_message');
        };
    }

    // ====== CONNECTION STATE METHODS ======

    /**
     * Listen for connection state changes
     * @param {Function} callback - Callback with isConnected boolean
     * @returns {Function} Cleanup function
     */
    onConnectionChange(callback) {
        this.connectionCallbacks.push(callback);
        // Immediately notify of current state
        callback(this.socket?.connected || false);
        
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

    // ====== CLEANUP METHODS ======

    /**
     * Remove a specific listener
     * @param {string} event - Event name
     * @param {Function} callback - Specific callback to remove (optional)
     */
    removeListener(event, callback = null) {
        if (callback) {
            this.socket?.off(event, callback);
        } else {
            this.socket?.off(event);
        }
        this.activeListeners.delete(event);
        console.log(`🗑️ Removed listener for ${event}`);
    }

    /**
     * Remove all event listeners
     */
    removeAllListeners() {
        this.socket?.removeAllListeners();
        this.activeListeners.clear();
        this.connectionCallbacks = [];
        console.log("🗑️ Removed all listeners");
    }

    /**
     * Disconnect socket and cleanup
     */
    disconnect() {
        if (this.socket) {
            console.log("🔌 Disconnecting socket");
            this.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
            this.token = null;
            this.currentAgencyId = null;
            this.isConnecting = false;
        }
    }
   
    /**
     * Check if a specific listener is active
     * @param {string} event - Event name to check
     * @returns {boolean}
     */
    hasListener(event) {
        return this.activeListeners.has(event);
    }
}

export default new SocketService();