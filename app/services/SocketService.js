import { io } from "socket.io-client";

const SOCKET_URL = "https://undeaf-crashing-ellie.ngrok-free.dev";

class SocketService {
    constructor() {
        this.socket               = null;
        this.token                = null;
        this.isConnecting         = false;
        this._manualDisconnect    = false;
        this.reconnectAttempts    = 0;
        this.maxReconnectAttempts = 5;
        this.baseReconnectDelay   = 1000;

        this._connSubs  = new Map();
        this._connSubId = 0;

        this._eventListeners = new Map();
        this._listenerIdSeq  = 0;

        // Buffer events that arrive before any listener has registered.
        // When the first listener for a buffered event registers, we
        // immediately replay everything in the buffer then clear it.
        // This solves the race where the backend pushes `new_message`
        // (auto-message) the instant the socket connects, before the
        // React component's useEffect has had a chance to call onNewMessage().
        this._eventBuffer    = new Map(); // event → payload[]
        this._bufferedEvents = new Set(['new_message', 'conversation_messages']);
    }

    // ═══════════════════════════════════════════════════════
    //  CONNECTION
    // ═══════════════════════════════════════════════════════

    connect(token) {
        if (!token) {
            console.error("❌ connect(): no token provided");
            return null;
        }

        if (this.socket?.connected && this.token === token) {
            console.log("♻️  Socket already connected:", this.socket.id);
            return this.socket;
        }

        if (this.isConnecting && this.token === token) {
            console.log("⏳ Connection already in progress");
            return this.socket;
        }

        if (this.socket) {
            console.log("🔄 Disconnecting old socket");
            this._manualDisconnect = true;
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }

        this.token             = token;
        this.isConnecting      = true;
        this._manualDisconnect = false;
        this.reconnectAttempts = 0;

        // Clear buffer on fresh connect so stale auto-messages don't replay
        this._eventBuffer.clear();

        this._createSocket();
        return this.socket;
    }

    _createSocket() {
        console.log("🔌 Creating socket instance");
        this.socket = io(SOCKET_URL, {
            transports:   ["websocket"],
            auth:         { token: this.token },
            reconnection: false,
            timeout:      20_000,
            forceNew:     true,
        });

        this._bindCoreEvents();
        this._reattachEventListeners();
    }

    _reattachEventListeners() {
        this._eventListeners.forEach((listeners, event) => {
            listeners.forEach(cb => {
                this.socket.on(event, cb);
            });
        });
    }

    _bindCoreEvents() {
        this.socket.on("connect", () => {
            console.log("✅ Socket connected:", this.socket.id);
            this.isConnecting      = false;
            this.reconnectAttempts = 0;
            this._broadcastConn(true);
            this.socket.emit("conversation_list");
        });

        // Buffer incoming events that might arrive before listeners register
        this._bufferedEvents.forEach(event => {
            this.socket.on(event, (payload) => {
                const listeners = this._eventListeners.get(event);
                if (!listeners || listeners.size === 0) {
                    // No listener yet — buffer it
                    console.log(`📦 Buffering ${event} (no listener yet)`);
                    if (!this._eventBuffer.has(event)) {
                        this._eventBuffer.set(event, []);
                    }
                    const buf = this._eventBuffer.get(event);
                    buf.push(payload);
                    // Cap buffer size to avoid memory issues
                    if (buf.length > 20) buf.shift();
                }
                // Note: actual delivery to listeners is handled by socket.io's
                // own listener binding in _registerListener / _reattachEventListeners.
                // The buffer is ONLY for the window before the first listener registers.
            });
        });

        this.socket.on("connect_error", (err) => {
            console.error("❌ connect_error:", err.message);
            this.isConnecting = false;

            const isAuth = err.message === "Authentication error"
                || err.message?.toLowerCase().includes("auth");

            if (isAuth) {
                console.error("🔐 Auth failed — stopping reconnect");
                this._broadcastConn(false);
                return;
            }

            this._scheduleReconnect();
        });

        this.socket.on("disconnect", (reason) => {
            console.warn("⚠️  Disconnected:", reason);
            this._broadcastConn(false);

            if (!this._manualDisconnect) {
                this._scheduleReconnect();
            }
        });

        this.socket.on("error", (e) => {
            console.error("❌ Socket error:", e);
        });
    }

    _scheduleReconnect() {
        if (this._manualDisconnect || !this.token) return;

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error("❌ Max reconnect attempts reached");
            this._broadcastConn(false);
            return;
        }

