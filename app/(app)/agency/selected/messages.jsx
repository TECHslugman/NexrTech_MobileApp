import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, StatusBar, Image, Animated, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import socketService from '../../../services/SocketService';
import { useAuth } from '../../../context/AuthContext';

const COLORS = {
    bg: '#F8FAFD',
    primary: '#769FCD',
    white: '#FFFFFF',
    textPrimary: '#2D3748',
    textSecondary: '#718096',
    border: '#EEF2F7',
    accent: '#B9D7EA',
};

export default function MessagesScreen() {
    const router = useRouter();
    const { userToken, activeAgency } = useAuth();
    const params = useLocalSearchParams();

    // SAFE EXTRACTION
    const agencyId = activeAgency?.id;
    const agencyName = activeAgency?.name;
    const agencyLogo = activeAgency?.logo;

    console.log("Messages Screen Received:", { agencyId, agencyName, agencyLogo });

    const [chats, setChats] = useState([]);
    const [showSuggestion, setShowSuggestion] = useState(false);

    // 2. Optimized Socket Connection
    useEffect(() => {
        if (userToken) {
            // Only connect if not already connected to avoid 'websocket error' loops
            socketService.connect(userToken);

            // If we have an agencyId, join that specific room as well
            if (agencyId) {
                socketService.joinRoom(agencyId);
            }
        }
    }, [userToken, agencyId]);

    const handleGoToChat = () => {
        if (!agencyId) {
            Alert.alert("No Agency Selected", "Please select an agency from the home screen first.");
            return;
        }

        router.push({
            pathname: "/agency/selected/chat",
            params: {
                agencyId: agencyId,
                logo: agencyLogo || "",
                name: agencyName || "Agency Support"
            }
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

            {/* Header - Redesigned */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Messages</Text>
                    <Text style={styles.headerSubtitle}>
                        {agencyName ? `Connected to ${agencyName}` : 'Select an agency'}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.iconButton, showSuggestion && styles.iconButtonActive]}
                    onPress={() => setShowSuggestion(!showSuggestion)}
                    activeOpacity={0.7}
                >
                    <Feather 
                        name={showSuggestion ? "x" : "edit-3"} 
                        size={22} 
                        color={showSuggestion ? COLORS.white : COLORS.primary} 
                    />
                </TouchableOpacity>
            </View>

            {/* Floating Suggestion Card */}
            {showSuggestion && (
                <Animated.View style={styles.suggestionCard}>
                    <View style={styles.suggestionHeader}>
                        <View style={styles.suggestionIcon}>
                            <Feather name="message-square" size={18} color={COLORS.primary} />
                        </View>
                        <Text style={styles.suggestionTitle}>Start Conversation</Text>
                    </View>
                    
                    <TouchableOpacity 
                        style={styles.agencyCard}
                        onPress={handleGoToChat}
                        activeOpacity={0.8}
                    >
                        <View style={styles.agencyInfo}>
                            <View style={styles.logoContainer}>
                                {agencyLogo ? (
                                    <Image
                                        source={{ uri: agencyLogo }}
                                        style={styles.logo}
                                    />
                                ) : (
                                    <View style={styles.fallbackCircle}>
                                        <Text style={styles.fallbackLetter}>
                                            {(agencyName || 'A').charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                                <View style={styles.onlineIndicator} />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={styles.agencyNameText} numberOfLines={1}>
                                    {agencyName || "Selected Agency"}
                                </Text>
                                <Text style={styles.agencyStatus}>Support Team • Online</Text>
                                <Text style={styles.tapToChat}>
                                    Tap to start conversation with support team
                                </Text>
                            </View>
                        </View>
                        <View style={styles.chevronContainer}>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* Main Content Area */}
            <View style={styles.content}>
                {chats.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.illustrationContainer}>
                            <View style={styles.outerCircle}>
                                <View style={styles.innerCircle}>
                                    <Ionicons 
                                        name="chatbubbles-outline" 
                                        size={70} 
                                        color={COLORS.primary} 
                                    />
                                </View>
                            </View>
                            <View style={styles.decorationDot1} />
                            <View style={styles.decorationDot2} />
                        </View>

                        <Text style={styles.emptyTitle}>No conversations yet</Text>
                        <Text style={styles.emptySub}>
                            Start a conversation with{' '}
                            <Text style={styles.agencyHighlight}>
                                {agencyName || "your selected agency"}
                            </Text>
                            {' '}to get support and answers to your questions.
                        </Text>

                        {!showSuggestion && (
                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={() => setShowSuggestion(true)}
                                activeOpacity={0.8}
                            >
                                <Feather name="message-square" size={20} color={COLORS.white} />
                                <Text style={styles.primaryButtonText}>Start New Conversation</Text>
                            </TouchableOpacity>
                        )}

                        <View style={styles.tipContainer}>
                            <Feather name="info" size={16} color={COLORS.textSecondary} />
                            <Text style={styles.tipText}>
                                You can also access chat from agency profile
                            </Text>
                        </View>
                    </View>
                ) : (
                    <View style={styles.chatsContainer}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Recent Conversations</Text>
                            <Text style={styles.sectionCount}>{chats.length} total</Text>
                        </View>
                        {/* Chat list would go here */}
                        <View style={styles.placeholder}>
                            <Feather name="message-square" size={50} color={COLORS.border} />
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
        backgroundColor: COLORS.bg 
    },
    
    // Header Styles
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 16,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: { 
        fontSize: 28, 
        fontWeight: '800', 
        color: COLORS.textPrimary,
        letterSpacing: -0.5,
    },
    headerSubtitle: { 
        fontSize: 14, 
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    iconButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.bg,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: COLORS.border,
    },
    iconButtonActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    
    // Suggestion Card Styles
    suggestionCard: {
        backgroundColor: COLORS.white,
        marginHorizontal: 20,
        marginTop: 20,
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    suggestionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    suggestionIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(118, 159, 205, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    suggestionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    
    // Agency Card Styles
    agencyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bg,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1.5,
        borderColor: 'rgba(118, 159, 205, 0.2)',
    },
    agencyInfo: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        flex: 1 
    },
    logoContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        borderWidth: 2,
        borderColor: COLORS.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    logo: {
        width: 52,
        height: 52,
        borderRadius: 26,
        resizeMode: 'cover',
    },
    fallbackCircle: {
        width: '100%',
        height: '100%',
        borderRadius: 28,
        backgroundColor: COLORS.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fallbackLetter: {
        color: COLORS.primary,
        fontWeight: '800',
        fontSize: 24,
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#4CAF50',
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    textContainer: { 
        flex: 1 
    },
    agencyNameText: { 
        fontSize: 18, 
        fontWeight: '700', 
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    agencyStatus: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginBottom: 6,
    },
    tapToChat: { 
        fontSize: 13, 
        color: COLORS.primary, 
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    chevronContainer: {
        paddingLeft: 8,
    },
    
    // Content Area
    content: {
        flex: 1,
        paddingTop: 8,
    },
    
    // Empty State Styles
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingBottom: 60,
    },
    illustrationContainer: {
        position: 'relative',
        marginBottom: 40,
    },
    outerCircle: {
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 12,
    },
    innerCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(118, 159, 205, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    decorationDot1: {
        position: 'absolute',
        top: 20,
        right: 10,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(185, 215, 234, 0.6)',
    },
    decorationDot2: {
        position: 'absolute',
        bottom: 30,
        left: 10,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: 'rgba(118, 159, 205, 0.4)',
    },
    emptyTitle: { 
        fontSize: 24, 
        fontWeight: '800', 
        color: COLORS.textPrimary, 
        marginBottom: 12,
        textAlign: 'center',
    },
    emptySub: { 
        fontSize: 16, 
        color: COLORS.textSecondary, 
        textAlign: 'center', 
        lineHeight: 24, 
        marginBottom: 40,
        paddingHorizontal: 20,
    },
    agencyHighlight: { 
        color: COLORS.primary, 
        fontWeight: '700' 
    },
    
    // Primary Button
    primaryButton: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 32,
        borderRadius: 30,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
        marginBottom: 32,
    },
    primaryButtonText: { 
        color: COLORS.white, 
        fontSize: 17, 
        fontWeight: '700', 
        marginLeft: 12,
        letterSpacing: 0.3,
    },
    
    // Tip Container
    tipContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(238, 242, 247, 0.8)',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(113, 128, 150, 0.1)',
    },
    tipText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginLeft: 10,
        fontStyle: 'italic',
    },
    
    // Chats List Styles
    chatsContainer: {
        flex: 1,
        padding: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    sectionCount: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
        backgroundColor: 'rgba(118, 159, 205, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(238, 242, 247, 0.5)',
        borderRadius: 20,
        borderWidth: 2,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
        padding: 40,
    },
    placeholderText: {
        fontSize: 16,
        color: COLORS.textSecondary,
        marginTop: 16,
        textAlign: 'center',
    },
});