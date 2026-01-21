import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, StyleSheet, Text, TouchableOpacity, StatusBar, Image,
    Platform, KeyboardAvoidingView, ActivityIndicator
} from 'react-native';
import { GiftedChat, Bubble } from 'react-native-gifted-chat';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import socketService from '../../../services/SocketService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BASE_URL = 'https://edu-agent-backend-nine.vercel.app/api/v1/students';

export default function ChatScreen() {
    const { recipientId, name, logo, initialConversationId } = useLocalSearchParams();
    const router = useRouter();
    const { userToken, user } = useAuth();
    const insets = useSafeAreaInsets();

    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [conversationId, setConversationId] = useState(initialConversationId || null);
    const [hasLoadedHistory, setHasLoadedHistory] = useState(false);

    // FIXED: Get actual user ID for message alignment
    // You need to know your own user ID to determine message alignment
    const currentUserId = String(user?.id || user?.userId || 'student'); // Adjust based on your auth context

    const mountedRef = useRef(true);

    // --- FIXED: Fetch chat history ---
    const fetchChatHistory = useCallback(async (id) => {
        if (!id) {
            console.log("No conversation ID - new conversation");
            setIsLoading(false);
            return;
        }

        try {
            console.log("Fetching history for:", id);
            const response = await fetch(`${BASE_URL}/conversation/${id}/messages`, {
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) throw new Error(`Status: ${response.status}`);

            const data = await response.json();
            const rawMessages = data.messages || data.data || [];

            // FIXED: Format messages with correct alignment
            const formattedMessages = rawMessages.map(msg => {
                // Determine if message is from current user
                // This is CRITICAL for message alignment
                const isFromCurrentUser = msg.senderModel === 'Student' || 
                                         msg.sender === currentUserId ||
                                         (msg.sender && typeof msg.sender === 'object' && msg.sender.modelType === 'Student');
                
                return {
                    _id: msg._id || Math.random().toString(36).substr(2, 9),
                    text: msg.content || '',
                    createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
                    user: {
                        _id: isFromCurrentUser ? currentUserId : recipientId,
                        name: isFromCurrentUser ? 'You' : name,
                        avatar: isFromCurrentUser ? null : logo,
                    },
                };
            });

            // GiftedChat expects newest first
            setMessages(formattedMessages.reverse());
            setHasLoadedHistory(true);
        } catch (error) {
            console.error('History fetch error:', error);
        } finally {
            if (mountedRef.current) {
                setIsLoading(false);
            }
        }
    }, [userToken, recipientId, name, logo, currentUserId]);

    // --- Socket setup ---
    useEffect(() => {
        mountedRef.current = true;
        
        // Connect socket
        const socket = socketService.connect(userToken);

        if (socket) {
            // Connection status
            setIsConnected(socket.connected);
            
            const onConnect = () => {
                console.log("Chat socket connected");
                setIsConnected(true);
            };
            
            const onDisconnect = () => {
                console.log("Chat socket disconnected");
                setIsConnected(false);
            };

            // FIXED: Listen for sent message confirmation
            socketService.onSentMessage((data) => {
                console.log("✅ Message sent confirmation:", data);
                if (data.message?.conversationId && !conversationId) {
                    console.log("Setting conversation ID:", data.message.conversationId);
                    setConversationId(data.message.conversationId);
                    
                    // Update conversation list in background
                    setTimeout(() => {
                        socketService.getConversations();
                    }, 1000);
                }
            });

            // FIXED: Listen for incoming messages
            socketService.onNewMessage((data) => {
                console.log("📨 New message received:", data);
                if (mountedRef.current && data) {
                    // Check if this message belongs to current conversation
                    const isForThisChat = data.conversationId === conversationId || 
                                         data.receiver === currentUserId ||
                                         data.sender === recipientId;
                    
                    if (!isForThisChat) {
                        console.log("Message not for this chat, skipping");
                        return;
                    }
                    
                    // FIXED: Determine if message is from current user
                    const isFromCurrentUser = data.senderModel === 'Student' || 
                                             data.sender === currentUserId;
                    
                    setMessages(prev => {
                        // Check for duplicates
                        if (prev.some(m => m._id === data._id)) return prev;
                        
                        const newMessage = {
                            _id: data._id || Math.random().toString(36).substr(2, 9),
                            text: data.content || '',
                            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
                            user: {
                                _id: isFromCurrentUser ? currentUserId : recipientId,
                                name: isFromCurrentUser ? 'You' : name,
                                avatar: isFromCurrentUser ? null : logo,
                            },
                        };
                        
                        return GiftedChat.append(prev, [newMessage]);
                    });
                }
            });

            socket.on('connect', onConnect);
            socket.on('disconnect', onDisconnect);
        }

        // Fetch history if we have conversation ID
        if (conversationId && !hasLoadedHistory) {
            fetchChatHistory(conversationId);
        } else {
            // If no conversation ID, we're starting fresh
            setIsLoading(false);
        }

        return () => {
            mountedRef.current = false;
            // Clean up listeners
            if (socket) {
                socket.off('connect');
                socket.off('disconnect');
            }
        };
    }, [conversationId, currentUserId]);

    // Refresh conversation list when leaving chat
    useFocusEffect(
        useCallback(() => {
            return () => {
                console.log("Leaving chat - refreshing conversation list");
                setTimeout(() => {
                    socketService.getConversations();
                }, 500);
            };
        }, [])
    );

    // --- FIXED: Send message ---
    const onSend = useCallback((newMessages = []) => {
        if (!newMessages.length || !recipientId) return;
        
        const message = newMessages[0];
        
        // Add optimistic message - FIXED: Show on RIGHT side
        const optimisticMessage = {
            ...message,
            _id: `temp_${Date.now()}`,
            pending: true,
            user: {
                _id: currentUserId, // This is KEY for right alignment
                name: 'You',
            },
        };
        
        setMessages(prev => GiftedChat.append(prev, [optimisticMessage]));
        
        // Send via socket
        const success = socketService.sendMessage(
            recipientId,
            message.text.trim(),
            "Agency"
        );
        
        if (!success) {
            console.error("Failed to send message");
            // Optionally show error to user
        }
    }, [recipientId, currentUserId]);

    // --- Render components ---
    const renderBubble = (props) => (
        <Bubble
            {...props}
            wrapperStyle={{
                left: {
                    backgroundColor: '#E4E6EB',
                    borderRadius: 18,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    marginBottom: 4,
                },
                right: {
                    backgroundColor: '#0084FF',
                    borderRadius: 18,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    marginBottom: 4,
                }
            }}
            textStyle={{
                left: { 
                    color: '#000', 
                    fontSize: 15,
                    lineHeight: 20 
                },
                right: { 
                    color: '#FFF', 
                    fontSize: 15,
                    lineHeight: 20 
                }
            }}
        />
    );

    // In Chat.jsx, add a debug button
const sendTestMessage = () => {
    console.log("Sending test message...");
    console.log("Recipient ID:", recipientId);
    console.log("Current User ID:", currentUserId);
    console.log("User Token:", userToken);
    
    const success = socketService.sendMessage(
        recipientId,
        "Test message",
        "Agency"
    );
    
    console.log("Send success:", success);
};

// Add to your render:
<TouchableOpacity onPress={sendTestMessage} style={styles.debugButton}>
    <Text>Debug Send</Text>
</TouchableOpacity>

    const renderEmptyChat = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
                <Ionicons name="chatbubble-outline" size={60} color="#0084FF" />
            </View>
            <Text style={styles.emptyTitle}>Start Conversation</Text>
            <Text style={styles.emptySubtitle}>
                Send your first message to {name || 'the agency'}
            </Text>
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    style={styles.backButton}
                >
                    <Ionicons name="chevron-back" size={24} color="#000" />
                </TouchableOpacity>
                
                <View style={styles.userInfo}>
                    <View style={styles.avatarContainer}>
                        {logo ? (
                            <Image source={{ uri: logo }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarFallback}>
                                <Text style={styles.avatarText}>
                                    {name?.[0]?.toUpperCase() || 'A'}
                                </Text>
                            </View>
                        )}
                        <View style={[
                            styles.statusDot, 
                            { backgroundColor: isConnected ? '#10B981' : '#FF3B30' }
                        ]} />
                    </View>
                    
                    <View style={styles.userDetails}>
                        <Text style={styles.userName} numberOfLines={1}>
                            {name || 'Agency'}
                        </Text>
                        <Text style={styles.userStatus}>
                            {isConnected ? 'Online' : 'Connecting...'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Chat */}
            <KeyboardAvoidingView
                style={styles.chatContainer}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#0084FF" />
                    </View>
                ) : (
                    <GiftedChat
                        messages={messages}
                        onSend={onSend}
                        user={{
                            _id: currentUserId, // CRITICAL: This must be YOUR user ID
                            name: 'You'
                        }}
                        renderBubble={renderBubble}
                        renderEmpty={renderEmptyChat}
                        placeholder="Type a message..."
                        alwaysShowSend
                        scrollToBottom
                        renderAvatar={null}
                        renderUsernameOnMessage={false}
                        minInputToolbarHeight={60}
                        textInputProps={{
                            style: {
                                backgroundColor: '#F0F2F5',
                                borderRadius: 20,
                                paddingHorizontal: 16,
                                paddingVertical: 10,
                                fontSize: 16,
                                marginRight: 10,
                                flex: 1,
                            }
                        }}
                        renderSend={(props) => (
                            <TouchableOpacity
                                style={styles.sendButton}
                                onPress={() => {
                                    if (props.text && props.onSend) {
                                        props.onSend({ text: props.text.trim() }, true);
                                    }
                                }}
                            >
                                <Ionicons 
                                    name="send" 
                                    size={24} 
                                    color={props.text?.trim() ? "#0084FF" : "#C4C4C4"} 
                                />
                            </TouchableOpacity>
                        )}
                    />
                )}
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#FFF' 
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
        backgroundColor: '#FFF',
    },
    backButton: {
        marginRight: 12,
        padding: 4,
    },
    userInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarFallback: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#D8E5FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#769FCD',
    },
    statusDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    userDetails: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    userStatus: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    chatContainer: { 
        flex: 1 
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        transform: [{ scaleY: -1 }],
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#E8F4FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    sendButton: {
        height: 44,
        width: 44,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
});