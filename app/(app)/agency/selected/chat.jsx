import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, StyleSheet, SafeAreaView,
    Text, TouchableOpacity, StatusBar, Image,
    Platform, KeyboardAvoidingView, Alert
} from 'react-native';
import { GiftedChat, Bubble, Send, InputToolbar, Time } from 'react-native-gifted-chat';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import socketService from '../../../services/SocketService';

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
    typingIndicator: '#E5E5EA',
    accent: '#D8E5FF',
    placeholder: '#8E8E93',
    inputBg: '#F0F2F5',
    inputText: '#000000',
};

export default function ChatScreen() {
    const { recipientId, name, logo, recipientType } = useLocalSearchParams();
    const router = useRouter();
    const { userToken } = useAuth();


    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const chatRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        if (!userToken || !recipientId) {
            setIsLoading(false);
            return;
        }

        const initializeSocket = () => {
            try {
                // 1. Connect (Backend verifies token and joins user to their room)
                socketService.connect(userToken);

                // 2. Local State for connection status
                // Note: Since we use specific methods now, we access the internal socket for basic events
                socketService.socket?.on("connect", () => setIsConnected(true));
                socketService.socket?.on("disconnect", () => setIsConnected(false));

                // 3. Use our new helper for receiving messages
                socketService.onNewMessage((msg) => {
                    console.log("📨 Received message:", msg);

                    // Ignore if it's our own message (though backend handles this, safety first)
                    if (msg.sender === userToken) return;

                    const incomingMsg = {
                        _id: msg._id || Math.random().toString(),
                        text: msg.content,
                        createdAt: new Date(msg.createdAt || new Date()),
                        user: {
                            _id: msg.sender,
                            name: msg.senderModel === 'Student' ? 'You' : (name || 'Support'),
                            avatar: msg.senderModel !== 'Student' ? logo : null,
                        },
                    };

                    setMessages(prev => GiftedChat.append(prev, [incomingMsg]));
                });

                // 4. Typing (Keep as generic for now as service doesn't have helper for this yet)
                socketService.socket?.on("typing", (data) => {
                    if (data.sender !== userToken) {
                        setIsTyping(true);
                        clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
                    }
                });

                setTimeout(() => setIsLoading(false), 800);

            } catch (error) {
                console.error("Socket initialization error:", error);
                setIsLoading(false);
            }
        };

        initializeSocket();

        return () => {
            // Cleanup using the internal socket instance
            socketService.socket?.off("connect");
            socketService.socket?.off("disconnect");
            socketService.socket?.off("receive_message");
            socketService.socket?.off("typing");
        };
    }, [recipientId, userToken, name, logo]);
    const onSend = useCallback((newMessages = []) => {
        if (!isConnected) {
            Alert.alert("Connection Lost", "Please wait while we reconnect...");
            return;
        }

        const message = newMessages[0];
        if (!message.text.trim()) return;

        try {
            // Use the simplified helper: sendMessage(id, content, type)
            socketService.sendMessage(recipientId, message.text, recipientType || "Agency");

            // Update local UI
            setMessages(prev => GiftedChat.append(prev, newMessages));
            setIsTyping(false);

        } catch (error) {
            console.error("Error sending message:", error);
        }
    }, [recipientId, userToken, isConnected, recipientType]);

    const handleTyping = () => {
        if (isConnected) {
            // typing isn't in our "Easy Mode" yet, so we emit directly to the internal socket
            socketService.socket?.emit("typing", {
                receiver: recipientId,
                sender: userToken,
                isTyping: true
            });
        }
    };

    const renderBubble = (props) => (
        <View style={[
            styles.bubbleContainer,
            props.position === 'right' ? styles.bubbleRight : styles.bubbleLeft
        ]}>
            <Bubble
                {...props}
                wrapperStyle={{
                    right: {
                        backgroundColor: COLORS.sentMsg,
                        borderRadius: 18,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        marginRight: 16,
                        marginBottom: 2,
                        maxWidth: '80%',
                        minHeight: 36,
                        justifyContent: 'center',
                    },
                    left: {
                        backgroundColor: COLORS.receivedMsg,
                        borderRadius: 18,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        marginLeft: 16,
                        marginBottom: 2,
                        maxWidth: '80%',
                        minHeight: 36,
                        justifyContent: 'center',
                    },
                }}
                textStyle={{
                    right: {
                        color: COLORS.white,
                        fontSize: 15,
                        lineHeight: 20,
                        fontWeight: '400',
                    },
                    left: {
                        color: COLORS.textPrimary,
                        fontSize: 15,
                        lineHeight: 20,
                        fontWeight: '400',
                    },
                }}
                timeTextStyle={{
                    right: { color: 'rgba(255,255,255,0.7)' },
                    left: { color: COLORS.textSecondary },
                }}
                renderTime={(props) => (
                    <Time {...props}
                        timeTextStyle={{
                            left: {
                                fontSize: 11,
                                color: COLORS.textSecondary,
                                marginTop: 2,
                            },
                            right: {
                                fontSize: 11,
                                color: 'rgba(255,255,255,0.7)',
                                marginTop: 2,
                            },
                        }}
                    />
                )}
            />
        </View>
    );

    const renderSend = (props) => (
        <Send
            {...props}
            containerStyle={styles.sendContainer}
            disabled={!props.text || props.text.trim().length === 0}
        >
            <View style={[
                styles.sendButton,
                (!props.text || props.text.trim().length === 0) && styles.sendButtonDisabled
            ]}>
                <Ionicons
                    name="send"
                    size={20}
                    color={(!props.text || props.text.trim().length === 0) ? '#C5C7D0' : COLORS.white}
                />
            </View>
        </Send>
    );

    const renderInputToolbar = (props) => (
        <InputToolbar
            {...props}
            containerStyle={styles.inputToolbar}
            primaryStyle={styles.inputPrimary}
            accessoryStyle={styles.inputAccessory}
        />
    );

    const renderFooter = () => {
        if (isTyping) {
            return (
                <View style={styles.typingContainer}>
                    <View style={styles.typingBubble}>
                        <View style={styles.typingDots}>
                            <View style={[styles.typingDot, styles.typingDot1]} />
                            <View style={[styles.typingDot, styles.typingDot2]} />
                            <View style={[styles.typingDot, styles.typingDot3]} />
                        </View>
                    </View>
                </View>
            );
        }
        return null;
    };

    const handleScroll = ({ nativeEvent }) => {
        const offset = nativeEvent.contentOffset.y;
        setShowScrollButton(offset > 300);
    };

    const scrollToBottom = () => {
        if (chatRef.current) {
            chatRef.current.scrollToBottom();
        }
    };

    const renderEmptyChat = () => (
        <View style={styles.emptyChatContainer}>
            <View style={styles.emptyIllustration}>
                <View style={styles.emptyIconCircle}>
                    <Ionicons name="chatbubble-outline" size={60} color={COLORS.primary} />
                </View>
            </View>
            <Text style={styles.emptyTitle}>Start Conversation</Text>
            <Text style={styles.emptySubtitle}>
                Send your first message to {name || 'the agency'}
            </Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

            {/* Header */}
            <SafeAreaView style={styles.headerSafeArea}>
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.backButton}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.agencyInfo}
                        activeOpacity={0.8}
                    >
                        <View style={styles.avatarContainer}>
                            {logo ? (
                                <Image source={{ uri: logo }} style={styles.headerAvatar} />
                            ) : (
                                <View style={styles.placeholderAvatar}>
                                    <Text style={styles.avatarText}>
                                        {(name || 'A').charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                            <View style={[
                                styles.statusIndicator,
                                { backgroundColor: isConnected ? COLORS.online : '#C5C7D0' }
                            ]} />
                        </View>

                        <View style={styles.headerContent}>
                            <Text style={styles.headerName} numberOfLines={1}>
                                {name || 'Agency Support'}
                            </Text>
                            <Text style={styles.headerStatus}>
                                {isConnected ? 'Active now' : 'Connecting...'}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.headerIcon} activeOpacity={0.7}>
                            <Ionicons name="ellipsis-horizontal" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>

            {/* Chat Body */}
            <KeyboardAvoidingView
                style={styles.chatContainer}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <View style={styles.loadingContent}>
                            <View style={styles.loadingSpinner}>
                                <Ionicons name="chatbubbles-outline" size={44} color={COLORS.primary} />
                            </View>
                            <Text style={styles.loadingText}>Loading messages...</Text>
                        </View>
                    </View>
                ) : (
                    <View style={styles.chatWrapper}>
                        <GiftedChat
                            ref={chatRef}
                            messages={messages}
                            onSend={onSend}
                            user={{ _id: userToken, name: 'You' }}
                            renderBubble={renderBubble}
                            renderSend={renderSend}
                            renderInputToolbar={renderInputToolbar}
                            renderFooter={renderFooter}
                            placeholder="Message..."
                            alwaysShowSend
                            scrollToBottom
                            scrollToBottomComponent={() => (
                                <View style={styles.scrollBottomButton}>
                                    <Ionicons name="chevron-down" size={18} color={COLORS.white} />
                                </View>
                            )}
                            renderAvatar={null}
                            onInputTextChanged={handleTyping}
                            listViewProps={{
                                onScroll: handleScroll,
                                scrollEventThrottle: 16,
                                style: styles.chatListView,
                                contentContainerStyle: styles.chatListContent,
                                showsVerticalScrollIndicator: false,
                            }}
                            minInputToolbarHeight={60}
                            textInputStyle={styles.textInput}
                            textInputProps={{
                                placeholderTextColor: COLORS.placeholder,
                                multiline: true,
                                maxLength: 1000,
                            }}
                            renderEmpty={renderEmptyChat}
                            keyboardShouldPersistTaps="handled"
                        />
                    </View>
                )}
            </KeyboardAvoidingView>

            {/* Floating Scroll to Bottom Button */}
            {showScrollButton && messages.length > 0 && (
                <TouchableOpacity
                    style={styles.floatingScrollButton}
                    onPress={scrollToBottom}
                    activeOpacity={0.8}
                >
                    <Ionicons name="chevron-down" size={20} color={COLORS.white} />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    // Header Area
    headerSafeArea: {
        backgroundColor: COLORS.white,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    agencyInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        paddingHorizontal: 12,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 10,
    },
    headerAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: COLORS.accent,
    },
    placeholderAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: COLORS.white,
        fontWeight: '600',
        fontSize: 16,
    },
    statusIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
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
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    headerStatus: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Loading State
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    loadingContent: {
        alignItems: 'center',
    },
    loadingSpinner: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#F8F9FA',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    loadingText: {
        fontSize: 15,
        color: COLORS.textSecondary,
    },

    // Chat Container
    chatContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    chatWrapper: {
        flex: 1,
    },
    chatListView: {
        backgroundColor: COLORS.background,
        paddingTop: 4,
    },
    chatListContent: {
        paddingBottom: 10,
        paddingTop: 4,
    },

    // Message Bubbles
    bubbleContainer: {
        flex: 1,
        marginTop: 1,
    },
    bubbleRight: {
        alignItems: 'flex-end',
    },
    bubbleLeft: {
        alignItems: 'flex-start',
    },

    // Input Toolbar - Fixed text color and padding
    inputToolbar: {
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        backgroundColor: COLORS.white,
        paddingHorizontal: 12,
        paddingVertical: 6,
        minHeight: 56,
        marginBottom: 0,
    },
    inputPrimary: {
        alignItems: 'center',
        minHeight: 40,
    },
    inputAccessory: {
        height: 40,
    },
    textInput: {
        fontSize: 16,
        color: COLORS.inputText, // Fixed: Now text is visible (black)
        paddingVertical: 8,
        paddingHorizontal: 14,
        backgroundColor: COLORS.inputBg,
        borderRadius: 18,
        flex: 1,
        marginRight: 8,
        minHeight: 36,
        maxHeight: 80,
    },
    sendContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        height: 40,
        width: 40,
    },
    sendButton: {
        backgroundColor: COLORS.primary,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: COLORS.inputBg,
    },

    // Typing Indicator
    typingContainer: {
        paddingHorizontal: 16,
        paddingVertical: 2,
        marginBottom: 4,
    },
    typingBubble: {
        backgroundColor: COLORS.receivedMsg,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        maxWidth: 65,
        alignSelf: 'flex-start',
    },
    typingDots: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    typingDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        marginHorizontal: 1.5,
        backgroundColor: COLORS.textSecondary,
    },
    typingDot1: {
        opacity: 0.4,
    },
    typingDot2: {
        opacity: 0.7,
    },
    typingDot3: {
        opacity: 1,
    },

    // Empty Chat State
    emptyChatContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 40,
    },
    emptyIllustration: {
        marginBottom: 20,
    },
    emptyIconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F8F9FA',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: COLORS.border,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 6,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 18,
        maxWidth: 250,
    },

    // Floating Scroll Button
    floatingScrollButton: {
        position: 'absolute',
        bottom: 76,
        right: 12,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
        zIndex: 100,
    },
    scrollBottomButton: {
        backgroundColor: COLORS.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
});