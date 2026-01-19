import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, StatusBar, Image, Animated, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import socketService from '../../../services/SocketService';
import { useAuth } from '../../../context/AuthContext';

const COLORS = {
    bg: '#FFFFFF',
    primary: '#769FCD', // Messenger blue
    white: '#FFFFFF',
    textPrimary: '#1D1D1D',
    textSecondary: '#8E8E93',
    border: '#E5E5EA',
    accent: '#D8E5FF',
    active: '#769FCD',
    inactive: '#8E8E93',
};
const MOCK_STAFF = [
    { id: 'mentor_001', name: 'Dr. Smith (Mentor)', type: 'Mentor', logo: 'https://i.pravatar.cc/150?u=mentor1' },
    { id: 'agent_002', name: 'Sarah Agent', type: 'Agent', logo: 'https://i.pravatar.cc/150?u=agent1' },
];
export default function MessagesScreen() {
    const router = useRouter();
    const { userToken, activeAgency } = useAuth();
    const params = useLocalSearchParams();

    const agencyId = activeAgency?.id;
    const agencyName = activeAgency?.name;
    const agencyLogo = activeAgency?.logo;

    const [chats, setChats] = useState([]);
    const [showSuggestion, setShowSuggestion] = useState(false);
    const [fadeAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        if (!userToken) return;
        socketService.connect(userToken);
        const handleIncoming = (message) => {
            console.log("📩 New message received in inbox:", message);
        };

        socketService.onNewMessage(handleIncoming);
        return () => {
            socketService.socket?.off("receive_message");
        };
    }, [userToken]);

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
            Alert.alert("Error", "Recipient ID is missing.");
            return;
        }
        console.log("🚀 Navigating to chat with data:", recipient);
        router.push({
            pathname: "/agency/selected/chat",
            params: {
                recipientId: recipient.id,
                name: recipient.name,
                logo: recipient.logo || "",
                recipientType: recipient.type
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

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

            {/* Header - Messenger Style */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Chats</Text>
                <View style={styles.headerIcons}>
                    <TouchableOpacity style={styles.headerIcon}>
                        <Ionicons name="camera-outline" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerIcon}>
                        <Feather name="edit" size={22} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Suggestion Overlay */}
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

                            <TouchableOpacity
                                style={styles.agencyItem}
                                onPress={() => {
                                    if (!agencyId) {
                                        Alert.alert("Error", "No active agency found.");
                                        return;
                                    }
                                    handleGoToChat({
                                        id: agencyId,
                                        name: agencyName,
                                        logo: agencyLogo,
                                        type: 'Agency'
                                    });
                                }}
                            >
                                <View style={styles.agencyAvatar}>
                                    {agencyLogo ? (
                                        <Image
                                            source={{ uri: agencyLogo }}
                                            style={styles.agencyLogo}
                                        />
                                    ) : (
                                        <View style={styles.fallbackAvatar}>
                                            <Text style={styles.fallbackText}>
                                                {(agencyName || 'A').charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.agencyInfo}>
                                    <Text style={styles.agencyName}>
                                        {agencyName || "Selected Agency"}
                                    </Text>
                                    <Text style={styles.agencySupport}>Support Team</Text>
                                </View>
                                <View style={styles.checkIcon}>
                                    <Ionicons name="chatbubble-outline" size={20} color={COLORS.primary} />
                                </View>
                            </TouchableOpacity>
                            {/* 2. THE MENTOR/AGENT ROWS (The Provision) */}
                            {MOCK_STAFF.map((staff) => (
                                <TouchableOpacity
                                    key={staff.id}
                                    style={styles.agencyItem}
                                    onPress={() => handleGoToChat({
                                        id: staff.id,
                                        name: staff.name,
                                        logo: staff.logo,
                                        type: staff.type
                                    })}
                                >
                                    <View style={styles.agencyAvatar}>
                                        <Image source={{ uri: staff.logo }} style={styles.agencyLogo} />
                                    </View>
                                    <View style={styles.agencyInfo}>
                                        <Text style={styles.agencyName}>{staff.name}</Text>
                                        <Text style={styles.agencySupport}>{staff.type} Support</Text>
                                    </View>
                                    <View style={styles.checkIcon}>
                                        <Ionicons name="chatbubble-outline" size={20} color={COLORS.primary} />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Animated.View>
                </Animated.View>
            )}

            {/* Main Content */}
            <View style={styles.content}>
                {chats.length === 0 ? (
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
                            Tap the message button to start a new conversation
                        </Text>

                        {/* Floating Action Button */}
                        <TouchableOpacity
                            style={styles.floatingButton}
                            onPress={() => setShowSuggestion(true)}
                            activeOpacity={0.9}
                        >
                            <Feather name="edit-2" size={24} color={COLORS.white} />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.chatsList}>
                        <View style={styles.chatSectionHeader}>
                            <Text style={styles.sectionTitle}>Recent Chats</Text>
                        </View>
                        {/* Chat items would go here */}
                        <View style={styles.placeholderChats}>
                            <Ionicons name="chatbubbles-outline" size={60} color={COLORS.border} />
                            <Text style={styles.placeholderText}>
                                Your conversations will appear here
                            </Text>
                        </View>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white
    },

    // Header - Messenger Style
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.textPrimary,
        letterSpacing: -0.5,
    },
    headerIcons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
        backgroundColor: COLORS.bg,
    },

    // Suggestion Overlay
    suggestionOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
    },
    overlayBackground: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    suggestionSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 8,
        maxHeight: '80%',
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Search in Suggestion Sheet
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bg,
        marginHorizontal: 16,
        marginVertical: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchPlaceholder: {
        fontSize: 16,
        color: COLORS.textSecondary,
        flex: 1,
    },

    // Suggested Agency Item
    suggestedContainer: {
        padding: 16,
    },
    suggestedTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    agencyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 12,
        backgroundColor: COLORS.bg,
    },
    agencyAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.accent,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        overflow: 'hidden',
    },
    agencyLogo: {
        width: '100%',
        height: '100%',
        borderRadius: 28,
    },
    fallbackAvatar: {
        width: '100%',
        height: '100%',
        borderRadius: 28,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fallbackText: {
        color: COLORS.white,
        fontSize: 24,
        fontWeight: '600',
    },
    agencyInfo: {
        flex: 1,
    },
    agencyName: {
        fontSize: 17,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    agencySupport: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    checkIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 132, 255, 0.1)',
    },

    // Main Content
    content: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },

    // Empty State
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    emptyIllustration: {
        marginBottom: 32,
        position: 'relative',
    },
    messengerIcon: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: COLORS.border,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 48,
    },

    // Floating Action Button
    floatingButton: {
        position: 'absolute',
        bottom: 32,
        right: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },

    // Chats List (when there are chats)
    chatsList: {
        flex: 1,
    },
    chatSectionHeader: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    placeholderChats: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    placeholderText: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: 16,
        lineHeight: 22,
    },
});