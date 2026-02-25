import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Animated,
    StatusBar,
    Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Config } from '../config';

const COLORS = {
    primary: '#769FCD',
    primaryDark: '#5A7FA8',
    primaryLight: '#8FB6E0',
    primarySoft: '#E8F0FE',
    background: '#F8FAFC',
    white: '#FFFFFF',
    textPrimary: '#1E293B',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    userBubble: '#769FCD',
    botBubble: '#FFFFFF',
    error: '#EF4444',
    inputBg: '#F1F5F9',
    shadow: 'rgba(0, 0, 0, 0.05)',
    online: '#10B981',
};

const ChatBot = ({ agencyId }) => {
    const { userToken } = useAuth();
    const [isVisible, setIsVisible] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isBotTyping, setIsBotTyping] = useState(false);
    const flatListRef = useRef(null);
    const inputRef = useRef(null);
    
    // Floating button animation
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Pulse animation for the floating button
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    useEffect(() => {
        // Add welcome message when chat opens
        if (isVisible && messages.length === 0) {
            setMessages([
                {
                    id: '1',
                    text: "Hi! I'm your educational assistant. How can I help you today? You can ask me about courses, scholarships, events, or any other questions you have!",
                    isBot: true,
                    timestamp: new Date(),
                },
            ]);
        }
    }, [isVisible]);

    const handlePress = () => {
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 0.9,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start();
        setIsVisible(true);
    };

    const parseSSEResponse = (text) => {
        const lines = text.split('\n');
        const messages = [];
        
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                try {
                    const jsonStr = line.slice(6);
                    const data = JSON.parse(jsonStr);
                    messages.push(data);
                } catch (e) {
                    console.error('Error parsing SSE line:', e);
                }
            }
        }
        
        return messages;
    };

    const sendMessage = async () => {
        if (!inputText.trim()) return;

        const userMessage = {
            id: Date.now().toString(),
            text: inputText,
            isBot: false,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setIsBotTyping(true);

        // Scroll to bottom after user message
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        try {
            const response = await fetch(`${Config.API_BASE_URL}/openai/chatbot`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: inputText,
                    agencyId: agencyId,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get response from chatbot');
            }

            // Get the response as text
            const responseText = await response.text();
            
            // Parse the SSE events from the text
            const events = parseSSEResponse(responseText);
            
            let botResponse = '';
            let botMessageId = (Date.now() + 1).toString();

            // Add initial bot message with empty text
            setMessages(prev => [
                ...prev,
                {
                    id: botMessageId,
                    text: '',
                    isBot: true,
                    timestamp: new Date(),
                    isStreaming: true,
                },
            ]);

            // Process each event
            for (const event of events) {
                if (event.type === 'token' && event.text) {
                    botResponse += event.text;
                    
                    // Update the bot message with accumulated text
                    setMessages(prev =>
                        prev.map(msg =>
                            msg.id === botMessageId
                                ? { ...msg, text: botResponse }
                                : msg
                        )
                    );
                    
                    // Scroll to bottom as text streams in
                    flatListRef.current?.scrollToEnd({ animated: true });
                    
                    // Small delay to show streaming effect
                    await new Promise(resolve => setTimeout(resolve, 30));
                } else if (event.type === 'done') {
                    // Mark streaming as complete
                    setMessages(prev =>
                        prev.map(msg =>
                            msg.id === botMessageId
                                ? { ...msg, isStreaming: false }
                                : msg
                        )
                    );
                }
            }
        } catch (error) {
            console.error('Chatbot error:', error);
            const errorMessage = {
                id: (Date.now() + 1).toString(),
                text: "I'm sorry, I encountered an error. Please try again.",
                isBot: true,
                timestamp: new Date(),
                isError: true,
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsBotTyping(false);
        }
    };

    const renderMessage = ({ item }) => {
        const isBot = item.isBot;
        
        return (
            <View style={[styles.messageRow, !isBot && styles.messageRowRight]}>
                {isBot && (
                    <View style={styles.avatarContainer}>
                        <View style={[styles.avatarFallback, { backgroundColor: COLORS.primaryLight }]}>
                            <Ionicons name="chatbubble-outline" size={14} color={COLORS.primary} />
                        </View>
                    </View>
                )}
                <View style={[styles.messageWrapper, !isBot && styles.messageWrapperRight]}>
                    <View style={[
                        styles.bubble, 
                        isBot ? styles.botBubble : styles.userBubble,
                        item.isError && styles.errorBubble
                    ]}>
                        <Text style={[
                            styles.bubbleText,
                            !isBot && styles.userBubbleText
                        ]}>
                            {item.text}
                        </Text>
                        <View style={styles.bubbleFooter}>
                            <Text style={[styles.time, !isBot && styles.userTime]}>
                                {new Date(item.timestamp).toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                })}
                            </Text>
                            {item.isStreaming && (
                                <View style={styles.typingIndicator}>
                                    <View style={[styles.typingDot, styles.dot1]} />
                                    <View style={[styles.typingDot, styles.dot2]} />
                                    <View style={[styles.typingDot, styles.dot3]} />
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    const renderTypingIndicator = () => (
        <View style={styles.messageRow}>
            <View style={styles.avatarContainer}>
                <View style={[styles.avatarFallback, { backgroundColor: COLORS.primaryLight }]}>
                    <Ionicons name="chatbubble-outline" size={14} color={COLORS.primary} />
                </View>
            </View>
            <View style={styles.messageWrapper}>
                <View style={[styles.bubble, styles.botBubble, styles.typingBubble]}>
                    <View style={styles.typingIndicator}>
                        <View style={[styles.typingDot, styles.dot1]} />
                        <View style={[styles.typingDot, styles.dot2]} />
                        <View style={[styles.typingDot, styles.dot3]} />
                    </View>
                </View>
            </View>
        </View>
    );

    return (
        <>
            {/* Floating Chat Button */}
            <Animated.View
                style={[
                    styles.floatingButton,
                    {
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                <TouchableOpacity
                    style={styles.floatingButtonInner}
                    onPress={handlePress}
                    activeOpacity={0.8}
                >
                    <Animated.View 
                        style={[
                            styles.pulseRing,
                            {
                                transform: [{ scale: pulseAnim }],
                                opacity: pulseAnim.interpolate({
                                    inputRange: [1, 1.1],
                                    outputRange: [0.3, 0],
                                }),
                            },
                        ]}
                    />
                    <Ionicons name="chatbubble-outline" size={26} color={COLORS.white} />
                </TouchableOpacity>
            </Animated.View>

            {/* Chat Modal */}
            <Modal
                visible={isVisible}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setIsVisible(false)}
            >
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
                    
                    {/* ✅ KeyboardAvoidingView wraps EVERYTHING below the header */}
                    <KeyboardAvoidingView
                        style={styles.keyboardAvoidingContainer}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        // On iOS, adjust this offset to match your header height if needed
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                    >
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity style={styles.backBtn} onPress={() => setIsVisible(false)}>
                                <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
                            </TouchableOpacity>
                            
                            <View style={styles.headerInfo}>
                                <View style={[styles.headerAvatar, { backgroundColor: COLORS.primaryLight }]}>
                                    <Ionicons name="chatbubble-outline" size={20} color={COLORS.primary} />
                                </View>
                                <View style={styles.headerText}>
                                    <Text style={styles.headerName} numberOfLines={1}>AI Assistant</Text>
                                    <View style={styles.headerStatusContainer}>
                                        <View style={[styles.statusDot, { backgroundColor: COLORS.online }]} />
                                        <Text style={styles.headerStatus}>Online</Text>
                                    </View>
                                </View>
                            </View>
                            
                            <View style={{ width: 40 }} />
                        </View>

                        {/* ✅ FlatList with flex: 1 so it shrinks when keyboard appears */}
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            renderItem={renderMessage}
                            keyExtractor={item => item.id}
                            contentContainerStyle={styles.messagesList}
                            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="interactive"
                            ListFooterComponent={isBotTyping ? renderTypingIndicator : null}
                            style={styles.flatList}
                        />

                        {/* ✅ Input Area — no longer wrapped in its own KeyboardAvoidingView */}
                        <View style={styles.inputWrapper}>
                            <View style={styles.inputContainer}>
                                <View style={styles.inputContent}>
                                    <TextInput
                                        ref={inputRef}
                                        style={styles.input}
                                        placeholder="Type your message..."
                                        placeholderTextColor={COLORS.textSecondary}
                                        value={inputText}
                                        onChangeText={setInputText}
                                        multiline
                                        maxLength={500}
                                        editable={!isBotTyping}
                                        returnKeyType="send"
                                        onSubmitEditing={sendMessage}
                                    />
                                    <TouchableOpacity
                                        style={[
                                            styles.sendButton,
                                            (!inputText.trim() || isBotTyping) && styles.sendButtonDisabled,
                                        ]}
                                        onPress={sendMessage}
                                        disabled={!inputText.trim() || isBotTyping}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="send" size={18} color={COLORS.white} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    // Floating Button Styles
    floatingButton: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        zIndex: 1000,
    },
    floatingButtonInner: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
    },
    pulseRing: {
        position: 'absolute',
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.primary,
    },
    
    // Modal / SafeArea
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.white,
    },

    // ✅ KeyboardAvoidingView fills remaining space and manages layout
    keyboardAvoidingContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    // ✅ FlatList must have flex: 1 to compress when keyboard shows
    flatList: {
        flex: 1,
    },
    
    // Header Styles
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    headerText: {
        flex: 1,
    },
    headerName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    headerStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 4,
    },
    headerStatus: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    
    // Messages Container
    messagesList: {
        padding: 16,
        paddingBottom: 8,
        flexGrow: 1,
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: 12,
        alignItems: 'flex-end',
    },
    messageRowRight: {
        justifyContent: 'flex-end',
    },
    avatarContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        marginRight: 8,
        overflow: 'hidden',
    },
    avatarFallback: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messageWrapper: {
        maxWidth: '75%',
    },
    messageWrapperRight: {
        alignItems: 'flex-end',
    },
    bubble: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 18,
        elevation: 1,
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    botBubble: {
        backgroundColor: COLORS.botBubble,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    userBubble: {
        backgroundColor: COLORS.userBubble,
        borderBottomRightRadius: 4,
    },
    errorBubble: {
        backgroundColor: '#FEE2E2',
        borderColor: '#FECACA',
    },
    bubbleText: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 4,
        color: COLORS.textPrimary,
    },
    userBubbleText: {
        color: COLORS.white,
    },
    bubbleFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    time: {
        fontSize: 10,
        color: COLORS.textSecondary,
    },
    userTime: {
        color: 'rgba(255,255,255,0.7)',
    },
    
    // Typing Indicator
    typingBubble: {
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    typingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 4,
    },
    typingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.primary,
        marginHorizontal: 2,
        opacity: 0.6,
    },
    dot1: {},
    dot2: {},
    dot3: {},
    
    // Input Area
    inputWrapper: {
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    inputContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    inputContent: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: COLORS.inputBg,
        borderRadius: 24,
        paddingLeft: 16,
        paddingRight: 4,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    input: {
        flex: 1,
        fontSize: 14,
        color: COLORS.textPrimary,
        maxHeight: 100,
        paddingTop: 8,
        paddingBottom: 8,
        paddingRight: 8,
    },
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
    },
    sendButtonDisabled: {
        backgroundColor: COLORS.textSecondary,
        opacity: 0.4,
    },
});

export default ChatBot;