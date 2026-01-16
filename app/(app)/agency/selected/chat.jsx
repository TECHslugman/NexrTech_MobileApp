import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, StyleSheet, SafeAreaView, ActivityIndicator,
    Text, TouchableOpacity, StatusBar, Alert, Image,
    Animated, Platform
} from 'react-native';
import { GiftedChat, Bubble, Send, InputToolbar } from 'react-native-gifted-chat';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import socketService from '../../../services/SocketService';

const COLORS = {
    primary: '#769FCD',
    background: '#F0F2F5',
    white: '#FFFFFF',
    textPrimary: '#2D3748',
    textSecondary: '#718096',
    border: '#E2E8F0',
    online: '#10B981',
    sentMsg: '#769FCD',
    receivedMsg: '#FFFFFF',
    typingIndicator: '#E2E8F0',
    subtleShadow: 'rgba(0, 0, 0, 0.08)',
};

export default function ChatScreen() {
    const { agencyId, name, logo } = useLocalSearchParams();
    const router = useRouter();
    const { userToken } = useAuth();

    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const animatedValue = useRef(new Animated.Value(0)).current;
    const chatRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        if (!userToken || !agencyId) {
            Alert.alert("Error", "Missing user token or agency ID");
            return;
        }

        const initializeSocket = () => {
            try {
                // Connect to socket
                socketService.connect(userToken);
                socketService.joinRoom(agencyId);
                
                const handleConnect = () => {
                    console.log("✅ Socket connected");
                    setIsConnected(true);
                    Animated.spring(animatedValue, {
                        toValue: 1,
                        useNativeDriver: true,
                    }).start();
                };

                const handleDisconnect = () => {
                    console.log("❌ Socket disconnected");
                    setIsConnected(false);
                };

                const handleReceiveMessage = (data) => {
                    console.log("📨 Received message:", data);
                    const msg = data.message || data;
                    
                    // Prevent duplicate messages from self
                    if (msg.sender === userToken) return;

                    const incomingMsg = {
                        _id: msg._id || Math.random().toString(),
                        text: msg.content,
                        createdAt: new Date(msg.createdAt || Date.now()),
                        user: {
                            _id: msg.sender,
                            name: name || 'Agency',
                            avatar: logo || null,
                        },
                    };
                    
                    setMessages(prev => GiftedChat.append(prev, [incomingMsg]));
                };

                const handleTyping = (data) => {
                    if (data.room === agencyId && data.sender !== userToken) {
                        setIsTyping(true);
                        // Clear typing indicator after 3 seconds
                        clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
                    }
                };

                // Set up event listeners
                socketService.on("connect", handleConnect);
                socketService.on("disconnect", handleDisconnect);
                socketService.on("receive_message", handleReceiveMessage);
                socketService.on("typing", handleTyping);

                // Simulate connection success (remove this in production)
                setTimeout(() => {
                    setIsConnected(true);
                    setIsLoading(false);
                    Animated.spring(animatedValue, {
                        toValue: 1,
                        useNativeDriver: true,
                    }).start();
                }, 1000);

            } catch (error) {
                console.error("Socket initialization error:", error);
                Alert.alert("Connection Error", "Failed to connect to chat");
                setIsLoading(false);
            }
        };

        initializeSocket();

        // Cleanup function
        return () => {
            console.log("🧹 Cleaning up chat screen");
            clearTimeout(typingTimeoutRef.current);
            
            // Remove event listeners
            socketService.removeListener("connect");
            socketService.removeListener("disconnect");
            socketService.removeListener("receive_message");
            socketService.removeListener("typing");
            
        };
    }, [agencyId, userToken]);

    const onSend = useCallback((newMessages = []) => {
        if (!isConnected) {
            Alert.alert("Offline", "Message will send once reconnected.");
            return;
        }

        const message = newMessages[0];
        if (!message.text.trim()) return;

        const payload = {
            room: agencyId,
            sender: userToken,
            receiver: agencyId,
            content: message.text,
            senderModel: 'Student',
            receiverModel: 'Agency'
        };

        console.log("📤 Sending Payload:", payload);
        
        try {
            socketService.emit("send_message", payload);
            
            // Add message to local state immediately for instant feedback
            setMessages(prev => GiftedChat.append(prev, newMessages));
            
            // Clear typing indicator
            setIsTyping(false);
            
        } catch (error) {
            console.error("Error sending message:", error);
            Alert.alert("Send Error", "Failed to send message");
        }
    }, [agencyId, userToken, isConnected]);

    const handleTyping = () => {
        if (isConnected) {
            socketService.emit("typing", {
                room: agencyId,
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
                        borderRadius: 20,
                        marginBottom: 6,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        maxWidth: '80%',
                        marginRight: 4,
                        shadowColor: COLORS.primary,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 2,
                    },
                    left: {
                        backgroundColor: COLORS.receivedMsg,
                        borderRadius: 20,
                        marginBottom: 6,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        maxWidth: '80%',
                        marginLeft: 4,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 2,
                        elevation: 1,
                    },
                }}
                textStyle={{
                    right: {
                        color: '#fff',
                        fontSize: 15,
                        lineHeight: 20,
                    },
                    left: {
                        color: COLORS.textPrimary,
                        fontSize: 15,
                        lineHeight: 20,
                    },
                }}
                timeTextStyle={{
                    right: { color: 'rgba(255,255,255,0.7)' },
                    left: { color: COLORS.textSecondary },
                }}
                renderTime={(timeProps) => (
                    <View style={[
                        styles.timeContainer,
                        timeProps.position === 'right' ? styles.timeRight : styles.timeLeft
                    ]}>
                        <Text style={[
                            styles.timeText,
                            timeProps.position === 'right' ? styles.timeTextRight : styles.timeTextLeft
                        ]}>
                            {new Date(timeProps.currentMessage.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </Text>
                    </View>
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
                    color={(!props.text || props.text.trim().length === 0) ? '#A0AEC0' : COLORS.white}
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
                        <Text style={styles.typingText}>typing...</Text>
                    </View>
                </View>
            );
        }
        return null;
    };

    const handleScroll = ({ nativeEvent }) => {
        const offset = nativeEvent.contentOffset.y;
        setShowScrollButton(offset > 400);
    };

    const scrollToBottom = () => {
        if (chatRef.current) {
            chatRef.current.scrollToBottom();
        }
    };

    const renderEmptyChat = () => (
        <View style={styles.emptyChatContainer}>
            <View style={styles.emptyIllustration}>
                <Ionicons name="chatbubble-ellipses-outline" size={80} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>Start a conversation</Text>
            <Text style={styles.emptySubtitle}>
                Send your first message to {name || 'the agency'}
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

            {/* HEADER */}
            <Animated.View style={[
                styles.header,
                {
                    transform: [{
                        translateY: animatedValue.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-20, 0]
                        })
                    }],
                    opacity: animatedValue
                }
            ]}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                    activeOpacity={0.7}
                >
                    <Feather name="chevron-left" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.agencyInfo}
                    activeOpacity={0.8}
                    onPress={() => Alert.alert('Agency Info', `Chatting with ${name}`)}
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
                            { backgroundColor: isConnected ? COLORS.online : '#CBD5E0' }
                        ]} />
                    </View>

                    <View style={styles.headerContent}>
                        <Text style={styles.headerName} numberOfLines={1}>
                            {name || 'Agency Support'}
                        </Text>
                        <View style={styles.statusRow}>
                            <View style={[
                                styles.statusDot,
                                { backgroundColor: isConnected ? COLORS.online : '#CBD5E0' }
                            ]} />
                            <Text style={styles.headerStatus}>
                                {isConnected ? 'Active now' : 'Connecting...'}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                        <Feather name="phone" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                        <MaterialIcons name="more-vert" size={24} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* CHAT BODY */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <View style={styles.loadingContent}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Loading conversation...</Text>
                    </View>
                </View>
            ) : (
                <View style={styles.chatContainer}>
                    <GiftedChat
                        ref={chatRef}
                        messages={messages}
                        onSend={onSend}
                        user={{ _id: userToken, name: 'You' }}
                        renderBubble={renderBubble}
                        renderSend={renderSend}
                        renderInputToolbar={renderInputToolbar}
                        renderFooter={renderFooter}
                        placeholder="Type your message..."
                        alwaysShowSend
                        scrollToBottom
                        scrollToBottomComponent={() => (
                            <View style={styles.scrollBottom}>
                                <Feather name="chevron-down" size={20} color={COLORS.white} />
                            </View>
                        )}
                        renderAvatar={null}
                        infiniteScroll
                        onInputTextChanged={handleTyping}
                        timeTextStyle={{ fontSize: 12 }}
                        listViewProps={{
                            onScroll: handleScroll,
                            scrollEventThrottle: 16,
                        }}
                        minInputToolbarHeight={56}
                        textInputStyle={styles.textInput}
                        textInputProps={{
                            placeholderTextColor: '#A0AEC0',
                            multiline: true,
                            maxLength: 1000,
                        }}
                        renderEmpty={renderEmptyChat}
                    />
                </View>
            )}

            {/* SCROLL TO BOTTOM BUTTON */}
            {showScrollButton && messages.length > 0 && (
                <TouchableOpacity
                    style={styles.scrollToBottomButton}
                    onPress={scrollToBottom}
                    activeOpacity={0.8}
                >
                    <Feather name="arrow-down" size={20} color={COLORS.white} />
                </TouchableOpacity>
            )}

            {/* CONNECTION STATUS BANNER */}
            {!isConnected && !isLoading && (
                <View style={styles.connectionBanner}>
                    <Feather name="wifi-off" size={16} color="#fff" />
                    <Text style={styles.connectionText}>Connecting to chat...</Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 4,
        zIndex: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        marginRight: 12,
    },
    agencyInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    headerAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.background,
    },
    placeholderAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    avatarText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 18,
    },
    statusIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    headerContent: {
        flex: 1,
    },
    headerName: {
        fontSize: 17,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    headerStatus: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    loadingContent: {
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 15,
        color: COLORS.textSecondary,
    },
    chatContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    bubbleContainer: {
        flex: 1,
    },
    bubbleRight: {
        alignItems: 'flex-end',
    },
    bubbleLeft: {
        alignItems: 'flex-start',
    },
    timeContainer: {
        marginTop: 4,
        marginBottom: 8,
    },
    timeRight: {
        alignItems: 'flex-end',
        marginRight: 12,
    },
    timeLeft: {
        alignItems: 'flex-start',
        marginLeft: 12,
    },
    timeText: {
        fontSize: 11,
        opacity: 0.7,
    },
    timeTextRight: {
        color: 'rgba(255, 255, 255, 0.8)',
    },
    timeTextLeft: {
        color: COLORS.textSecondary,
    },
    inputToolbar: {
        marginHorizontal: 16,
        marginBottom: Platform.OS === 'ios' ? 20 : 12,
        marginTop: 8,
        borderRadius: 25,
        borderTopWidth: 0,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
        minHeight: 56,
        paddingHorizontal: 4,
    },
    inputPrimary: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    inputAccessory: {
        height: 44,
    },
    textInput: {
        fontSize: 16,
        lineHeight: 20,
        color: COLORS.textPrimary,
        paddingVertical: 8,
        paddingHorizontal: 12,
        maxHeight: 100,
        minHeight: 20,
        flex: 1,
    },
    sendContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        marginLeft: 4,
    },
    sendButton: {
        backgroundColor: COLORS.primary,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    sendButtonDisabled: {
        backgroundColor: '#E2E8F0',
        shadowOpacity: 0,
    },
    typingContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    typingBubble: {
        backgroundColor: COLORS.receivedMsg,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        maxWidth: '80%',
        borderWidth: 1,
        borderColor: COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
    },
    typingDots: {
        flexDirection: 'row',
        marginRight: 12,
    },
    typingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    typingDot1: {
        backgroundColor: '#C1C9D6',
    },
    typingDot2: {
        backgroundColor: '#A8B4C8',
        marginLeft: 4,
    },
    typingDot3: {
        backgroundColor: '#8FA0BA',
        marginLeft: 4,
    },
    typingText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
    },
    scrollToBottomButton: {
        position: 'absolute',
        bottom: 90,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
        zIndex: 100,
    },
    scrollBottom: {
        backgroundColor: COLORS.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    connectionBanner: {
        position: 'absolute',
        top: 80,
        left: 16,
        right: 16,
        backgroundColor: 'rgba(239, 68, 68, 0.9)',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    connectionText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    emptyChatContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyIllustration: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(118, 159, 205, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 15,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
});