        const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts);
        this.reconnectAttempts++;

        console.log(
            `🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
        );

        setTimeout(() => {
            if (!this._manualDisconnect && this.token) {
                if (this.socket) {
                    this.socket.removeAllListeners();
                    this.socket.disconnect();
                    this.socket = null;
                }
                this.isConnecting = true;
                this._createSocket();
            }
        }, delay);
    }

    disconnect() {
        console.log("🔌 Manual disconnect");
        this._manualDisconnect = true;

        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }

        this.token             = null;
        this.isConnecting      = false;
        this.reconnectAttempts = 0;
        this._eventBuffer.clear();
        this._broadcastConn(false);
    }

    // ═══════════════════════════════════════════════════════
    //  OUTGOING EVENTS
    // ═══════════════════════════════════════════════════════

    getConversationMessages(conversationId, cursorCreatedAt = null, cursorId = null, limit = 20) {
        if (!this._assertConn("get_conversation_messages")) return false;

        const payload = { conversationId, limit };
        if (cursorCreatedAt && cursorId) {
            payload.cursorCreatedAt = cursorCreatedAt;
            payload.cursorId        = cursorId;
        }

        console.log("📤 get_conversation_messages →", payload);
        this.socket.emit("get_conversation_messages", payload);
        return true;
    }

    sendMessage(receiver, receiverModel, content, conversationId = null) {
        if (!this._assertConn("send_message")) return false;

        if (!receiver || !receiverModel) {
            console.error("❌ sendMessage: missing receiver/receiverModel");
            return false;
        }

        if (!content?.trim()) {
            console.error("❌ sendMessage: empty content");
            return false;
        }

        const payload = {
            receiver,
            receiverModel,
            content: content.trim(),
        };

        if (conversationId) payload.conversationId = conversationId;

        console.log("📤 send_message →", payload);
        this.socket.emit("send_message", payload);
        return true;
    }

    editMessage(messageId, newContent) {
        if (!this._assertConn("edit_message")) return false;

        if (!newContent?.trim()) {
            console.error("❌ editMessage: empty content");
            return false;
        }

        console.log("📤 edit_message →", { messageId, newContent });
        this.socket.emit("edit_message", { messageId, newContent: newContent.trim() });
        return true;
    }

    deleteMessage(messageId, deleteFor = "me") {
        if (!this._assertConn("delete_message")) return false;

        console.log("📤 delete_message →", { messageId, deleteFor });
        this.socket.emit("delete_message", { messageId, deleteFor });
        return true;
    }

    emitTypingStart(receiverId, conversationId) {
        if (!this._assertConn("typing_start")) return false;
        this.socket.emit("typing_start", { receiverId, conversationId });
        return true;
    }

    emitTypingStop(receiverId, conversationId) {
        if (!this._assertConn("typing_stop")) return false;
        this.socket.emit("typing_stop", { receiverId, conversationId });
        return true;
    }

    // ═══════════════════════════════════════════════════════
    //  INCOMING EVENT SUBSCRIPTIONS
    // ═══════════════════════════════════════════════════════

    _registerListener(event, cb) {
        if (!this._eventListeners.has(event)) {
            this._eventListeners.set(event, new Map());
        }

        const id = ++this._listenerIdSeq;
        this._eventListeners.get(event).set(id, cb);

        if (this.socket) {
            this.socket.on(event, cb);
        }

        // If this is the FIRST listener for a buffered event,
        // immediately replay anything that arrived before it registered.
        if (
            this._bufferedEvents.has(event) &&
            this._eventListeners.get(event).size === 1 &&
            this._eventBuffer.has(event)
        ) {
            const buffered = this._eventBuffer.get(event);
            if (buffered.length > 0) {
                console.log(`🔁 Replaying ${buffered.length} buffered ${event} event(s)`);
                // Use setTimeout(0) so the caller's useEffect fully completes
                // before the replay fires — avoids partial-state issues.
                setTimeout(() => {
                    buffered.forEach(payload => {
                        try { cb(payload); } catch (e) { console.error('Buffer replay error:', e); }
                    });
                }, 0);
            }
            this._eventBuffer.delete(event);
        }

        return () => {
            const map = this._eventListeners.get(event);
            if (map) {
                map.delete(id);
                if (map.size === 0) {
                    this._eventListeners.delete(event);
                }
            }
            if (this.socket) {
                this.socket.off(event, cb);
            }
        };
    }

    onConversationList(cb)       { return this._registerListener("conversation_list",      cb); }
    onConversationMessages(cb)   { return this._registerListener("conversation_messages",  cb); }
    onNewMessage(cb)             { return this._registerListener("new_message",            cb); }
    onMessageSent(cb)            { return this._registerListener("message_sent",           cb); }
    onMessageError(cb)           { return this._registerListener("message_error",          cb); }
    onConversationUpdated(cb)    { return this._registerListener("conversation_updated",   cb); }
    onMessageEdited(cb)          { return this._registerListener("message_edited",         cb); }
    onMessageDeleted(cb)         { return this._registerListener("message_deleted",        cb); }
    onUserTyping(cb)             { return this._registerListener("user_typing",            cb); }
    onUserStoppedTyping(cb)      { return this._registerListener("user_stopped_typing",    cb); }
    onMessageStatusUpdated(cb)   { return this._registerListener("message_status_updated", cb); }

    // ═══════════════════════════════════════════════════════
    //  CONNECTION-STATE SUBSCRIPTION
    // ═══════════════════════════════════════════════════════

    onConnectionChange(cb) {
        const id = ++this._connSubId;
        this._connSubs.set(id, cb);

        try {
            cb(this.isConnected());
        } catch (e) {
            console.error("onConnectionChange callback error:", e);
        }

        return () => this._connSubs.delete(id);
    }

    isConnected() {
        return this.socket?.connected ?? false;
    }

    _assertConn(label) {
        if (!this.socket?.connected) {
            console.error(`❌ ${label}: socket not connected`);
            return false;
        }
        return true;
    }

    _broadcastConn(state) {
        this._connSubs.forEach(cb => {
            try {
                cb(state);
            } catch (e) {
                console.error("Connection callback error:", e);
            }
        });
    }
}

export default new SocketService();


