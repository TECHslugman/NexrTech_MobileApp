import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, StatusBar, Image, Animated, Alert,
    FlatList, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import socketService from '../../../services/SocketService';
import { useAuth } from '../../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
    bg: '#FFFFFF',
    primary: '#769FCD',
    white: '#FFFFFF',
    textPrimary: '#1D1D1D',
    textSecondary: '#8E8E93',
    border: '#E5E5EA',
    accent: '#D8E5FF',
    active: '#769FCD',
    inactive: '#8E8E93',
};

// Agency-specific storage keys
const getStorageKey = (agencyId) => `chat_conversations_${agencyId}`;
const getMetadataKey = (agencyId) => `chat_metadata_${agencyId}`;
const AGENCY_STAFF_KEY = 'agency_staff';

export default function MessagesScreen() {
    const router = useRouter();
    const { userToken, activeAgency, user } = useAuth();

    const agencyId = activeAgency?.id;
    const agencyName = activeAgency?.name;
    const agencyLogo = activeAgency?.logo;

    const [chats, setChats] = useState([]);
    const [showSuggestion, setShowSuggestion] = useState(false);
    const [fadeAnim] = useState(new Animated.Value(0));
    const [isLoadingChats, setIsLoadingChats] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    
    const conversationsRef = useRef({});
    const chatMetadataRef = useRef({});
    const agencyStaffRef = useRef([]);

    // Force refresh function
    const forceRefresh = () => {
        console.log("🔄 Force refreshing chats");
        setRefreshKey(prev => prev + 1);
    };

    // Clear all data for current agency
    const clearCurrentAgencyData = async () => {
        conversationsRef.current = {};
        chatMetadataRef.current = {};
        agencyStaffRef.current = [];
        setChats([]);
    };

    // Listen for navigation to messages screen
    useEffect(() => {
        // Refresh when component mounts or when agency changes
        const timer = setTimeout(() => {
            forceRefresh();
        }, 300);
        
        return () => clearTimeout(timer);
    }, [agencyId]);

    // Clear data when agency changes
    useEffect(() => {
        console.log("🔄 Agency changed to:", agencyId);
        clearCurrentAgencyData();
    }, [agencyId]);

    // Load saved conversations from AsyncStorage
    const loadSavedConversations = async () => {
        try {
            if (!agencyId) {
                console.log("⏳ Waiting for agencyId...");
                return;
            }

            const storageKey = getStorageKey(agencyId);
            const metadataKey = getMetadataKey(agencyId);
            
            const saved = await AsyncStorage.getItem(storageKey);
            if (saved) {
                const conversations = JSON.parse(saved);
                conversationsRef.current = conversations;
                console.log('📂 Loaded conversations for agency', agencyId, ':', Object.keys(conversations).length);
            } else {
                conversationsRef.current = {};
                console.log('📂 No saved conversations for agency', agencyId);
            }
            
            const metadataSaved = await AsyncStorage.getItem(metadataKey);
            if (metadataSaved) {
                const metadata = JSON.parse(metadataSaved);
                chatMetadataRef.current = metadata;
                console.log('📊 Loaded chat metadata for agency', agencyId, ':', Object.keys(metadata).length);
            } else {
                chatMetadataRef.current = {};
                console.log('📊 No saved metadata for agency', agencyId);
            }
            
            await refreshChats();
            
        } catch (error) {
            console.error('❌ Error loading conversations:', error);
        }
    };

    // Load agency staff
    const loadAgencyStaff = async () => {
        try {
            const saved = await AsyncStorage.getItem(AGENCY_STAFF_KEY);
            if (saved) {
                const staffData = JSON.parse(saved);
                const currentAgencyStaff = staffData.filter(staff => staff.agencyId === agencyId);
                agencyStaffRef.current = currentAgencyStaff;
                console.log('👥 Loaded agency staff for', agencyId, ':', currentAgencyStaff.length);
            } else {
                await fetchAgencyStaff();
            }
        } catch (error) {
            console.error('❌ Error loading agency staff:', error);
        }
    };

    // Fetch agency staff from API
    const fetchAgencyStaff = async () => {
        try {
            const allStaff = [
                { id: 'mentor_001', name: 'Dr. Smith (Mentor)', type: 'Mentor', logo: 'https://i.pravatar.cc/150?u=mentor1', agencyId: '6965f08b28d4d0d367698827' },
                { id: 'agent_002', name: 'Sarah Agent', type: 'Agent', logo: 'https://i.pravatar.cc/150?u=agent1', agencyId: '6965f08b28d4d0d367698827' },
                { id: 'mentor_003', name: 'Coach Johnson', type: 'Mentor', logo: 'https://i.pravatar.cc/150?u=mentor2', agencyId: '6965f08b28d4d0d367698827' },
            ];
            
            const currentAgencyStaff = allStaff.filter(staff => staff.agencyId === agencyId);
            agencyStaffRef.current = currentAgencyStaff;
            
            await AsyncStorage.setItem(AGENCY_STAFF_KEY, JSON.stringify(allStaff));
            console.log('👥 Fetched agency staff for', agencyId, ':', currentAgencyStaff.length);
            
        } catch (error) {
            console.error('❌ Error fetching agency staff:', error);
        }
    };

    // Fix missing conversation storage
    const fixMissingConversation = async () => {
        if (!agencyId) return;
        
        const storageKey = getStorageKey(agencyId);
        const metadataKey = getMetadataKey(agencyId);
        
        const metadata = await AsyncStorage.getItem(metadataKey);
        
        if (metadata) {
            const metadataObj = JSON.parse(metadata);
            const conversationsObj = {};
            
            Object.keys(metadataObj).forEach(key => {
                conversationsObj[key] = 'TEMPORARY_CONVERSATION_ID';
            });
            
            await AsyncStorage.setItem(storageKey, JSON.stringify(conversationsObj));
            console.log("🛠️ Fixed missing conversations:", conversationsObj);
            
            conversationsRef.current = conversationsObj;
            await refreshChats();
        }
    };

    // MAIN SOCKET AND DATA LOADING EFFECT
    useEffect(() => {
        console.log("🚀 Initializing MessagesScreen for agency:", agencyId);
        
        if (!agencyId) {
            console.log("⏳ Waiting for agencyId...");
            return;
        }

        // Load data
        loadSavedConversations();
        loadAgencyStaff();
        
        if (!userToken) {
            console.log("🔑 No user token available");
            return;
        }

        // Connect socket with agency context
        socketService.connect(userToken, agencyId);

        // Handle incoming messages
        const handleIncoming = (message) => {
            console.log("📩 New message received:", message);
            
            // Check if message belongs to current agency
            const isFromCurrentAgency = checkIfFromCurrentAgency(message.sender, message);
            
            if (!isFromCurrentAgency) {
                console.log("📭 Message not for current agency, ignoring");
                return;
            }
            
            if (message.conversationId && message.sender) {
                const senderId = message.sender;
                conversationsRef.current[senderId] = message.conversationId;
                
                const metadata = {
                    id: senderId,
                    name: message.senderName || getRecipientName(senderId),
                    logo: message.senderAvatar || getRecipientLogo(senderId),
                    type: message.senderModel === 'Agency' ? 'Agency' : 
                          message.senderModel === 'Mentor' ? 'Mentor' : 
                          message.senderModel === 'Agent' ? 'Agent' : 'Support',
                    lastMessage: message.content,
                    timestamp: new Date(message.createdAt),
                    unreadCount: 1,
                    agencyId: agencyId
                };
                
                saveChatMetadata(senderId, metadata);
                saveConversationToStorage(senderId, message.conversationId);
                refreshChats();
            }
        };

        // Handle sent messages
// In MessagesScreen.jsx, update handleSentMessage:
const handleSentMessage = async (message) => { // Changed from data to message
    console.log('✅ Message sent received in MessagesScreen:', message);
    
    if (message?.conversationId && message?.receiver) {
        const recipientId = message.receiver;
        const conversationId = message.conversationId;
        
        console.log('💾 Processing sent message for:', {
            recipientId,
            conversationId,
            currentAgencyId: agencyId
        });
        
        // Check if recipient belongs to current agency
        const isRecipientFromCurrentAgency = checkIfFromCurrentAgency(recipientId, message);
        
        if (!isRecipientFromCurrentAgency) {
            console.log('📭 Message not for current agency, ignoring');
            return;
        }
        
        console.log('✅ Saving conversation for current agency');
        
        // Update refs immediately
        conversationsRef.current[recipientId] = conversationId;
        
        const metadata = {
            id: recipientId,
            name: message.receiverName || getRecipientName(recipientId),
            logo: message.receiverAvatar || getRecipientLogo(recipientId),
            type: message.receiverModel || getRecipientType(recipientId),
            lastMessage: message.content,
            timestamp: new Date(message.createdAt),
            unreadCount: 0,
            agencyId: agencyId
        };
        
        // Save both to storage
        await saveChatMetadata(recipientId, metadata);
        await saveConversationToStorage(recipientId, conversationId);
        
        // Force UI update immediately
        await refreshChats();
    }
};

        // Setup socket listeners
        socketService.onNewMessage(handleIncoming);
        socketService.onSentMessage(handleSentMessage);

        // Setup conversation list listener
        const handleConversationList = (conversations) => {
            console.log('📋 Received conversation list:', conversations?.length);
            refreshChats();
        };
        
        socketService.onConversationList(handleConversationList);

        // Cleanup function
        return () => {
            console.log("🧹 Cleaning up MessagesScreen listeners");
            socketService.removeListener('receive_message');
            socketService.removeListener('sent_message');
            socketService.removeListener('conversation_list');
        };
    }, [userToken, agencyId, refreshKey]);

    // Check if a sender/recipient belongs to current agency
    const checkIfFromCurrentAgency = (id, message = {}) => {
        if (!agencyId) return false;
        
        // Direct match with current agency
        if (id === agencyId) return true;
        
        // Check metadata
        const metadata = chatMetadataRef.current[id];
        if (metadata?.agencyId === agencyId) return true;
        
        // Check agency staff
        const isAgencyStaff = agencyStaffRef.current.some(staff => 
            staff.id === id && staff.agencyId === agencyId
        );
        if (isAgencyStaff) return true;
        
        return false;
    };

    // Get all available contacts for current agency
    const getAgencyContacts = () => {
        const contacts = [];
        
        // Check if we already have an active chat with the agency
        const hasActiveAgencyChat = Object.keys(conversationsRef.current).some(key => 
            key === agencyId || 
            (chatMetadataRef.current[key]?.agencyId === agencyId && chatMetadataRef.current[key]?.type === 'Agency')
        );
        
        // Only show agency in suggestions if we don't have an active chat
        if (!hasActiveAgencyChat) {
            contacts.push({
                id: agencyId,
                name: agencyName || 'Agency',
                logo: agencyLogo || '',
                type: 'Agency',
                agencyId: agencyId
            });
        } else {
            console.log("🎯 Agency already has active chat, hiding from suggestions");
        }
        
        // Filter out staff members who already have active chats
        const availableStaff = agencyStaffRef.current.filter(staff => 
            !conversationsRef.current[staff.id]
        );
        
        contacts.push(...availableStaff);
        
        console.log("👥 Available contacts for agency", agencyId, ":", contacts.length);
        return contacts;
    };

    // Save conversation to AsyncStorage
    const saveConversationToStorage = async (recipientId, conversationId) => {
        try {
            if (!agencyId) {
                console.error("❌ No agencyId for saving conversation");
                return;
            }
            
            const storageKey = getStorageKey(agencyId);
            
            const saved = await AsyncStorage.getItem(storageKey);
            const conversations = saved ? JSON.parse(saved) : {};
            
            conversations[recipientId] = conversationId;
            
            await AsyncStorage.setItem(storageKey, JSON.stringify(conversations));
            conversationsRef.current = conversations;
            
            console.log('✅ SAVED conversation for agency:', agencyId, {
                recipientId,
                conversationId,
                allConversations: Object.keys(conversations)
            });
        } catch (error) {
            console.error('❌ Error saving conversation:', error);
        }
    };

    // Save chat metadata
    const saveChatMetadata = async (recipientId, metadata) => {
        try {
            if (!agencyId) {
                console.error("❌ No agencyId for saving metadata");
                return;
            }
            
            const metadataKey = getMetadataKey(agencyId);
            const saved = await AsyncStorage.getItem(metadataKey);
            const allMetadata = saved ? JSON.parse(saved) : {};
            
            allMetadata[recipientId] = {
                ...allMetadata[recipientId],
                ...metadata,
                timestamp: metadata.timestamp || new Date(),
                lastMessage: metadata.lastMessage || allMetadata[recipientId]?.lastMessage || '',
                agencyId: agencyId
            };
            
            await AsyncStorage.setItem(metadataKey, JSON.stringify(allMetadata));
            chatMetadataRef.current = allMetadata;
            console.log('💾 Saved chat metadata for agency:', agencyId);
        } catch (error) {
            console.error('❌ Error saving chat metadata:', error);
        }
    };

    // Get recipient name based on ID
    const getRecipientName = (recipientId) => {
        if (chatMetadataRef.current[recipientId]?.name) {
            return chatMetadataRef.current[recipientId].name;
        }
        
        if (recipientId === agencyId) return agencyName || 'Agency Support';
        
        const staff = agencyStaffRef.current.find(staff => staff.id === recipientId);
        if (staff) return staff.name;
        
        return 'Support';
    };

    // Get recipient logo
    const getRecipientLogo = (recipientId) => {
        if (chatMetadataRef.current[recipientId]?.logo) {
            return chatMetadataRef.current[recipientId].logo;
        }
        
        if (recipientId === agencyId) return agencyLogo;
        
        const staff = agencyStaffRef.current.find(staff => staff.id === recipientId);
        if (staff) return staff.logo;
        
        return '';
    };

    // Get recipient type
    const getRecipientType = (recipientId) => {
        if (chatMetadataRef.current[recipientId]?.type) {
            return chatMetadataRef.current[recipientId].type;
        }
        
        if (recipientId === agencyId) return 'Agency';
        
        const staff = agencyStaffRef.current.find(staff => staff.id === recipientId);
        if (staff) return staff.type;
        
        return 'Support';
    };

    // Get last message
    const getLastMessage = (recipientId) => {
        const lastMsg = chatMetadataRef.current[recipientId]?.lastMessage;
        return lastMsg && lastMsg.trim() !== '' ? lastMsg : 'Start a conversation...';
    };

    // Get timestamp
    const getTimestamp = (recipientId) => {
        const timestamp = chatMetadataRef.current[recipientId]?.timestamp;
        return timestamp ? new Date(timestamp) : new Date();
    };

    // Get unread count
    const getUnreadCount = (recipientId) => {
        return chatMetadataRef.current[recipientId]?.unreadCount || 0;
    };

    // Refresh chat list
    const refreshChats = async () => {
        try {
            setIsLoadingChats(true);
            
            if (!agencyId) {
                console.log("⏳ No agencyId, skipping refresh");
                setIsLoadingChats(false);
                return;
            }
            
            const storageKey = getStorageKey(agencyId);
            const metadataKey = getMetadataKey(agencyId);
            
            const saved = await AsyncStorage.getItem(storageKey);
            const metadataSaved = await AsyncStorage.getItem(metadataKey);
            
            if (saved) {
                const conversations = JSON.parse(saved);
                conversationsRef.current = conversations;
            } else {
                conversationsRef.current = {};
            }
            
            if (metadataSaved) {
                const metadata = JSON.parse(metadataSaved);
                chatMetadataRef.current = metadata;
            } else {
                chatMetadataRef.current = {};
            }
            
            // Create chat list from BOTH conversations and metadata
            let chatList = [];
            
            // First, add all conversations from storage
            Object.entries(conversationsRef.current).forEach(([recipientId, conversationId]) => {
                const metadata = chatMetadataRef.current[recipientId] || {};
                
                // Check if this chat belongs to current agency
                if (metadata.agencyId === agencyId || recipientId === agencyId) {
                    chatList.push({
                        id: recipientId,
                        conversationId: conversationId,
                        name: getRecipientName(recipientId),
                        logo: getRecipientLogo(recipientId),
                        type: getRecipientType(recipientId),
                        lastMessage: getLastMessage(recipientId),
                        timestamp: getTimestamp(recipientId),
                        unreadCount: getUnreadCount(recipientId),
                        agencyId: agencyId
                    });
                }
            });
            
            // Also check metadata for any chats that might not be in conversations storage
            Object.entries(chatMetadataRef.current).forEach(([recipientId, metadata]) => {
                if (metadata.agencyId === agencyId && !chatList.find(chat => chat.id === recipientId)) {
                    chatList.push({
                        id: recipientId,
                        conversationId: conversationsRef.current[recipientId] || null,
                        name: metadata.name || getRecipientName(recipientId),
                        logo: metadata.logo || getRecipientLogo(recipientId),
                        type: metadata.type || getRecipientType(recipientId),
                        lastMessage: metadata.lastMessage || getLastMessage(recipientId),
                        timestamp: metadata.timestamp ? new Date(metadata.timestamp) : getTimestamp(recipientId),
                        unreadCount: metadata.unreadCount || getUnreadCount(recipientId),
                        agencyId: agencyId
                    });
                }
            });
            
            // Sort by timestamp
            chatList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            setChats(chatList);
            console.log('✅ Refreshed chats for agency', agencyId, ':', chatList.length);
            
            setIsLoadingChats(false);
        } catch (error) {
            console.error('❌ Error refreshing chats:', error);
            setIsLoadingChats(false);
        }
    };

    // When starting a new chat
    const startNewChat = (recipient) => {
        if (!recipient.id) {
            Alert.alert("Error", "Recipient ID is missing.");
            return;
        }

        console.log("🚀 Starting new chat with:", recipient);
        
        const metadata = {
            id: recipient.id,
            name: recipient.name,
            logo: recipient.logo || '',
            type: recipient.type,
            lastMessage: '',
            timestamp: new Date(),
            unreadCount: 0,
            agencyId: agencyId
        };
        
        saveChatMetadata(recipient.id, metadata);
        
        handleGoToChat(recipient);
    };

    // Animation for suggestion sheet
    useEffect(() => {
        if (showSuggestion) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            fadeAnim.setValue(0);
        }
    }, [showSuggestion]);

    // Navigate to chat screen
    const handleGoToChat = (recipient) => {
        if (!recipient.id) {
            Alert.alert("Error", "Recipient ID is missing.");
            return;
        }

        const conversationId = conversationsRef.current[recipient.id];
        
        console.log("📍 Navigating to chat with:", {
            recipientId: recipient.id,
            conversationId: conversationId,
            name: recipient.name,
            agencyId: agencyId
        });

        router.push({
            pathname: "/agency/selected/chat",
            params: {
                recipientId: recipient.id,
                name: recipient.name,
                logo: recipient.logo || "",
                recipientType: recipient.type,
                initialConversationId: conversationId || undefined,
                agencyId: agencyId
            }
        });
    };

    const handleCloseSuggestion = () => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => setShowSuggestion(false));
    };

    // Render chat item
    const renderChatItem = ({ item }) => (
        <TouchableOpacity
            style={styles.chatItem}
            onPress={() => handleGoToChat(item)}
            activeOpacity={0.7}
        >
            <View style={styles.chatAvatar}>
                {item.logo ? (
                    <Image source={{ uri: item.logo }} style={styles.chatLogo} />
                ) : (
                    <View style={styles.chatFallback}>
                        <Text style={styles.chatFallbackText}>
                            {item.name.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}
            </View>
            
            <View style={styles.chatContent}>
                <View style={styles.chatHeader}>
                    <Text style={styles.chatName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.chatTime}>
                        {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
                
                <View style={styles.chatPreview}>
                    <Text style={styles.chatMessage} numberOfLines={1}>
                        {item.lastMessage}
                    </Text>
                    
                    {item.unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>{item.unreadCount}</Text>
                        </View>
                    )}
                </View>
                
                <View style={styles.chatTypeContainer}>
                    <Text style={styles.chatType}>{item.type}</Text>
                    {item.conversationId && (
                        <View style={styles.conversationIndicator}>
                            <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} />
                            <Text style={styles.conversationText}>Active chat</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                </View>
                <Text style={styles.headerTitle}>Messages</Text>
                <View style={styles.headerIcons}>
                    <TouchableOpacity 
                        style={styles.headerIcon}
                        onPress={async () => {
                            console.log("🔍 DEBUG STORAGE:");
                            
                            if (!agencyId) {
                                console.log("No agencyId!");
                                return;
                            }
                            
                            const storageKey = getStorageKey(agencyId);
                            const metadataKey = getMetadataKey(agencyId);
                            
                            console.log("Keys:", { storageKey, metadataKey });
                            
                            const conversations = await AsyncStorage.getItem(storageKey);
                            const metadata = await AsyncStorage.getItem(metadataKey);
                            
                            console.log("Conversations:", conversations ? JSON.parse(conversations) : 'EMPTY');
                            console.log("Metadata:", metadata ? JSON.parse(metadata) : 'EMPTY');
                            
                            // If metadata exists but conversations don't, fix it
                            if (metadata && !conversations) {
                                console.log("🚨 Found metadata but no conversations!");
                                await fixMissingConversation();
                            }
                            
                            refreshChats();
                        }}
                    >
                        <Ionicons name="bug-outline" size={22} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.headerIcon}
                        onPress={() => setShowSuggestion(true)}
                    >
                        <Feather name="edit" size={22} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                </View>
            </View>

            {showSuggestion && (
                <Animated.View
                    style={[
                        styles.suggestionOverlay,
                        { opacity: fadeAnim }
                    ]}
                >
                    <TouchableOpacity
                        style={styles.overlayBackground}
                        activeOpacity={1}
                        onPress={handleCloseSuggestion}
                    />

                    <Animated.View
                        style={[
                            styles.suggestionSheet,
                            {
                                transform: [{
                                    translateY: fadeAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [300, 0]
                                    })
                                }]
                            }
                        ]}
                    >
                        <View style={styles.sheetHeader}>
                            <Text style={styles.sheetTitle}>New Message</Text>
                            <TouchableOpacity
                                onPress={handleCloseSuggestion}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchContainer}>
                            <Feather name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
                            <Text style={styles.searchPlaceholder}>To: Type a name or group</Text>
                        </View>

                        <View style={styles.suggestedContainer}>
                            <Text style={styles.suggestedTitle}>SUGGESTED</Text>

                            {getAgencyContacts().map((contact) => {
                                return (
                                    <TouchableOpacity
                                        key={contact.id}
                                        style={styles.agencyItem}
                                        onPress={() => startNewChat(contact)}
                                    >
                                        <View style={styles.agencyAvatar}>
                                            {contact.logo ? (
                                                <Image
                                                    source={{ uri: contact.logo }}
                                                    style={styles.agencyLogo}
                                                />
                                            ) : (
                                                <View style={styles.fallbackAvatar}>
                                                    <Text style={styles.fallbackText}>
                                                        {(contact.name || 'A').charAt(0).toUpperCase()}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        <View style={styles.agencyInfo}>
                                            <Text style={styles.agencyName}>
                                                {contact.name || "Contact"}
                                            </Text>
                                            <Text style={styles.agencySupport}>
                                                {contact.type === 'Agency' ? 'Support Team' : `${contact.type} Support`}
                                            </Text>
                                            {conversationsRef.current[contact.id] && (
                                                <Text style={styles.activeChatIndicator}>
                                                    Active conversation
                                                </Text>
                                            )}
                                        </View>
                                        <View style={styles.checkIcon}>
                                            <Ionicons 
                                                name={conversationsRef.current[contact.id] ? "chatbubble" : "chatbubble-outline"} 
                                                size={20} 
                                                color={conversationsRef.current[contact.id] ? COLORS.primary : COLORS.textSecondary} 
                                            />
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                            
                            {getAgencyContacts().length === 0 && (
                                <View style={styles.noContacts}>
                                    <Ionicons name="people-outline" size={40} color={COLORS.border} />
                                    <Text style={styles.noContactsText}>No contacts available</Text>
                                    <Text style={styles.noContactsSubtext}>
                                        Start a chat with {agencyName || 'your agency'} from the main chat list.
                                    </Text>
                                </View>
                            )}
                        </View>
                    </Animated.View>
                </Animated.View>
            )}

            <View style={styles.content}>
                {isLoadingChats ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Loading chats...</Text>
                    </View>
                ) : chats.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIllustration}>
                            <View style={styles.messengerIcon}>
                                <Ionicons
                                    name="chatbubble-ellipses-outline"
                                    size={100}
                                    color={COLORS.border}
                                />
                            </View>
                        </View>

                        <Text style={styles.emptyTitle}>No messages yet</Text>
                        <Text style={styles.emptySubtitle}>
                            Tap the message button to start a conversation with {agencyName || 'your agency'}
                        </Text>

                        <TouchableOpacity
                            style={styles.floatingButton}
                            onPress={() => setShowSuggestion(true)}
                            activeOpacity={0.9}
                        >
                            <Feather name="edit-2" size={24} color={COLORS.white} />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.chatsContainer}>
                        <View style={styles.chatSectionHeader}>
                            <Text style={styles.sectionTitle}>
                                {agencyName ? `${agencyName} Chats` : 'Recent Chats'}
                            </Text>
                            <TouchableOpacity onPress={forceRefresh} style={styles.refreshButton}>
                                <Ionicons name="refresh" size={20} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>
                        
                        <FlatList
                            data={chats}
                            renderItem={renderChatItem}
                            keyExtractor={item => item.id}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.chatList}
                            refreshing={isLoadingChats}
                            onRefresh={forceRefresh}
                            ListEmptyComponent={
                                <View style={styles.placeholderChats}>
                                    <Ionicons name="chatbubbles-outline" size={60} color={COLORS.border} />
                                    <Text style={styles.placeholderText}>
                                        Your conversations will appear here
                                    </Text>
                                </View>
                            }
                        />
                    </View>
                )}
            </View>

            {chats.length > 0 && (
                <TouchableOpacity
                    style={styles.floatingButton}
                    onPress={() => setShowSuggestion(true)}
                    activeOpacity={0.9}
                >
                    <Feather name="edit-2" size={24} color={COLORS.white} />
                </TouchableOpacity>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        paddingHorizontal: 16, 
        paddingVertical: 12, 
        borderBottomWidth: 1, 
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.white
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginLeft: 10 },
    headerIcons: { flexDirection: 'row', alignItems: 'center' },
    headerIcon: { marginLeft: 15, padding: 4 },
    refreshButton: { padding: 8 },
    chatItem: { 
        flexDirection: 'row', 
        padding: 12, 
        borderBottomWidth: 1, 
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.white
    },
    chatAvatar: { marginRight: 12 },
    chatLogo: { width: 50, height: 50, borderRadius: 25 },
    chatFallback: { 
        width: 50, 
        height: 50, 
        borderRadius: 25, 
        backgroundColor: COLORS.accent, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    chatFallbackText: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
    chatContent: { flex: 1 },
    chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    chatName: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
    chatTime: { fontSize: 12, color: COLORS.textSecondary },
    chatPreview: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    chatMessage: { fontSize: 14, color: COLORS.textSecondary, flex: 1 },
    unreadBadge: { 
        backgroundColor: COLORS.primary, 
        borderRadius: 10, 
        minWidth: 20, 
        height: 20, 
        justifyContent: 'center', 
        alignItems: 'center',
        marginLeft: 8
    },
    unreadText: { fontSize: 12, color: COLORS.white, fontWeight: 'bold' },
    chatTypeContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    chatType: { fontSize: 12, color: COLORS.textSecondary, backgroundColor: COLORS.accent, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    conversationIndicator: { flexDirection: 'row', alignItems: 'center' },
    conversationText: { fontSize: 12, color: COLORS.primary, marginLeft: 4 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 10, color: COLORS.textSecondary },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
    emptyIllustration: { marginBottom: 30 },
    messengerIcon: { alignItems: 'center' },
    emptyTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 8 },
    emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
    floatingButton: { 
        position: 'absolute', 
        bottom: 20, 
        right: 20, 
        width: 56, 
        height: 56, 
        borderRadius: 28, 
        backgroundColor: COLORS.primary, 
        justifyContent: 'center', 
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    chatsContainer: { flex: 1 },
    chatSectionHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: 16, 
        paddingVertical: 12,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border
    },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
    chatList: { paddingBottom: 20 },
    placeholderChats: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
    placeholderText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 10 },
    suggestionOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 },
    overlayBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    suggestionSheet: { 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        backgroundColor: COLORS.white, 
        borderTopLeftRadius: 20, 
        borderTopRightRadius: 20, 
        paddingBottom: 30, 
        maxHeight: '80%' 
    },
    sheetHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: 16, 
        borderBottomWidth: 1, 
        borderBottomColor: COLORS.border 
    },
    sheetTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
    closeButton: { padding: 4 },
    searchContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: COLORS.accent, 
        margin: 16, 
        paddingHorizontal: 12, 
        paddingVertical: 8, 
        borderRadius: 10 
    },
    searchIcon: { marginRight: 8 },
    searchPlaceholder: { fontSize: 16, color: COLORS.textSecondary },
    suggestedContainer: { paddingHorizontal: 16 },
    suggestedTitle: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 12, letterSpacing: 1 },
    agencyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    agencyAvatar: { marginRight: 12 },
    agencyLogo: { width: 50, height: 50, borderRadius: 25 },
    fallbackAvatar: { 
        width: 50, 
        height: 50, 
        borderRadius: 25, 
        backgroundColor: COLORS.accent, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    fallbackText: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
    agencyInfo: { flex: 1 },
    agencyName: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 2 },
    agencySupport: { fontSize: 14, color: COLORS.textSecondary },
    activeChatIndicator: { fontSize: 12, color: COLORS.primary, marginTop: 4 },
    checkIcon: { padding: 4 },
    noContacts: { alignItems: 'center', paddingVertical: 40 },
    noContactsText: { fontSize: 16, color: COLORS.textPrimary, marginTop: 12, marginBottom: 6 },
    noContactsSubtext: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 20 },
    content: { flex: 1, backgroundColor: COLORS.white },
});