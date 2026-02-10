import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, StyleSheet, Text, TouchableOpacity, StatusBar, Image,
    Platform, KeyboardAvoidingView, ActivityIndicator
} from 'react-native';
import { GiftedChat, Bubble, Send, InputToolbar, Composer } from 'react-native-gifted-chat';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import socketService from '../../../services/SocketService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Config } from '../../../config';
import Toast from 'react-native-toast-message';

const COLORS = {
    primary: '#769FCD',
    background: '#F8FBFF',
    white: '#FFFFFF',
    textPrimary: '#2D3748',
    textSecondary: '#64748B',
    border: '#E0EBFF',
    online: '#10B981',
    sentMsg: '#769FCD',
    receivedMsg: '#F1F3F5',
    accent: '#E8F1FF',
    headerBg: '#FFFFFF',
    error: '#EF4444',
    inputBg: '#F8FAFC',
};

export default function ChatScreen() {
    const { recipientId, name, logo, recipientType, initialConversationId, agencyId } = useLocalSearchParams();
    const router = useRouter();
    const { userToken, activeAgency, user } = useAuth();
    const insets = useSafeAreaInsets();

    const currentAgencyId = agencyId || activeAgency?.id;
    const currentUserId = user?.id || 'current_user';

    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [socketReady, setSocketReady] = useState(false);
    const [conversationId, setConversationId] = useState(initialConversationId || null);
    
    // Ref to track if we've loaded initial messages
    const hasLoadedMessages = useRef(false);
    const pendingMessages = useRef([]);

    // --- 1. LOAD MESSAGES FROM CONVERSATION_LIST EVENT ---
    const loadMessagesFromConversationList = useCallback((conversationList) => {
        if (!Array.isArray(conversationList)) {
            console.log("⚠️ Invalid conversation list format");
            return;
        }

        // Find the conversation with this recipient
        const conversation = conversationList.find(conv => 
            conv.recipient?.id === recipientId || 
            conv._id === initialConversationId
        );

        if (!conversation) {
            console.log("📭 No existing conversation found for recipient:", recipientId);
            setIsLoading(false);
            hasLoadedMessages.current = true;
            return;
        }

        console.log(`📥 Found conversation with ${conversation.messages?.length || 0} messages`);

        // Update conversation ID if found
        if (conversation._id && !conversationId) {
            setConversationId(conversation._id);
        }

        // Format and set messages
        const rawMessages = conversation.messages || [];
        const formatted = rawMessages.map(msg => ({
            _id: msg._id,
            text: msg.content,
            createdAt: new Date(msg.createdAt),
            user: {
                _id: msg.senderModel === 'Student' ? currentUserId : 'other_user',
                name: msg.senderModel === 'Student' ? 'You' : (name || 'Support'),
                avatar: msg.senderModel === 'Student' ? null : logo,
            },
        })).reverse(); // GiftedChat needs newest first

        setMessages(formatted);
        console.log(`✅ Loaded ${formatted.length} messages from conversation_list`);
        setIsLoading(false);
        hasLoadedMessages.current = true;
    }, [recipientId, initialConversationId, conversationId, currentUserId, name, logo]);

    const fetchChatHistory = useCallback(async (id) => {
        if (!id || !userToken) return;
        try {
            console.log(`📡 Fetching history via API for conversation: ${id}`);
            const response = await fetch(`${Config.API_BASE_URL}/students/conversation/${id}/messages`, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });

            if (!response.ok) throw new Error("Failed to fetch messages");

            const data = await response.json();
            
            const rawMessages = data.messages || data;

            const formatted = Array.isArray(rawMessages) ? rawMessages.map(msg => ({
                _id: msg._id,
                text: msg.content,
                createdAt: new Date(msg.createdAt),
                user: {
                    _id: msg.senderModel === 'Student' ? currentUserId : 'other_user',
                    name: msg.senderModel === 'Student' ? 'You' : (name || 'Support'),
                    avatar: msg.senderModel === 'Student' ? null : logo,
                },
            })).reverse() : [];

            setMessages(formatted);
            console.log(`✅ Loaded ${formatted.length} messages from API`);
        } catch (error) {
            console.error("❌ API Fetch Error:", error);
        } finally {
            setIsLoading(false);
            hasLoadedMessages.current = true;
        }
    }, [userToken, name, logo, currentUserId]);

    // --- 3. MESSAGE HANDLERS ---
    
    /**
     * Handle incoming messages from other users (backend event: receive_message)
     */
    const handleReceiveMessage = useCallback((message) => {
        console.log("📩 Received message:", message);

        // Check if message is for this conversation
        const isForThisChat = 
            message.sender === recipientId || 
            message.receiver === recipientId ||
            (message.conversationId && message.conversationId === conversationId);

        if (!isForThisChat) {
            console.log("📭 Message not for this conversation, ignoring");
            return;
        }

        setMessages(prev => {
            // Prevent duplicates
            if (prev.some(m => m._id === message._id)) {
                console.log("⚠️ Duplicate message, skipping");
                return prev;
            }

            const isMe = message.senderModel === 'Student';
            const formatted = {
                _id: message._id,
                text: message.content,
                createdAt: new Date(message.createdAt || new Date()),
                user: {
                    _id: isMe ? currentUserId : 'other_user',
                    name: isMe ? 'You' : (name || 'Support'),
                    avatar: isMe ? null : logo,
                },
            };

            console.log("✅ Adding received message to chat");
            return GiftedChat.append(prev, [formatted]);
        });

        // Update conversation ID if this is a new conversation
        if (message.conversationId && !conversationId) {
            console.log("🆕 Conversation ID received:", message.conversationId);
            setConversationId(message.conversationId);
        }
    }, [recipientId, conversationId, name, logo, currentUserId]);

    // --- 4. LIFECYCLE & SOCKET CONNECTION ---
    useEffect(() => {
        console.log("🚀 Initializing ChatScreen for recipient:", recipientId);

        if (!userToken || !currentAgencyId) {
            console.log("⏳ Waiting for userToken and agencyId...");
            return;
        }

        // Reset state for new chat
        hasLoadedMessages.current = false;
        pendingMessages.current = [];
        setIsLoading(true);

        // Connect socket
        const socket = socketService.connect(userToken, currentAgencyId);

        if (socket?.connected) {
            console.log("✅ Socket already connected");
            setIsConnected(true);
            setSocketReady(true);
        }

        // Listen for connection state changes
        const unsubStatus = socketService.onConnectionChange((connected) => {
            console.log("🔌 Connection state changed:", connected);
            setIsConnected(connected);
            setSocketReady(connected);
        });

        // ====== BACKEND EVENT: conversation_list ======
        // This automatically fires when socket connects - contains full history
        const unsubConversationList = socketService.onConversationList((conversationList) => {
            console.log("📋 Received conversation_list with", conversationList?.length, "conversations");
                console.log("RAW conversation_list DATA:", JSON.stringify(conversationList, null, 2));
            if (!hasLoadedMessages.current) {
                loadMessagesFromConversationList(conversationList);
            }
        });

        // ====== BACKEND EVENT: receive_message ======
        const unsubReceive = socketService.onReceiveMessage(handleReceiveMessage);

        // Fallback: If conversation_list doesn't arrive in 3 seconds, try API
        const fallbackTimer = setTimeout(() => {
            if (!hasLoadedMessages.current && initialConversationId) {
                console.log("⏰ Conversation list timeout, fetching via API");
                fetchChatHistory(initialConversationId);
            } else if (!hasLoadedMessages.current) {
                console.log("📭 No conversation ID, starting fresh chat");
                setIsLoading(false);
                hasLoadedMessages.current = true;
            }
        }, 3000);

        return () => {
            console.log("🧹 Cleaning up ChatScreen listeners");
            clearTimeout(fallbackTimer);
            unsubStatus();
            unsubConversationList();
            unsubReceive();
        };
    }, [userToken, currentAgencyId, recipientId, initialConversationId, handleReceiveMessage, loadMessagesFromConversationList, fetchChatHistory]);

    // --- 5. SEND ACTION ---
    const onSend = useCallback(async (newMessages = []) => {
        const message = newMessages[0];

        if (!message.text || message.text.trim().length === 0) {
            console.log("⚠️ Empty message, skipping send");
            return;
        }

        // Check socket connection
        const isActuallyConnected = socketService.socket?.connected;

        if (!isActuallyConnected) {
            Toast.show({
                type: 'info',
                text1: 'Connecting...',
                text2: 'Establishing connection, please wait.',
                position: 'top',
            });
            console.log("⏳ Socket not connected, cannot send");
            return;
        }

        // Optimistically add message to UI
        setMessages(prev => GiftedChat.append(prev, newMessages));

        try {
            console.log("📤 Sending message via socket to:", recipientId);
            
            const success = socketService.sendMessage(
                recipientId,
                message.text.trim(),
                recipientType || "Agency"
            );

            if (!success) {
                console.error("❌ Socket send failed");
                Toast.show({
                    type: 'error',
                    text1: 'Failed to Send',
                    text2: 'Could not send message. Please try again.',
                    position: 'top',
                });
                
                // Remove optimistically added message on failure
                setMessages(prev => prev.filter(m => m._id !== message._id));
            } else {
                console.log("✅ Message sent successfully");
            }
        } catch (error) {
            console.error("❌ Socket Send Error:", error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to send message. Check your connection.',
                position: 'top',
            });
            
            // Remove optimistically added message on error
            setMessages(prev => prev.filter(m => m._id !== message._id));
        }
    }, [recipientId, recipientType]);

    // --- 6. CUSTOM UI COMPONENTS ---
    const renderBubble = (props) => (
        <Bubble
            {...props}
            wrapperStyle={{
                right: {
                    backgroundColor: COLORS.sentMsg,
                    borderRadius: 18,
                    paddingHorizontal: 4,
                    paddingVertical: 2,
                },
                left: {
                    backgroundColor: COLORS.receivedMsg,
                    borderRadius: 18,
                    paddingHorizontal: 4,
                    paddingVertical: 2,
                }
            }}
            textStyle={{
                right: { 
                    color: COLORS.white,
                    fontSize: 15,
                    lineHeight: 20,
                },
                left: { 
                    color: COLORS.textPrimary,
                    fontSize: 15,
                    lineHeight: 20,
                }
            }}
            timeTextStyle={{
                right: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
                left: { color: COLORS.textSecondary, fontSize: 11 }
            }}
        />
    );

    const renderSend = (props) => (
        <Send {...props} disabled={!socketReady}>
            <View style={[
                styles.sendButton,
                !socketReady && styles.sendButtonDisabled
            ]}>
                <Ionicons 
                    name="arrow-up" 
                    size={22} 
                    color={socketReady ? COLORS.white : COLORS.textSecondary} 
                />
            </View>
        </Send>
    );

    const renderInputToolbar = (props) => (
        <InputToolbar
            {...props}
            containerStyle={styles.inputToolbar}
            primaryStyle={styles.inputPrimary}
        />
    );

    const renderComposer = (props) => (
        <Composer
            {...props}
            textInputStyle={styles.composer}
            placeholder={socketReady ? "Message..." : "Connecting..."}
            placeholderTextColor={COLORS.textSecondary}
        />
    );

    const renderChatEmpty = () => (
        <View style={styles.emptyChat}>
            <View style={styles.emptyIconContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color={COLORS.border} />
            </View>
            <Text style={styles.emptyTitle}>Start a conversation</Text>
            <Text style={styles.emptySubtitle}>
                Send a message to {name || 'start chatting'}
            </Text>
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.headerBg} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                
                <View style={styles.headerInfo}>
                    <View style={styles.avatarContainer}>
                        {logo ? (
                            <Image source={{ uri: logo }} style={styles.headerAvatar} />
                        ) : (
                            <View style={styles.placeholderAvatar}>
                                <Text style={styles.avatarText}>
                                    {name?.[0]?.toUpperCase() || 'S'}
                                </Text>
                            </View>
                        )}
                        <View style={[
                            styles.statusIndicator,
                            { backgroundColor: isConnected ? COLORS.online : COLORS.error }
                        ]} />
                    </View>
                    
                    <View style={styles.headerContent}>
                        <Text style={styles.headerName} numberOfLines={1}>{name || 'Support'}</Text>
                        <View style={styles.statusRow}>
                            <View style={[
                                styles.statusDot,
                                { backgroundColor: isConnected ? COLORS.online : COLORS.error }
                            ]} />
                            <Text style={styles.headerStatus}>
                                {isConnected ? 'Active now' : 'Connecting...'}
                            </Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity style={styles.headerAction}>
                    <Ionicons name="information-circle-outline" size={24} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            {/* Chat Container */}
            <KeyboardAvoidingView
                style={styles.chatContainer}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
            >
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Loading messages...</Text>
                    </View>
                ) : (
                    <GiftedChat
                        messages={messages}
                        onSend={onSend}
                        user={{ _id: currentUserId }}
                        renderBubble={renderBubble}
                        renderSend={renderSend}
                        renderInputToolbar={renderInputToolbar}
                        renderComposer={renderComposer}
                        renderChatEmpty={renderChatEmpty}
                        renderAvatar={null}
                        alwaysShowSend
                        scrollToBottom
                        scrollToBottomComponent={() => (
                            <View style={styles.scrollToBottomButton}>
                                <Ionicons name="chevron-down" size={20} color={COLORS.primary} />
                            </View>
                        )}
                        textInputProps={{
                            autoCorrect: true,
                            autoCapitalize: 'sentences',
                            keyboardAppearance: 'light',
                            editable: socketReady,
                        }}
                        bottomOffset={Platform.OS === 'ios' ? insets.bottom : 0}
                        minInputToolbarHeight={56}
                        maxComposerHeight={100}
                    />
                )}
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.headerBg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    headerAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.accent,
    },
    placeholderAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.primary,
    },
    statusIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    headerContent: {
        flex: 1,
    },
    headerName: {
        fontSize: 17,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    headerStatus: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    headerAction: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chatContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    emptyChat: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        transform: [{ scaleY: -1 }],
    },
    emptyIconContainer: {
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    inputToolbar: {
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingHorizontal: 12,
        paddingVertical: 8,
        minHeight: 56,
    },
    inputPrimary: {
        alignItems: 'center',
    },
    composer: {
        backgroundColor: COLORS.inputBg,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
        fontSize: 15,
        color: COLORS.textPrimary,
        lineHeight: 20,
        marginRight: 8,
    },
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 4,
        marginBottom: 6,
    },
    sendButtonDisabled: {
        backgroundColor: COLORS.border,
    },
    scrollToBottomButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
});