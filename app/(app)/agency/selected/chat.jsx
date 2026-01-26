import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, StyleSheet, Text, TouchableOpacity, StatusBar, Image,
    Platform, KeyboardAvoidingView, Alert, ActivityIndicator
} from 'react-native';
import { GiftedChat, Bubble } from 'react-native-gifted-chat';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import socketService from '../../../services/SocketService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
    primary: '#0084FF',
    background: '#FFFFFF',
    white: '#FFFFFF',
    textPrimary: '#000000',
    textSecondary: '#8E8E93',
    border: '#E5E5EA',
    online: '#10B981',
    sentMsg: '#0084FF',
    receivedMsg: '#E4E6EB',
    accent: '#D8E5FF',
    headerBg: '#FFFFFF',
    error: '#FF3B30',
};

const BASE_URL = 'https://edu-agent-backend-nine.vercel.app/api/v1/students';

export default function ChatScreen() {
    const { recipientId, name, logo, recipientType, initialConversationId, agencyId } = useLocalSearchParams();
    const router = useRouter();
    const { userToken, activeAgency } = useAuth();
    const insets = useSafeAreaInsets();

    const currentAgencyId = agencyId || activeAgency?.id;
    const currentUserId = 'current_user'; 

    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [socketReady, setSocketReady] = useState(false);
    const [conversationId, setConversationId] = useState(initialConversationId || null);

    // --- 1. DEFINE HANDLERS (Must be above useEffect to avoid ReferenceErrors) ---

    const fetchChatHistory = useCallback(async (id) => {
        if (!id || !userToken) return;
        try {
            const response = await fetch(`${BASE_URL}/conversation/${id}/messages`, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });
            const data = await response.json();
            
            // Backend returns messages in old -> new order; GiftedChat needs new -> old
            const rawMessages = data.messages || data;
            const formatted = Array.isArray(rawMessages) ? rawMessages.map(msg => ({
                _id: msg._id,
                text: msg.content,
                createdAt: new Date(msg.createdAt),
                user: {
                    _id: msg.senderModel === 'Student' ? currentUserId : 'other_user',
                    name: msg.senderModel === 'Student' ? 'You' : (name || 'Agency'),
                    avatar: msg.senderModel === 'Student' ? null : logo,
                },
            })).reverse() : [];
            
            setMessages(formatted);
        } catch (error) {
            console.error("Fetch Error:", error);
        } finally {
            setIsLoading(false);
        }
    }, [userToken, name, logo]);

    const handleReceiveMessage = useCallback((message) => {
        // Prevent duplicate messages
        setMessages(prev => {
            if (prev.some(m => m._id === message._id)) return prev;
            
            const isMe = message.senderModel === 'Student';
            const formatted = {
                _id: message._id,
                text: message.content,
                createdAt: new Date(message.createdAt),
                user: {
                    _id: isMe ? currentUserId : 'other_user',
                    name: isMe ? 'You' : (name || 'Support'),
                    avatar: isMe ? null : logo,
                },
            };
            return GiftedChat.append(prev, [formatted]);
        });
    }, [name, logo]);

    const handleSentMessage = useCallback((message) => {
        console.log("✅ Message confirmed by server:", message._id);
        if (message.conversationId && !conversationId) {
            setConversationId(message.conversationId);
        }
    }, [conversationId]);

    // --- 2. SOCKET LIFECYCLE ---

    useEffect(() => {
        if (!userToken || !currentAgencyId) return;

        console.log("🔌 Initializing Socket for Agency:", currentAgencyId);
        const socket = socketService.connect(userToken, currentAgencyId);

        // Sync initial connection state
        if (socket.connected) {
            setIsConnected(true);
            setSocketReady(true);
        }

        // Use service methods to subscribe
        const unsubStatus = socketService.onConnectionChange((connected) => {
            setIsConnected(connected);
            setSocketReady(connected);
        });

        const unsubNewMsg = socketService.onNewMessage(handleReceiveMessage);
        const unsubSentMsg = socketService.onSentMessage(handleSentMessage);

        // Fetch history if we have an ID
        if (conversationId) {
            fetchChatHistory(conversationId);
        } else {
            setIsLoading(false);
        }

        return () => {
            unsubStatus();
            unsubNewMsg();
            unsubSentMsg();
        };
    }, [userToken, currentAgencyId, conversationId, handleReceiveMessage, handleSentMessage, fetchChatHistory]);

    // --- 3. SEND ACTION ---

    const onSend = useCallback(async (newMessages = []) => {
        if (!socketReady) {
            Alert.alert("Connecting", "Please wait until the connection is active.");
            return;
        }

        const message = newMessages[0];
        
        // Optimistically add to UI
        setMessages(prev => GiftedChat.append(prev, newMessages));

        const success = socketService.sendMessage(
            recipientId,
            message.text.trim(),
            recipientType || "Agency"
        );

        if (!success) {
            Alert.alert("Error", "Could not send message. Check your connection.");
        }
    }, [recipientId, socketReady, recipientType]);

    // --- 4. RENDER HELPERS ---

    const renderBubble = (props) => (
        <Bubble
            {...props}
            wrapperStyle={{
                right: { backgroundColor: COLORS.sentMsg },
                left: { backgroundColor: COLORS.receivedMsg }
            }}
            textStyle={{
                right: { color: COLORS.white },
                left: { color: COLORS.textPrimary }
            }}
        />
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <View style={styles.agencyInfo}>
                    <View style={styles.avatarContainer}>
                        {logo ? <Image source={{ uri: logo }} style={styles.headerAvatar} /> :
                            <View style={styles.placeholderAvatar}><Text style={styles.avatarText}>{name?.[0]}</Text></View>}
                        <View style={[styles.statusIndicator, { backgroundColor: isConnected ? COLORS.online : COLORS.error }]} />
                    </View>
                    <View style={styles.headerContent}>
                        <Text style={styles.headerName}>{name}</Text>
                        <Text style={styles.headerStatus}>{isConnected ? 'Active now' : 'Connecting...'}</Text>
                    </View>
                </View>
            </View>

            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                {isLoading ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ flex: 1 }} />
                ) : (
                    <GiftedChat
                        messages={messages}
                        onSend={onSend}
                        user={{ _id: currentUserId }}
                        renderBubble={renderBubble}
                        placeholder="Type a message..."
                        alwaysShowSend
                        scrollToBottom
                        renderAvatar={null}
                    />
                )}
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border,
        backgroundColor: COLORS.headerBg
    },
    backButton: { width: 40, height: 40, justifyContent: 'center' },
    agencyInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    avatarContainer: { position: 'relative', marginRight: 12 },
    headerAvatar: { width: 40, height: 40, borderRadius: 20 },
    placeholderAvatar: { 
        width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.accent, 
        justifyContent: 'center', alignItems: 'center' 
    },
    avatarText: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
    statusIndicator: { 
        position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, 
        borderRadius: 5, borderWidth: 2, borderColor: '#FFF' 
    },
    headerContent: { flex: 1 },
    headerName: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
    headerStatus: { fontSize: 12, color: COLORS.textSecondary },
});