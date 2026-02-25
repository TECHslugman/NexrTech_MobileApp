import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, StyleSheet, Text, TouchableOpacity, StatusBar, Image,
    Platform, KeyboardAvoidingView, ActivityIndicator, FlatList,
    TextInput, Alert, Modal, Keyboard,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import socketService from '../../../services/SocketService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Config } from '../../../config';

// ═══════════════════════════════════════════════════════════
//  THEME
// ═══════════════════════════════════════════════════════════

const C = {
    primary:       '#769FCD',
    bg:            '#F8FAFC',
    white:         '#FFFFFF',
    textPrimary:   '#1E293B',
    textSecondary: '#64748B',
    border:        '#E2E8F0',
    sentBubble:    '#769FCD',
    recvBubble:    '#FFFFFF',
    offline:       '#EF4444',
    warning:       '#F59E0B',
    inputBg:       '#F1F5F9',
};

const PAGE_SIZE = 20;

function fmtTime(d) {
    return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function validStr(v) {
    if (!v) return null;
    const s = String(v).trim();
    return (s === '' || s === 'undefined' || s === 'null') ? null : s;
}

// ═══════════════════════════════════════════════════════════
//  EDIT MESSAGE MODAL
// ═══════════════════════════════════════════════════════════

function EditMessageModal({ visible, initialText, onSave, onCancel }) {
    const [text, setText] = useState(initialText || '');

    useEffect(() => {
        if (visible) setText(initialText || '');
    }, [visible, initialText]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={modalStyles.overlay}>
                <View style={modalStyles.sheet}>
                    <Text style={modalStyles.title}>Edit Message</Text>
                    <TextInput
                        style={modalStyles.input}
                        value={text}
                        onChangeText={setText}
                        multiline
                        maxLength={500}
                        autoFocus
                        placeholder="Type your message…"
                        placeholderTextColor={C.textSecondary}
                    />
                    <View style={modalStyles.actions}>
                        <TouchableOpacity style={modalStyles.btnCancel} onPress={onCancel}>
                            <Text style={modalStyles.btnCancelTxt}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[modalStyles.btnSave, !text.trim() && modalStyles.btnSaveDisabled]}
                            onPress={() => text.trim() && onSave(text.trim())}
                            disabled={!text.trim()}
                        >
                            <Text style={modalStyles.btnSaveTxt}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const modalStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    sheet: {
        width: '100%',
        backgroundColor: C.white,
        borderRadius: 16,
        padding: 20,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: C.textPrimary,
        marginBottom: 14,
    },
    input: {
        backgroundColor: C.inputBg,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
        color: C.textPrimary,
        borderWidth: 1,
        borderColor: C.border,
        minHeight: 80,
        maxHeight: 160,
        textAlignVertical: 'top',
        marginBottom: 16,
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
        justifyContent: 'flex-end',
    },
    btnCancel: {
        paddingHorizontal: 18,
        paddingVertical: 9,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: C.border,
    },
    btnCancelTxt: {
        fontSize: 14,
        color: C.textSecondary,
        fontWeight: '500',
    },
    btnSave: {
        paddingHorizontal: 18,
        paddingVertical: 9,
        borderRadius: 8,
        backgroundColor: C.primary,
    },
    btnSaveDisabled: {
        opacity: 0.4,
    },
    btnSaveTxt: {
        fontSize: 14,
        color: C.white,
        fontWeight: '600',
    },
});

// ═══════════════════════════════════════════════════════════
//  COMPONENT
// ═══════════════════════════════════════════════════════════

