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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Config } from '../config';

const COLORS = {
    primary: '#769FCD',
    primaryDark: '#5A7FA8',
    background: '#F8FAFD',
    white: '#FFFFFF',
    textPrimary: '#2D3748',
    textSecondary: '#718096',
    border: '#EEF2F7',
    userBubble: '#769FCD',
    botBubble: '#FFFFFF',
    error: '#EF4444',
    shadow: 'rgba(0, 0, 0, 0.1)',
};

const ChatBot = ({ agencyId }) => {
    const { userToken } = useAuth();
    const [isVisible, setIsVisible] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const flatListRef = useRef(null);
    
    // Floating button animation
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Pulse animation for the floating button
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.15,
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
        setIsLoading(true);

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
                    
                    // Small delay to show streaming effect
                    await new Promise(resolve => setTimeout(resolve, 50));
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
            setIsLoading(false);
        }
    };

    const renderMessage = ({ item }) => (
        <View
            style={[
                styles.messageBubble,
                item.isBot ? styles.botBubble : styles.userBubble,
            ]}
        >
            {item.isBot && (
                <View style={styles.botIconContainer}>
                    <View style={styles.botIcon}>
                        <MaterialCommunityIcons name="robot-outline" size={18} color={COLORS.white} />
                    </View>
                </View>
            )}
            <View style={[styles.messageContent, item.isBot ? styles.botContent : styles.userContent]}>
                <Text style={[styles.messageText, item.isBot ? styles.botText : styles.userText]}>
                    {item.text}
                </Text>
                {item.isStreaming && (
                    <View style={styles.streamingIndicator}>
                        <View style={styles.typingDots}>
                            <View style={[styles.dot, styles.dot1]} />
                            <View style={[styles.dot, styles.dot2]} />
                            <View style={[styles.dot, styles.dot3]} />
                        </View>
                    </View>
                )}
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
                                    inputRange: [1, 1.15],
                                    outputRange: [0.4, 0],
                                }),
                            },
                        ]}
                    />
                    <MaterialCommunityIcons name="robot-outline" size={30} color={COLORS.white} />
                </TouchableOpacity>
            </Animated.View>

            {/* Chat Modal */}
            <Modal
                visible={isVisible}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setIsVisible(false)}
            >
                <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
                    <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
                    
                    <View style={styles.modalContainer}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.headerContent}>
                                <View style={styles.headerLeft}>
                                    <View style={styles.headerIconContainer}>
                                        <MaterialCommunityIcons name="robot-outline" size={24} color={COLORS.white} />
                                    </View>
                                    <View style={styles.headerText}>
                                        <Text style={styles.modalTitle}>AI Assistant</Text>
                                        <View style={styles.statusContainer}>
                                            <View style={styles.onlineIndicator} />
                                            <Text style={styles.modalSubtitle}>Online</Text>
                                        </View>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={() => setIsVisible(false)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="close" size={26} color={COLORS.textPrimary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <KeyboardAvoidingView
                            style={styles.keyboardView}
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            keyboardVerticalOffset={Platform.OS === 'ios' ? 130 : 0}
                        >
                            {/* Messages List */}
                            <View style={styles.messagesContainer}>
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
                                />
                            </View>

                            {/* Input Area */}
                            <View style={styles.inputWrapper}>
                                <View style={styles.inputContainer}>
                                    <View style={styles.inputContent}>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Type your message..."
                                            placeholderTextColor={COLORS.textSecondary}
                                            value={inputText}
                                            onChangeText={setInputText}
                                            multiline
                                            maxLength={500}
                                            editable={!isLoading}
                                        />
                                        <TouchableOpacity
                                            style={[
                                                styles.sendButton,
                                                (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
                                            ]}
                                            onPress={sendMessage}
                                            disabled={!inputText.trim() || isLoading}
                                            activeOpacity={0.8}
                                        >
                                            {isLoading ? (
                                                <ActivityIndicator size="small" color={COLORS.white} />
                                            ) : (
                                                <Ionicons 
                                                    name="send" 
                                                    size={20} 
                                                    color={COLORS.white} 
                                                    style={styles.sendIcon}
                                                />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
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
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
    },
    pulseRing: {
        position: 'absolute',
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.primary,
    },
    
    // Modal Container Styles
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    keyboardView: {
        flex: 1,
    },
    
    // Header Styles
    modalHeader: {
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        elevation: 2,
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    headerIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
        elevation: 2,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    headerText: {
        flex: 1,
    },
    modalTitle: {
        fontSize: 19,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 4,
        letterSpacing: 0.2,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    onlineIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981',
        marginRight: 6,
    },
    modalSubtitle: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    closeButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 22,
        backgroundColor: COLORS.background,
    },
    
    // Messages Container Styles
    messagesContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    messagesList: {
        padding: 20,
        paddingBottom: 10,
        flexGrow: 1,
    },
    messageBubble: {
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    botBubble: {
        alignSelf: 'flex-start',
        maxWidth: '85%',
    },
    userBubble: {
        alignSelf: 'flex-end',
        maxWidth: '85%',
        flexDirection: 'row-reverse',
    },
    botIconContainer: {
        marginRight: 10,
        marginBottom: 2,
    },
    botIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    messageContent: {
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        elevation: 1,
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    botContent: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderBottomLeftRadius: 6,
    },
    userContent: {
        backgroundColor: COLORS.userBubble,
        borderBottomRightRadius: 6,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
        letterSpacing: 0.2,
    },
    botText: {
        color: COLORS.textPrimary,
    },
    userText: {
        color: COLORS.white,
    },
    
    // Streaming Indicator Styles
    streamingIndicator: {
        marginTop: 8,
    },
    typingDots: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.primary,
        marginHorizontal: 2,
    },
    
    // Input Area Styles
    inputWrapper: {
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        elevation: 8,
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    inputContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    inputContent: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: COLORS.background,
        borderRadius: 28,
        paddingLeft: 18,
        paddingRight: 6,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: COLORS.textPrimary,
        maxHeight: 100,
        paddingTop: 10,
        paddingBottom: 10,
        paddingRight: 10,
        letterSpacing: 0.2,
    },
    sendButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    sendButtonDisabled: {
        backgroundColor: COLORS.textSecondary,
        opacity: 0.4,
        elevation: 0,
        shadowOpacity: 0,
    },
    sendIcon: {
        marginLeft: 2,
    },
});

export default ChatBot;