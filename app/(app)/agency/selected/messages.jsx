import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, StatusBar, Image,
    FlatList, ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import socketService from '../../../services/SocketService';
import { useAuth } from '../../../context/AuthContext';

export default function MessagesScreen() {
    const router = useRouter();
    const { userToken, activeAgency } = useAuth();
    
    const [chats, setChats] = useState([]);
    const [isLoading, setIsLoading] = useState(false); // Use one loading state
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showSuggestion, setShowSuggestion] = useState(false);

    const conversationsMapRef = useRef(new Map());
    const mountedRef = useRef(true);
    const hasDataRef = useRef(false); // Track if we have data
    const lastRequestTimeRef = useRef(0);

    // --- Process conversation list ---
    const processConversationList = useCallback((data) => {
        console.log("📩 Processing conversation list:", data?.length);
        
        if (!data || !Array.isArray(data)) {
            console.log("No valid data received");
            setIsLoading(false);
            setIsRefreshing(false);
            return;
        }

        if (!activeAgency?.id) {
            console.log("No active agency selected");
            setChats([]);
            setIsLoading(false);
            setIsRefreshing(false);
            return;
        }

        // Find latest conversation
        let latestConversation = null;
        let latestTimestamp = new Date(0);

        for (const conv of data) {
            if (!conv?._id || !conv.participants) continue;
            
            const agencyParticipant = conv.participants.find(p => p.model === "Agency");
            if (!agencyParticipant || !agencyParticipant.user) continue;
            
            const participantId = agencyParticipant.user;
            const convTimestamp = conv.updatedAt ? new Date(conv.updatedAt) : 
                                conv.lastMessage?.createdAt ? new Date(conv.lastMessage.createdAt) : 
                                new Date();
            
            if (convTimestamp > latestTimestamp) {
                latestTimestamp = convTimestamp;
                latestConversation = {
                    id: participantId,
                    conversationId: conv._id,
                    name: activeAgency.name || 'Agency',
                    logo: activeAgency.logo || '',
                    type: 'Agency',
                    lastMessage: conv.lastMessage?.content || 'New conversation',
                    timestamp: convTimestamp,
                    unreadCount: conv.unreadCount || 0,
                };
                conversationsMapRef.current.set(participantId, conv._id);
            }
        }

        const processedChats = latestConversation ? [latestConversation] : [];
        
        console.log(`✅ Displaying ${processedChats.length} conversation`);
        
        setChats(processedChats);
        setIsLoading(false);
        setIsRefreshing(false);
        hasDataRef.current = processedChats.length > 0;
    }, [activeAgency]);

    // --- Setup socket listeners ONCE ---
    useEffect(() => {
        if (!userToken) return;

        mountedRef.current = true;
        
        console.log("🔌 Setting up socket connection");
        
        // Connect socket
        socketService.connect(userToken);
        
        // Setup conversation list listener
        socketService.onConversationList((data) => {
            if (mountedRef.current) {
                console.log("📬 Received conversation data");
                processConversationList(data);
            }
        });

        // Setup new message listener
        socketService.onNewMessage(() => {
            console.log("📨 New message - refreshing");
            if (socketService.socket?.connected) {
                // Delay slightly to avoid race conditions
                setTimeout(() => {
                    socketService.getConversations();
                }, 300);
            }
        });

        return () => {
            mountedRef.current = false;
            // DO NOT remove listeners - keep socket alive
        };
    }, [userToken, processConversationList]);

    // --- Handle screen focus ---
    useFocusEffect(
        useCallback(() => {
            console.log("💡 Messages screen focused");
            
            mountedRef.current = true;
            
            // Prevent multiple rapid requests
            const now = Date.now();
            if (now - lastRequestTimeRef.current < 1000) {
                console.log("⚠️ Skipping request - too recent");
                return;
            }
            
            lastRequestTimeRef.current = now;
            
            if (socketService.socket?.connected) {
                console.log("🔄 Requesting conversations");
                setIsLoading(true);
                
                // Request with timeout
                socketService.getConversations();
                
                // Safety timeout
                setTimeout(() => {
                    if (mountedRef.current && isLoading) {
                        console.log("⚠️ Response timeout");
                        setIsLoading(false);
                    }
                }, 5000);
            } else {
                console.log("❌ Socket not connected");
                setIsLoading(false);
                
                // Try to reconnect
                if (userToken) {
                    console.log("🔄 Attempting to reconnect");
                    socketService.connect(userToken);
                    
                    setTimeout(() => {
                        if (socketService.socket?.connected && mountedRef.current) {
                            setIsLoading(true);
                            socketService.getConversations();
                        }
                    }, 1000);
                }
            }
            
            return () => {
                console.log("💡 Messages screen unfocused");
                mountedRef.current = false;
            };
        }, [userToken, isLoading])
    );

    // --- Manual refresh ---
    const handleRefresh = useCallback(() => {
        console.log("🔄 Manual refresh");
        setIsRefreshing(true);
        
        if (socketService.socket?.connected) {
            socketService.getConversations();
        } else {
            setIsRefreshing(false);
            if (userToken) {
                socketService.connect(userToken);
                setTimeout(() => {
                    if (socketService.socket?.connected) {
                        setIsRefreshing(true);
                        socketService.getConversations();
                    }
                }, 1000);
            }
        }
    }, [userToken]);

    // --- Navigate to chat ---
    const handleGoToChat = (recipient) => {
        const conversationId = conversationsMapRef.current.get(recipient.id) || recipient.conversationId;
        
        router.push({
            pathname: "/agency/selected/chat",
            params: {
                recipientId: recipient.id,
                name: recipient.name,
                logo: recipient.logo || "",
                recipientType: 'Agency',
                initialConversationId: conversationId || ""
            }
        });
        setShowSuggestion(false);
    };

    // --- Render ---
    const renderChatItem = ({ item }) => (
        <TouchableOpacity 
            style={styles.chatItem} 
            onPress={() => handleGoToChat(item)}
            activeOpacity={0.7}
        >
            <View style={styles.avatarContainer}>
                {item.logo ? (
                    <Image source={{ uri: item.logo }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarFallback}>
                        <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || 'A'}</Text>
                    </View>
                )}
            </View>
            <View style={styles.chatContent}>
                <View style={styles.chatHeader}>
                    <Text style={styles.chatName} numberOfLines={1}>
                        {item.name}
                    </Text>
                    <Text style={styles.chatTime}>
                        {item.timestamp.toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit',
                        })}
                    </Text>
                </View>
                <Text style={styles.lastMessage} numberOfLines={2}>
                    {item.lastMessage}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Messages</Text>
                <TouchableOpacity onPress={() => setShowSuggestion(true)}>
                    <Feather name="edit" size={22} color="#000" />
                </TouchableOpacity>
            </View>

            {isLoading && !hasDataRef.current ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#769FCD" />
                    <Text style={styles.loadingText}>Loading conversations...</Text>
                    <Text style={styles.hintText}>Make sure you're connected to the internet</Text>
                </View>
            ) : (
                <FlatList
                    data={chats}
                    renderItem={renderChatItem}
                    keyExtractor={item => item.conversationId}
                    contentContainerStyle={chats.length === 0 ? styles.centerContainer : styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            colors={['#769FCD']}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.centerContainer}>
                            <View style={styles.emptyIcon}>
                                <Feather name="message-circle" size={60} color="#CCC" />
                            </View>
                            <Text style={styles.emptyText}>No conversations yet</Text>
                            <Text style={styles.emptySubtext}>
                                Start a chat with your agency
                            </Text>
                            <TouchableOpacity 
                                style={styles.startChatButton}
                                onPress={() => setShowSuggestion(true)}
                            >
                                <Text style={styles.startChatButtonText}>Start Chat</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            <TouchableOpacity 
                style={styles.floatingButton}
                onPress={() => setShowSuggestion(true)}
            >
                <Feather name="plus" size={24} color="#FFF" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    centerContainer: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    loadingText: { 
        marginTop: 16, 
        fontSize: 16, 
        color: '#666' 
    },
    hintText: {
        marginTop: 8,
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
    },
    listContent: { 
        paddingBottom: 20 
    },
    chatItem: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    avatarContainer: { 
        marginRight: 12 
    },
    avatar: { 
        width: 50, 
        height: 50, 
        borderRadius: 25 
    },
    avatarFallback: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#D8E5FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: { 
        fontSize: 20, 
        color: '#769FCD', 
        fontWeight: '700' 
    },
    chatContent: { 
        flex: 1, 
        justifyContent: 'center' 
    },
    chatHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        marginBottom: 4 
    },
    chatName: { 
        fontSize: 16, 
        fontWeight: '600', 
        color: '#000',
        flex: 1 
    },
    chatTime: { 
        fontSize: 12, 
        color: '#666' 
    },
    lastMessage: { 
        fontSize: 14, 
        color: '#666' 
    },
    emptyIcon: {
        marginBottom: 20,
    },
    emptyText: { 
        fontSize: 18, 
        color: '#666', 
        marginBottom: 8,
        fontWeight: '600'
    },
    emptySubtext: { 
        fontSize: 14, 
        color: '#999',
        textAlign: 'center',
        marginBottom: 24,
    },
    startChatButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#769FCD',
        borderRadius: 8,
    },
    startChatButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    floatingButton: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 56,

        
        height: 56,
        borderRadius: 28,
        backgroundColor: '#769FCD',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
    },
});