export default function ChatScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const myId   = String(user?.id || user?._id || '');

    // Always-fresh refs (no stale closure issues)
    const recipientIdRef    = useRef(validStr(params.recipientId));
    const recipientModelRef = useRef(validStr(params.recipientModel));
    const activeConvIdRef   = useRef(validStr(params.conversationId));

    // Track seen messages
    const seenMessagesRef = useRef(new Set());

    // Sync params → refs when they change
    useEffect(() => {
        const rid  = validStr(params.recipientId);
        const rmod = validStr(params.recipientModel);
        const cid  = validStr(params.conversationId);
        if (rid)  recipientIdRef.current    = rid;
        if (rmod) recipientModelRef.current = rmod;
        if (cid)  activeConvIdRef.current   = cid;
    }, [params.recipientId, params.recipientModel, params.conversationId]);

    const name = validStr(params.name) || 'Support';
    const logo = validStr(params.logo) || '';

    const [messages,      setMessages]      = useState([]);
    const [inputText,     setInputText]     = useState('');
    const [isLoading,     setIsLoading]     = useState(!!validStr(params.conversationId));
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isConnected,   setIsConnected]   = useState(socketService.isConnected());
    const [hasMore,       setHasMore]       = useState(false);
    const [isTyping,      setIsTyping]      = useState(false);
    const [isRequesting, setIsRequesting] = useState(false);

    // ── Edit modal state ──
    const [editModal, setEditModal] = useState({ visible: false, msgId: null, text: '' });

    const flatListRef     = useRef(null);
    const oldestCursorRef = useRef(null);
    const loadingMoreRef  = useRef(false);
    const mountedRef      = useRef(false);
    const fetchedRef      = useRef(false);
    const lastTempIdRef   = useRef(null);
    const typingTimerRef  = useRef(null);
    const localTypingRef  = useRef(false);
    const requestTimeoutRef = useRef(null);

    // ── Format raw server message → local shape ──
    const formatMsg = useCallback((raw, forceIsMe = false) => {
        const senderId    = raw.sender    || raw.senderId    || '';
        const senderModel = raw.senderModel || raw.senderInfo?.model || '';
        const isMe = forceIsMe
            || String(senderId) === myId
            || senderModel === 'Student';

        let status = 'sent';
        if (!isMe) {
            status = 'delivered';
        } else if (raw.status && raw.status !== 'pending') {
            status = raw.status;
        }

        // Handle deleted messages
        if (raw.isDeleted) {
            return {
                id:         String(raw._id || raw.id),
                text:       'This message was deleted',
                createdAt:  raw.createdAt ? new Date(raw.createdAt) : new Date(),
                isMe,
                senderName: raw.senderInfo?.name || '',
                status:     'deleted',
                isEdited:   raw.isEdited || false,
                isDeleted:  true,
                deletedFor: raw.deletedFor || 'everyone',
            };
        }

        return {
            id:         String(raw._id || raw.id),
            text:       raw.content || '',
            createdAt:  raw.createdAt ? new Date(raw.createdAt) : new Date(),
            isMe,
            senderName: raw.senderInfo?.name || '',
            status,
            isEdited:   raw.isEdited || false,
            isDeleted:  false,
        };
    }, [myId]);

    // ── Mark messages as seen ──
    const markMessagesAsSeen = useCallback(() => {
        const convId = activeConvIdRef.current;
        if (!convId || !socketService.isConnected()) return;

        const unseenMessages = messages.filter(
            msg => !msg.isMe && msg.status !== 'seen' && !msg.isDeleted
        );

        if (unseenMessages.length === 0) return;

        console.log(`👁️ Marking ${unseenMessages.length} messages as seen`);
        
        setMessages(prev => 
            prev.map(msg => 
                !msg.isMe && msg.status !== 'seen' && !msg.isDeleted
                    ? { ...msg, status: 'seen' }
                    : msg
            )
        );
    }, [messages]);

    // ── Request messages from server ──
    const fetchInitialMessages = useCallback(() => {
        const convId = activeConvIdRef.current;
        if (!convId) {
            console.log('No conversation ID yet');
            return;
        }
        if (fetchedRef.current) return;
        if (!socketService.isConnected()) return;

        fetchedRef.current = true;
        console.log(`📥 Fetching initial messages for conversation: ${convId}`);
        socketService.getConversationMessages(convId, null, null, PAGE_SIZE);
    }, []);

    // ── Request auto message for this recipient ──
    const requestAutoMessage = useCallback(() => {
        const recipientId = recipientIdRef.current;
        const recipientModel = recipientModelRef.current;
        
        if (!recipientId || !recipientModel || activeConvIdRef.current || isRequesting) {
            return;
        }

        console.log(`🔄 Requesting auto message for ${recipientId} (${recipientModel})`);
        setIsRequesting(true);
        setIsLoading(true);

        // Clear any existing timeout
        if (requestTimeoutRef.current) {
            clearTimeout(requestTimeoutRef.current);
        }

        // Set a timeout to stop loading if no response
        requestTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current && !activeConvIdRef.current) {
                console.log('⚠️ No auto message received, showing empty chat');
                setIsLoading(false);
                setIsRequesting(false);
            }
        }, 10000);

        // Emit get_conversation_messages with the recipient ID
        // The backend should create/return the conversation and auto message
        socketService.getConversationMessages(recipientId, null, null, PAGE_SIZE);
        
    }, []);

    const loadMore = useCallback(() => {
        if (!hasMore || loadingMoreRef.current || !oldestCursorRef.current) return;

        const convId = activeConvIdRef.current;
        if (!convId) return;

        loadingMoreRef.current = true;
        setIsLoadingMore(true);

        socketService.getConversationMessages(
            convId,
            oldestCursorRef.current.createdAt,
            oldestCursorRef.current.id,
            PAGE_SIZE,
        );
    }, [hasMore]);

    // ── Typing handling ──
    const handleInputChange = useCallback((text) => {
        setInputText(text);

        const rid = recipientIdRef.current;
        const cid = activeConvIdRef.current;

        if (!rid || !socketService.isConnected()) return;

        if (text.length > 0 && !localTypingRef.current) {
            localTypingRef.current = true;
            socketService.emitTypingStart(rid, cid);
        }

        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

        typingTimerRef.current = setTimeout(() => {
            if (localTypingRef.current) {
                localTypingRef.current = false;
                socketService.emitTypingStop(rid, cid);
            }
        }, 2000);

        if (text.length === 0 && localTypingRef.current) {
            localTypingRef.current = false;
            clearTimeout(typingTimerRef.current);
            socketService.emitTypingStop(rid, cid);
        }
    }, []);

    // ── Force refresh messages after delete ──
    const refreshMessages = useCallback(() => {
        const convId = activeConvIdRef.current;
        if (!convId || !socketService.isConnected()) return;
        
        console.log('🔄 Refreshing messages after delete');
        fetchedRef.current = false; // Reset so we fetch again
        socketService.getConversationMessages(convId, null, null, PAGE_SIZE);
    }, []);

    // ── Main effect ──
    useEffect(() => {
        mountedRef.current = true;
        fetchedRef.current = false;

        // If we have recipient but no conversation ID, request auto message
        if (!activeConvIdRef.current && recipientIdRef.current) {
            requestAutoMessage();
        }

        const unsubConn = socketService.onConnectionChange(connected => {
            if (!mountedRef.current) return;
            setIsConnected(connected);
            if (connected) {
                if (activeConvIdRef.current) {
                    fetchInitialMessages();
                } else if (recipientIdRef.current) {
                    requestAutoMessage();
                }
            }
        });

        const unsubMsgs = socketService.onConversationMessages(data => {
            if (!mountedRef.current) return;

            console.log('📥 Received conversation_messages:', data);

            // If this is the auto message response and we don't have a conversation ID yet
            if (!activeConvIdRef.current && data?.conversationId) {
                console.log('🎯 Setting conversation ID from auto message:', data.conversationId);
                activeConvIdRef.current = data.conversationId;
                
                // Clear the timeout
                if (requestTimeoutRef.current) {
                    clearTimeout(requestTimeoutRef.current);
                    requestTimeoutRef.current = null;
                }
            }

            if (!data?.messages) {
                setIsLoading(false);
                setIsRequesting(false);
                loadingMoreRef.current = false;
                setIsLoadingMore(false);
                return;
            }

            const formatted = data.messages.map(m => formatMsg(m));
            setHasMore(data.hasNextPage ?? data.hasMore ?? false);

            if (formatted.length > 0) {
                oldestCursorRef.current = {
                    id:        formatted[0].id,
                    createdAt: formatted[0].createdAt.toISOString(),
                };
            }

            if (loadingMoreRef.current) {
                setMessages(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const fresh = formatted.filter(m => !existingIds.has(m.id));
                    return [...fresh, ...prev];
                });
                loadingMoreRef.current = false;
                setIsLoadingMore(false);
            } else {
                setMessages(formatted);
                setIsLoading(false);
                setIsRequesting(false);
                setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: false });
                    markMessagesAsSeen();
                }, 150);
            }
        });

        const unsubNew = socketService.onNewMessage(payload => {
            if (!mountedRef.current) return;

            const msg    = payload.message || payload;
            const convId = String(payload.conversationId || msg.conversationId || '');

            console.log('📥 New message received:', msg);

            // Auto message - if we don't have conversation ID yet, this is it!
            if (!activeConvIdRef.current && convId) {
                console.log('🎯 Setting conversation ID from new message:', convId);
                activeConvIdRef.current = convId;
                
                // Clear the timeout
                if (requestTimeoutRef.current) {
                    clearTimeout(requestTimeoutRef.current);
                    requestTimeoutRef.current = null;
                }
                
                fetchedRef.current = false; // Reset so we fetch messages
                fetchInitialMessages();
                setIsLoading(false);
                setIsRequesting(false);
                return; // Don't add the message yet, fetch will get it
            }

            if (
                convId &&
                activeConvIdRef.current &&
                String(convId) !== String(activeConvIdRef.current)
            ) {
                return;
            }

            const senderId      = String(msg.sender || msg.senderId || '');
            const myRecipientId = recipientIdRef.current;

            if (!activeConvIdRef.current && myRecipientId && senderId !== myRecipientId) {
                return;
            }

            const formatted = formatMsg(msg);

            setMessages(prev => {
                if (prev.some(m => m.id === formatted.id)) return prev;
                return [...prev, formatted];
            });

            setIsTyping(false);
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
                if (!formatted.isMe) {
                    markMessagesAsSeen();
                }
            }, 80);
        });

        const unsubSent = socketService.onMessageSent(payload => {
            if (!mountedRef.current) return;

            const msg    = payload.message || payload;
            const convId = String(payload.conversationId || msg.conversationId || '');

            if (convId && !activeConvIdRef.current) {
                activeConvIdRef.current = convId;
            }

            setMessages(prev => {
                const tempId = lastTempIdRef.current;
                let idx = tempId ? prev.findIndex(m => m.id === tempId) : -1;

                if (idx === -1) {
                    idx = prev.findIndex(m => m.status === 'pending');
                }

                if (idx === -1) return prev;

                if (lastTempIdRef.current === prev[idx].id) {
                    lastTempIdRef.current = null;
                }

                const next      = [...prev];
                const confirmed = formatMsg(msg, true);
                next[idx]       = { ...confirmed, text: prev[idx].text, status: 'sent' };
                return next;
            });
        });

        const unsubErr = socketService.onMessageError(err => {
            if (!mountedRef.current) return;

            setIsLoading(false);
            setIsRequesting(false);
            loadingMoreRef.current = false;
            setIsLoadingMore(false);
            lastTempIdRef.current = null;

            setMessages(prev =>
                prev.map(m => (m.status === 'pending' ? { ...m, status: 'failed' } : m))
            );

            Toast.show({
                type:  'error',
                text1: 'Message failed',
                text2: err?.error || err?.message || 'Please try again.',
            });
        });

        const unsubEdited = socketService.onMessageEdited(edited => {
            if (!mountedRef.current) return;
            const msgId = String(edited._id || edited.id || '');
            setMessages(prev =>
                prev.map(m =>
                    m.id === msgId
                        ? { ...m, text: edited.content, isEdited: true }
                        : m
                )
            );
        });

        // FIX: Immediate delete handling with refresh
        const unsubDeleted = socketService.onMessageDeleted(data => {
            if (!mountedRef.current) return;
            
            const msgId = String(data.messageId || '');
            const convId = String(data.conversationId || '');
            const deleteFor = data.deleteFor || 'me';
            
            console.log(`📥 message_deleted: ${msgId} for ${deleteFor}`);
            
            setMessages(prev => {
                const newMessages = [...prev];
                const index = newMessages.findIndex(m => m.id === msgId);
                
                if (index !== -1) {
                    if (deleteFor === 'everyone') {
                        newMessages[index] = {
                            ...newMessages[index],
                            isDeleted: true,
                            text: 'This message was deleted',
                            status: 'deleted',
                            deletedFor: 'everyone'
                        };
                    } else {
                        newMessages.splice(index, 1);
                    }
                }
                
                return newMessages;
            });

            setMessages(current => {
                return current.map(msg => msg);
            });

            setTimeout(() => {
                refreshMessages();
            }, 100);
        });

        const unsubTyping = socketService.onUserTyping(data => {
            if (!mountedRef.current) return;
            const cid = activeConvIdRef.current;
            if (cid && data.conversationId && String(data.conversationId) !== String(cid)) return;
            setIsTyping(true);
        });

        const unsubStopTyping = socketService.onUserStoppedTyping(data => {
            if (!mountedRef.current) return;
            const cid = activeConvIdRef.current;
            if (cid && data.conversationId && String(data.conversationId) !== String(cid)) return;
            setIsTyping(false);
        });

        const unsubStatus = socketService.onMessageStatusUpdated(({ messageId, status, conversationId }) => {
            if (!mountedRef.current) return;
            
            const convId = activeConvIdRef.current;
            if (convId && String(conversationId) !== String(convId)) return;
            
            console.log(`📥 message_status_updated: ${messageId} is ${status}`);
            
            setMessages(prev =>
                prev.map(m =>
                    m.id === messageId
                        ? { ...m, status }
                        : m
                )
            );
        });

        // If socket is already connected, request auto message
        if (socketService.isConnected() && !activeConvIdRef.current && recipientIdRef.current) {
            requestAutoMessage();
        }

        return () => {
            mountedRef.current = false;

            if (requestTimeoutRef.current) {
                clearTimeout(requestTimeoutRef.current);
            }

            if (localTypingRef.current) {
                const rid = recipientIdRef.current;
                const cid = activeConvIdRef.current;
                if (rid) socketService.emitTypingStop(rid, cid);
                localTypingRef.current = false;
            }

            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

            unsubConn();
            unsubMsgs();
            unsubNew();
            unsubSent();
            unsubErr();
            unsubEdited();
            unsubDeleted();
            unsubTyping();
            unsubStopTyping();
            unsubStatus();
        };
    }, []);

    // Effect to mark messages as seen
    useEffect(() => {
        if (messages.length > 0 && !isLoading) {
            markMessagesAsSeen();
        }
    }, [messages.length, isLoading]);

    // ── Send message ──
    const sendMessage = useCallback(() => {
        const text     = inputText.trim();
        const receiver = recipientIdRef.current    || validStr(params.recipientId);
        const model    = recipientModelRef.current || validStr(params.recipientModel);
        const convId   = activeConvIdRef.current   || validStr(params.conversationId) || null;

        if (!text || !isConnected) return;

        if (!receiver || !model) {
            Toast.show({ type: 'error', text1: 'Cannot send', text2: 'Recipient info missing.' });
            return;
        }

        if (localTypingRef.current) {
            localTypingRef.current = false;
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
            socketService.emitTypingStop(receiver, convId);
        }

        const tempId = `pending_${Date.now()}`;
        lastTempIdRef.current = tempId;

        const tempMsg = {
            id:        tempId,
            text,
            createdAt: new Date(),
            isMe:      true,
            status:    'pending',
            isDeleted: false,
        };

        setInputText('');
        setMessages(prev => [...prev, tempMsg]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        socketService.sendMessage(receiver, model, text, convId);
    }, [inputText, isConnected, params.recipientId, params.recipientModel, params.conversationId]);

    // ── Retry failed message ──
    const retryMessage = useCallback((msg) => {
        if (!isConnected) return;

        const receiver = recipientIdRef.current    || validStr(params.recipientId);
        const model    = recipientModelRef.current || validStr(params.recipientModel);
        const convId   = activeConvIdRef.current   || validStr(params.conversationId) || null;

        setMessages(prev => prev.filter(m => m.id !== msg.id));

        const tempId = `pending_${Date.now()}`;
        lastTempIdRef.current = tempId;

        setMessages(prev => [...prev, { ...msg, id: tempId, status: 'pending' }]);
        socketService.sendMessage(receiver, model, msg.text, convId);
    }, [isConnected, params.recipientId, params.recipientModel, params.conversationId]);

    // ── Long press menu ──
    const handleLongPress = useCallback((msg) => {
        if (msg.status === 'failed') {
            retryMessage(msg);
            return;
        }

        if (!msg.isMe) return;

        Alert.alert(
            'Message Options',
            '',
            [
                {
                    text: 'Edit',
                    onPress: () => {
                        Keyboard.dismiss();
                        setEditModal({ visible: true, msgId: msg.id, text: msg.text });
                    },
                },
                {
                    text: 'Delete for me',
                    onPress: () => socketService.deleteMessage(msg.id, 'me'),
                },
                {
                    text: 'Delete for everyone',
                    style: 'destructive',
                    onPress: () => socketService.deleteMessage(msg.id, 'everyone'),
                },
                { text: 'Cancel', style: 'cancel' },
            ],
            { cancelable: true }
        );
    }, [retryMessage]);

    const handleEditSave = useCallback((newText) => {
        if (newText && editModal.msgId) {
            socketService.editMessage(editModal.msgId, newText);
            setMessages(prev =>
                prev.map(m =>
                    m.id === editModal.msgId
                        ? { ...m, text: newText, isEdited: true }
                        : m
                )
            );
        }
        setEditModal({ visible: false, msgId: null, text: '' });
    }, [editModal.msgId]);

    const handleEditCancel = useCallback(() => {
        setEditModal({ visible: false, msgId: null, text: '' });
    }, []);

    // ── Render message bubble ──
    const renderMessage = useCallback(({ item }) => {
        const isMe = item.isMe;

        if (item.isDeleted) {
            return (
                <View style={[styles.msgRow, isMe && styles.msgRowRight]}>
                    {!isMe && (
                        <View style={styles.msgAvatar}>
                            {logo ? (
                                <Image source={{ uri: logo }} style={styles.msgAvatarImg} />
                            ) : (
                                <View style={[styles.msgAvatarFallback, { backgroundColor: C.primary }]}>
                                    <Text style={styles.msgAvatarTxt}>{name[0]?.toUpperCase()}</Text>
                                </View>
                            )}
                        </View>
                    )}
                    <View style={[styles.msgWrapper, isMe && styles.msgWrapperRight]}>
                        <View style={[styles.bubble, styles.bubbleDeleted]}>
                            <Ionicons name="ban" size={12} color={C.textSecondary} />
                            <Text style={styles.deletedText}>
                                This message was deleted
                            </Text>
                        </View>
                    </View>
                </View>
            );
        }

        return (
            <View style={[styles.msgRow, isMe && styles.msgRowRight]}>
                {!isMe && (
                    <View style={styles.msgAvatar}>
                        {logo ? (
                            <Image source={{ uri: logo }} style={styles.msgAvatarImg} />
                        ) : (
                            <View style={[styles.msgAvatarFallback, { backgroundColor: C.primary }]}>
                                <Text style={styles.msgAvatarTxt}>{name[0]?.toUpperCase()}</Text>
                            </View>
                        )}
                    </View>
                )}
                <View style={[styles.msgWrapper, isMe && styles.msgWrapperRight]}>
                    <TouchableOpacity
                        style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}
                        onLongPress={() => handleLongPress(item)}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.bubbleTxt, isMe && styles.bubbleTxtMe]}>
                            {item.text}
                        </Text>
                        {item.isEdited && (
                            <Text style={[styles.editedLabel, isMe && styles.editedLabelMe]}>
                                (edited)
                            </Text>
                        )}
                        <View style={styles.bubbleFooter}>
                            <Text style={[styles.timeTxt, isMe && styles.timeTxtMe]}>
                                {fmtTime(item.createdAt)}
                            </Text>
                            {isMe && (
                                <Ionicons
                                    name={
                                        item.status === 'pending'   ? 'time-outline' :
                                        item.status === 'failed'    ? 'alert-circle-outline' :
                                        item.status === 'delivered' ? 'checkmark-done' :
                                        item.status === 'seen'      ? 'checkmark-done' :
                                        'checkmark'
                                    }
                                    size={12}
                                    color={
                                        item.status === 'failed'
                                            ? C.offline
                                            : item.status === 'seen'
                                                ? '#4CAF50'
                                                : 'rgba(255,255,255,0.7)'
                                    }
                                    style={{ marginLeft: 4 }}
                                />
                            )}
                            {!isMe && item.status === 'seen' && (
                                <Text style={[styles.timeTxt, { marginLeft: 4 }]}>Seen</Text>
                            )}
                        </View>
                    </TouchableOpacity>
                    {item.status === 'failed' && (
                        <TouchableOpacity onPress={() => retryMessage(item)} style={styles.retryBtn}>
                            <Text style={styles.retryTxt}>Tap to retry</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    }, [logo, name, handleLongPress, retryMessage]);

    // ── Typing bubble ──
    const TypingBubble = () => (
        <View style={styles.msgRow}>
            <View style={styles.msgAvatar}>
                {logo ? (
                    <Image source={{ uri: logo }} style={styles.msgAvatarImg} />
                ) : (
                    <View style={[styles.msgAvatarFallback, { backgroundColor: C.primary }]}>
                        <Text style={styles.msgAvatarTxt}>{name[0]?.toUpperCase()}</Text>
                    </View>
                )}
            </View>
            <View style={[styles.bubble, styles.bubbleThem, { paddingVertical: 12 }]}>
                <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                    {[0.4, 0.7, 1.0].map((op, i) => (
                        <View
                            key={i}
                            style={{
                                width: 7, height: 7, borderRadius: 3.5,
                                backgroundColor: C.textSecondary, opacity: op,
                            }}
                        />
                    ))}
                </View>
            </View>
        </View>
    );

    // Show loading while waiting for auto message
    if ((isLoading || isRequesting) && !activeConvIdRef.current) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <StatusBar barStyle="dark-content" backgroundColor={C.white} />
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.headerInfo}>
                        <View style={[styles.headerAvatar, { backgroundColor: C.primary }]}>
                            {logo ? (
                                <Image source={{ uri: logo }} style={styles.headerAvatarImg} />
                            ) : (
                                <Text style={styles.headerAvatarTxt}>{name[0]?.toUpperCase()}</Text>
                            )}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.headerName} numberOfLines={1}>{name}</Text>
                            <Text style={styles.headerStatus}>Starting conversation...</Text>
                        </View>
                    </View>
                    <View style={{ width: 36 }} />
                </View>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={C.primary} />
                    <Text style={styles.loadingTxt}>Waiting for welcome message...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" backgroundColor={C.white} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <View style={[styles.headerAvatar, { backgroundColor: C.primary }]}>
                        {logo ? (
                            <Image source={{ uri: logo }} style={styles.headerAvatarImg} />
                        ) : (
                            <Text style={styles.headerAvatarTxt}>{name[0]?.toUpperCase()}</Text>
                        )}
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerName} numberOfLines={1}>{name}</Text>
                        <Text style={[styles.headerStatus, isTyping && { color: C.primary }]}>
                            {isTyping ? 'Typing…' : isConnected ? 'Online' : 'Offline'}
                        </Text>
                    </View>
                </View>
                <View style={{ width: 36 }} />
            </View>

            {!isConnected && (
                <View style={styles.offlineBanner}>
                    <Ionicons name="cloud-offline-outline" size={14} color={C.white} />
                    <Text style={styles.offlineTxt}>Reconnecting…</Text>
                </View>
            )}

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <View style={{ flex: 1 }}>
                    {isLoadingMore && (
                        <View style={styles.loadMoreRow}>
                            <ActivityIndicator size="small" color={C.primary} />
                            <Text style={styles.loadMoreTxt}>Loading older messages…</Text>
                        </View>
                    )}

                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.msgList}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        onScroll={({ nativeEvent }) => {
                            if (nativeEvent.contentOffset.y < 80) loadMore();
                        }}
                        scrollEventThrottle={200}
                        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
                        ListFooterComponent={isTyping ? <TypingBubble /> : null}
                        ListEmptyComponent={
                            <View style={styles.emptyBox}>
                                <Ionicons
                                    name="chatbubble-ellipses-outline"
                                    size={48}
                                    color={C.primary}
                                    style={{ opacity: 0.3, marginBottom: 12 }}
                                />
                                <Text style={styles.emptyTitle}>No messages yet</Text>
                                <Text style={styles.emptySub}>Say hello to {name}!</Text>
                            </View>
                        }
                    />
                </View>

                {/* Input bar */}
                <View style={[styles.inputWrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            placeholder={isConnected ? 'Type a message…' : 'Connecting…'}
                            placeholderTextColor={C.textSecondary}
                            value={inputText}
                            onChangeText={handleInputChange}
                            multiline
                            maxLength={500}
                            editable={isConnected}
                        />
                        <TouchableOpacity
                            style={[
                                styles.sendBtn,
                                (!inputText.trim() || !isConnected) && styles.sendBtnDisabled,
                            ]}
                            onPress={sendMessage}
                            disabled={!inputText.trim() || !isConnected}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="send" size={18} color={C.white} />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>

            <EditMessageModal
                visible={editModal.visible}
                initialText={editModal.text}
                onSave={handleEditSave}
                onCancel={handleEditCancel}
            />
        </View>
    );
}

