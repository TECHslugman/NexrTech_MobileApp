import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, StatusBar, Image, Animated,
    FlatList, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import socketService from '../../../services/SocketService';
import { useAuth } from '../../../context/AuthContext';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../../../config';

const COLORS = {
    bg: '#F8FBFF',
    primary: '#769FCD',
    white: '#FFFFFF',
    textPrimary: '#2D3748',
    textSecondary: '#64748B',
    border: '#E0EBFF',
    accent: '#E8F1FF',
    active: '#769FCD',
    inactive: '#94A3B8',
    success: '#10B981',
    online: '#10B981',
};

// Agency-specific storage keys
const getStorageKey = (agencyId) => `chat_conversations_${agencyId}`;
const getMetadataKey = (agencyId) => `chat_metadata_${agencyId}`;
const AGENCY_STAFF_KEY = 'agency_staff';

export default function MessagesScreen() {
    const router = useRouter();
    const { userToken, activeAgency, user } = useAuth();
    const [assignedAgentData, setAssignedAgentData] = useState(null);
    const [connectedMentorData, setConnectedMentorData] = useState(null);
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

    // MAIN SOCKET AND DATA LOADING EFFECT
    useEffect(() => {
        console.log("🚀 Initializing MessagesScreen for agency:", agencyId);

        if (!agencyId) {
            console.log("⏳ Waiting for agencyId...");
            return;
        }

        const initializeData = async () => {
            try {
                await fetchStudentProfile();
                await loadSavedConversations();
                await loadAgencyStaff();

                console.log("✅ Data initialization complete");
            } catch (error) {
                console.error("❌ Initialization error:", error);
            }
        };

        initializeData();

        if (!userToken) {
            console.log("🔑 No user token available");
            return;
        }

        socketService.connect(userToken, agencyId);

        // ====== BACKEND EVENT: receive_message ======
        const handleReceiveMessage = (message) => {
            console.log("📩 New message received:", message);

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

        // ====== BACKEND EVENT: sent_message ======
        const handleSentMessage = async (message) => {
            console.log('✅ Message sent confirmation received:', message);

            if (message?.conversationId && message?.receiver) {
                const recipientId = message.receiver;
                const conversationId = message.conversationId;

                const isRecipientFromCurrentAgency = checkIfFromCurrentAgency(recipientId, message);

                if (!isRecipientFromCurrentAgency) {
                    console.log('📭 Message not for current agency, ignoring');
                    return;
                }

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

                await saveChatMetadata(recipientId, metadata);
                await saveConversationToStorage(recipientId, conversationId);
                await refreshChats();
            }
        };

        // ====== BACKEND EVENT: conversation_list ======
        const handleConversationList = (data) => {
            console.log('📋 Received conversation list from backend');
            
            // Backend automatically sends this on connect with full chat history
            if (data && Array.isArray(data)) {
                console.log('📋 Processing', data.length, 'conversations');
                
                // Process each conversation from the list
                data.forEach(conversation => {
                    if (conversation.conversationId && conversation.participants) {
                        // Find the other participant (not the current user)
                        const otherParticipant = conversation.participants.find(
                            p => p.id !== user?.id
                        );
                        
                        if (otherParticipant) {
                            const participantId = otherParticipant.id;
                            
                            // Save conversation ID
                            conversationsRef.current[participantId] = conversation.conversationId;
                            
                            // Save metadata
                            const metadata = {
                                id: participantId,
                                name: otherParticipant.name || getRecipientName(participantId),
                                logo: otherParticipant.avatar || getRecipientLogo(participantId),
                                type: otherParticipant.model || getRecipientType(participantId),
                                lastMessage: conversation.lastMessage?.content || '',
                                timestamp: conversation.lastMessage?.createdAt 
                                    ? new Date(conversation.lastMessage.createdAt) 
                                    : new Date(),
                                unreadCount: conversation.unreadCount || 0,
                                agencyId: agencyId
                            };
                            
                            saveChatMetadata(participantId, metadata);
                            saveConversationToStorage(participantId, conversation.conversationId);
                        }
                    }
                });
                
                refreshChats();
            } else {
                console.log('📋 Conversation list received (will refresh chats)');
                refreshChats();
            }
        };

        // Set up listeners using the cleaned SocketService methods
        const unsubscribeReceive = socketService.onReceiveMessage(handleReceiveMessage);
        const unsubscribeSent = socketService.onSentMessage(handleSentMessage);
        const unsubscribeList = socketService.onConversationList(handleConversationList);

        return () => {
            console.log("🧹 Cleaning up MessagesScreen listeners");
            // Use the cleanup functions returned by the listeners
            unsubscribeReceive();
            unsubscribeSent();
            unsubscribeList();
        };
    }, [userToken, agencyId, refreshKey]);

    const fetchMentorDetails = async (mentorId) => {
        try {
            const response = await fetch(`${Config.API_BASE_URL}/agency/mentors/${mentorId}`, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });
            const data = await response.json();

            if (data.message === "Success") {
                setConnectedMentorData(data.mentor);
                console.log("✅ Full Mentor Details Loaded:", data.mentor.name);
            }
        } catch (error) {
            console.error("❌ Error fetching mentor details:", error);
        }
    };

    const fetchAgentDetails = async (agentId) => {
        try {
            // Updated URL to include the trailing /agents as seen in your screenshot
            const API_URL = `${Config.API_BASE_URL}/agency/profile/employee/agents/${agentId}/agents`;

            console.log("🌐 Fetching Agent details from:", API_URL);

            const response = await fetch(API_URL, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });

            const data = await response.json();

            if (data.message === "Success" && data.agent) {
                setAssignedAgentData(data.agent);
                console.log("✅ Agent Details Loaded:", data.agent.name);
            }
        } catch (error) {
            console.error("❌ Error fetching agent details:", error);
        }
    };

    const fetchStudentProfile = async () => {
        try {
            const response = await fetch(`${Config.API_BASE_URL}/students/profile`, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });
            const data = await response.json();

            // 1. Handle Mentor Connection
            const connection = data?.profile?.connectedMentor;
            if (connection && connection.status === 'confirmed') {
                console.log("🔗 Found confirmed mentor ID:", connection.mentor);
                await fetchMentorDetails(connection.mentor);
            }

            // 2. Handle Assigned Agent (Admission/Visa Officer)
            const agentId = data?.profile?.assignedAgent;
            if (agentId) {
                console.log("🔗 Found assigned agent ID:", agentId);
                await fetchAgentDetails(agentId);
            }

        } catch (err) {
            console.error("❌ Profile fetch failed:", err);
        }
    };

    const checkIfFromCurrentAgency = (id, message = {}) => {
        if (!agencyId) return false;
        if (id === agencyId) return true;

        const metadata = chatMetadataRef.current[id];
        if (metadata?.agencyId === agencyId) return true;

        const isAgencyStaff = agencyStaffRef.current.some(staff =>
            staff.id === id && staff.agencyId === agencyId
        );
        if (isAgencyStaff) return true;

        return false;
    };

    const getAgencyContacts = () => {
        const contacts = [];

        // 1. Agency Support Option
        if (!conversationsRef.current[agencyId]) {
            contacts.push({
                id: agencyId,
                name: agencyName || 'Agency Support',
                logo: agencyLogo || '',
                type: 'Agency',
                agencyId: agencyId
            });
        }

        // 2. Connected Mentor Option
        if (connectedMentorData) {
            const mId = connectedMentorData._id;

            if (!conversationsRef.current[mId]) {
                contacts.push({
                    id: mId,
                    name: connectedMentorData.name,
                    logo: connectedMentorData.profilepic,
                    type: 'Mentor',
                    agencyId: agencyId
                });
            }
        }

        // 3. Assigned Agent Option
        if (assignedAgentData) {
            const agentId = assignedAgentData._id;

            if (!conversationsRef.current[agentId]) {

                const displayRole = assignedAgentData.systemRole
                    ? assignedAgentData.systemRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                    : 'Officer';

                contacts.push({
                    id: agentId,
                    name: `${assignedAgentData.name} (${displayRole})`,
                    subtitle: displayRole,
                    logo: '',
                    type: 'Agent',
                    agencyId: agencyId
                });
            }
        }

        return contacts;
    };

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

    const getRecipientName = (recipientId) => {
        if (chatMetadataRef.current[recipientId]?.name) {
            return chatMetadataRef.current[recipientId].name;
        }

        if (recipientId === agencyId) return agencyName || 'Agency Support';

        const staff = agencyStaffRef.current.find(staff => staff.id === recipientId);
        if (staff) return staff.name;

        return 'Support';
    };

    const getRecipientLogo = (recipientId) => {
        if (chatMetadataRef.current[recipientId]?.logo) {
            return chatMetadataRef.current[recipientId].logo;
        }

        if (recipientId === agencyId) return agencyLogo;

        const staff = agencyStaffRef.current.find(staff => staff.id === recipientId);
        if (staff) return staff.logo;

        return '';
    };

    const getRecipientType = (recipientId) => {
        if (chatMetadataRef.current[recipientId]?.type) {
            return chatMetadataRef.current[recipientId].type;
        }

        if (recipientId === agencyId) return 'Agency';

        const staff = agencyStaffRef.current.find(staff => staff.id === recipientId);
        if (staff) return staff.type;

        return 'Support';
    };

    const getLastMessage = (recipientId) => {
        const lastMsg = chatMetadataRef.current[recipientId]?.lastMessage;
        return lastMsg && lastMsg.trim() !== '' ? lastMsg : 'Start a conversation...';
    };

    const getTimestamp = (recipientId) => {
        const timestamp = chatMetadataRef.current[recipientId]?.timestamp;
        return timestamp ? new Date(timestamp) : new Date();
    };

    const getUnreadCount = (recipientId) => {
        return chatMetadataRef.current[recipientId]?.unreadCount || 0;
    };

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

            let chatList = [];

            Object.entries(conversationsRef.current).forEach(([recipientId, conversationId]) => {
                const metadata = chatMetadataRef.current[recipientId] || {};

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

            chatList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            setChats(chatList);
            console.log('✅ Refreshed chats for agency', agencyId, ':', chatList.length);

            setIsLoadingChats(false);
        } catch (error) {
            console.error('❌ Error refreshing chats:', error);
            setIsLoadingChats(false);
        }
    };

    const startNewChat = (recipient) => {
        if (!recipient.id) {
            Toast.show({
                type: 'error',
                text1: 'Recipient Missing',
                text2: 'Unable to start chat. Recipient ID is missing.'
            });
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

        Toast.show({
            type: 'success',
            text1: 'Starting Chat',
            text2: `Connecting you with ${recipient.name}...`,
            visibilityTime: 1500,
        });

        handleGoToChat(recipient);
    };

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

    const handleGoToChat = (recipient) => {
        if (!recipient.id) {
            Toast.show({
                type: 'error',
                text1: 'Connection Error',
                text2: 'Could not open chat. Recipient ID is missing.'
            });
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

    const formatTime = (timestamp) => {
        const now = new Date();
        const messageDate = new Date(timestamp);
        const diffMs = now - messageDate;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;

        return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const renderChatItem = ({ item }) => {
        // 1. Determine the specific label to show for Agents
        let displayType = item.type;
        if (item.type === 'Agent' && assignedAgentData && assignedAgentData._id === item.id) {
            // Formats "visa_officer" to "Visa Officer"
            displayType = assignedAgentData.systemRole
                ? assignedAgentData.systemRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                : 'Officer';
        }

        return (
            <TouchableOpacity
                style={styles.chatItem}
                onPress={() => handleGoToChat(item)}
                activeOpacity={0.7}
            >
                <View style={styles.chatAvatarContainer}>
                    {item.logo ? (
                        <Image source={{ uri: item.logo }} style={styles.chatAvatar} />
                    ) : (
                        <View style={styles.chatAvatarFallback}>
                            <Text style={styles.chatAvatarText}>
                                {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                            </Text>
                        </View>
                    )}
                    {item.unreadCount > 0 && <View style={styles.onlineIndicator} />}
                </View>

                <View style={styles.chatContent}>
                    <View style={styles.chatHeader}>
                        <Text style={styles.chatName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.chatTime}>{formatTime(item.timestamp)}</Text>
                    </View>

                    <View style={styles.chatMessageRow}>
                        <Text
                            style={[
                                styles.chatMessage,
                                item.unreadCount > 0 && styles.chatMessageUnread
                            ]}
                            numberOfLines={1}
                        >
                            {item.lastMessage || 'No messages yet'}
                        </Text>
                    </View>

                    <View style={styles.chatFooter}>
                        <View style={styles.chatTypeBadge}>
                            <Ionicons
                                name={
                                    item.type === 'Agency' ? 'business-outline' :
                                        item.type === 'Mentor' ? 'school-outline' :
                                            item.type === 'Agent' ? 'ribbon-outline' : 'person-outline'
                                }
                                size={12}
                                color={COLORS.primary}
                            />
                            {/* 2. Display the dynamic type (Visa Officer / Mentor / Agency) */}
                            <Text style={styles.chatTypeText}>{displayType}</Text>
                        </View>

                        {item.unreadCount > 0 && (
                            <View style={styles.unreadBadge}>
                                <Text style={styles.unreadText}>{item.unreadCount}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Messages</Text>
                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={styles.composeButton}
                        onPress={() => setShowSuggestion(true)}
                    >
                        <Ionicons name="create-outline" size={22} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* New Message Sheet */}
            {showSuggestion && (
                <Animated.View style={[styles.suggestionOverlay, { opacity: fadeAnim }]}>
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
                        <View style={styles.sheetHandle} />

                        <View style={styles.sheetHeader}>
                            <Text style={styles.sheetTitle}>New Message</Text>
                            <TouchableOpacity
                                onPress={handleCloseSuggestion}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.suggestedContainer}>
                            <Text style={styles.suggestedTitle}>CONTACTS</Text>

                            {getAgencyContacts().map((contact) => (
                                <TouchableOpacity
                                    key={contact.id}
                                    style={styles.contactItem}
                                    onPress={() => {
                                        startNewChat(contact);
                                        handleCloseSuggestion();
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.contactAvatarContainer}>
                                        {contact.logo ? (
                                            <Image source={{ uri: contact.logo }} style={styles.contactAvatar} />
                                        ) : (
                                            <View style={styles.contactAvatarFallback}>
                                                <Text style={styles.contactAvatarText}>
                                                    {contact.name.charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    <View style={styles.contactInfo}>
                                        <Text style={styles.contactName}>{contact.name}</Text>
                                        <Text style={styles.contactRole}>{contact.type}</Text>
                                    </View>

                                    <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            ))}

                            {getAgencyContacts().length === 0 && (
                                <View style={styles.noContacts}>
                                    <Ionicons name="people-outline" size={48} color={COLORS.border} />
                                    <Text style={styles.noContactsText}>No contacts available</Text>
                                    <Text style={styles.noContactsSubtext}>
                                        All available contacts already have active conversations
                                    </Text>
                                </View>
                            )}
                        </View>
                    </Animated.View>
                </Animated.View>
            )}

            {/* Main Content */}
            <View style={styles.content}>
                {isLoadingChats ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Loading messages...</Text>
                    </View>
                ) : chats.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIcon}>
                            <Ionicons name="chatbubbles-outline" size={80} color={COLORS.border} />
                        </View>
                        <Text style={styles.emptyTitle}>No Messages Yet</Text>
                        <Text style={styles.emptySubtitle}>
                            Start a conversation with {agencyName || 'your agency'}
                        </Text>
                        <TouchableOpacity
                            style={styles.startChatButton}
                            onPress={() => setShowSuggestion(true)}
                        >
                            <Ionicons name="add" size={20} color={COLORS.white} />
                            <Text style={styles.startChatText}>Start New Chat</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={chats}
                        renderItem={renderChatItem}
                        keyExtractor={item => item.id}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.chatList}
                        refreshing={isLoadingChats}
                        onRefresh={forceRefresh}
                    />
                )}
            </View>

            {/* Floating Action Button */}
            {chats.length > 0 && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => setShowSuggestion(true)}
                    activeOpacity={0.9}
                >
                    <Ionicons name="create-outline" size={24} color={COLORS.white} />
                </TouchableOpacity>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: COLORS.bg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
        flex: 1,
        marginLeft: 16
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    composeButton: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: COLORS.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        backgroundColor: COLORS.white
    },
    chatList: {
        paddingBottom: 80
    },
    chatItem: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    chatAvatarContainer: {
        position: 'relative',
        marginRight: 14,
    },
    chatAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.accent
    },
    chatAvatarFallback: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chatAvatarText: {
        fontSize: 22,
        fontWeight: '600',
        color: COLORS.primary
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: COLORS.online,
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    chatContent: {
        flex: 1,
        justifyContent: 'center'
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6
    },
    chatName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        flex: 1,
        marginRight: 8
    },
    chatTime: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '500'
    },
    chatMessageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6
    },
    chatMessage: {
        fontSize: 14,
        color: COLORS.textSecondary,
        flex: 1,
        lineHeight: 20
    },
    chatMessageUnread: {
        color: COLORS.textPrimary,
        fontWeight: '500'
    },
    chatFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    chatTypeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.accent,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4
    },
    chatTypeText: {
        fontSize: 11,
        color: COLORS.primary,
        fontWeight: '600'
    },
    unreadBadge: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        minWidth: 22,
        height: 22,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    unreadText: {
        fontSize: 11,
        color: COLORS.white,
        fontWeight: '700'
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40
    },
    loadingText: {
        marginTop: 16,
        color: COLORS.textSecondary,
        fontSize: 14,
        fontWeight: '500'
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40
    },
    emptyIcon: {
        marginBottom: 24
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 8
    },
    emptySubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 32
    },
    startChatButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8
    },
    startChatText: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: '600'
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    suggestionOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000
    },
    overlayBackground: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)'
    },
    suggestionSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 30,
        maxHeight: '70%',
    },
    sheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: COLORS.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 8
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    sheetTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary
    },
    closeButton: {
        padding: 4
    },
    suggestedContainer: {
        paddingHorizontal: 20,
        paddingTop: 16
    },
    suggestedTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textSecondary,
        marginBottom: 16,
        letterSpacing: 1
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border
    },
    contactAvatarContainer: {
        marginRight: 14,
    },
    contactAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.accent
    },
    contactAvatarFallback: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contactAvatarText: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.primary
    },
    contactInfo: {
        flex: 1
    },
    contactName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 4
    },
    contactRole: {
        fontSize: 13,
        color: COLORS.textSecondary
    },
    noContacts: {
        alignItems: 'center',
        paddingVertical: 40
    },
    noContactsText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginTop: 16,
        marginBottom: 8
    },
    noContactsSubtext: {
        fontSize: 13,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 20
    },
});