// ═══════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════

const styles = StyleSheet.create({
    container:  { flex: 1, backgroundColor: C.bg },
    center:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingTxt: { marginTop: 12, color: C.textSecondary, fontSize: 14 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.white,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: C.inputBg,
    },
    headerInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
    },
    headerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    headerAvatarImg: { width: 36, height: 36, borderRadius: 18 },
    headerAvatarTxt: { fontSize: 14, fontWeight: '600', color: C.white },
    headerName:      { fontSize: 15, fontWeight: '600', color: C.textPrimary, marginBottom: 2 },
    headerStatus:    { fontSize: 11, color: C.textSecondary },

    offlineBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 4,
        backgroundColor: C.warning,
    },
    offlineTxt: { color: C.white, fontSize: 12, fontWeight: '500' },

    loadMoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 8,
    },
    loadMoreTxt: { fontSize: 12, color: C.textSecondary },

    msgList: { padding: 16, paddingBottom: 8, flexGrow: 1 },

    msgRow:      { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
    msgRowRight: { justifyContent: 'flex-end' },

    msgAvatar:         { width: 28, height: 28, borderRadius: 14, marginRight: 8, overflow: 'hidden' },
    msgAvatarImg:      { width: 28, height: 28, borderRadius: 14 },
    msgAvatarFallback: {
        width: 28, height: 28, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
    },
    msgAvatarTxt: { fontSize: 11, fontWeight: '600', color: C.white },

    msgWrapper:      { maxWidth: '75%' },
    msgWrapperRight: { alignItems: 'flex-end' },

    bubble: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 18,
        elevation: 1,
    },
    bubbleMe: {
        backgroundColor: C.sentBubble,
        borderBottomRightRadius: 4,
    },
    bubbleThem: {
        backgroundColor: C.recvBubble,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: C.border,
    },
    bubbleDeleted: {
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: C.border,
        borderStyle: 'dashed',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    bubbleTxt:    { fontSize: 14, lineHeight: 20, marginBottom: 2, color: C.textPrimary },
    bubbleTxtMe:  { color: C.white },
    bubbleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
    timeTxt:      { fontSize: 10, color: C.textSecondary },
    timeTxtMe:    { color: 'rgba(255,255,255,0.7)' },
    editedLabel:  { fontSize: 10, color: C.textSecondary, fontStyle: 'italic', marginTop: 2 },
    editedLabelMe: { color: 'rgba(255,255,255,0.7)' },
    deletedText:  { fontSize: 12, color: C.textSecondary, fontStyle: 'italic' },
    retryBtn:     { marginTop: 4 },
    retryTxt:     { fontSize: 11, color: C.offline },

    emptyBox: {
        flex: 1, minHeight: 400,
        justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 16, fontWeight: '600',
        color: C.textPrimary, marginBottom: 4,
    },
    emptySub: { fontSize: 14, color: C.textSecondary, textAlign: 'center' },

    inputWrapper: {
        backgroundColor: C.white,
        borderTopWidth: 1,
        borderTopColor: C.border,
        paddingHorizontal: 12,
        paddingTop: 8,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: C.inputBg,
        borderRadius: 24,
        paddingLeft: 16,
        paddingRight: 4,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: C.border,
    },
    input: {
        flex: 1,
        fontSize: 14,
        color: C.textPrimary,
        maxHeight: 100,
        paddingTop: 8,
        paddingBottom: 8,
        paddingRight: 8,
    },
    sendBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: C.primary,
        justifyContent: 'center', alignItems: 'center',
        marginLeft: 4,
    },
    sendBtnDisabled: { backgroundColor: C.textSecondary, opacity: 0.4 },
});