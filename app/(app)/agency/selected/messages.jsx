import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, StatusBar,
    Image, FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import socketService from '../../../services/SocketService';
import { useAuth } from '../../../context/AuthContext';
import { Config } from '../../../config';

// ═══════════════════════════════════════════════════════════
//  MODULE-LEVEL CACHE (persists across navigations)
// ═══════════════════════════════════════════════════════════
let _contactMap       = {};
let _rawConversations = [];
let _builtConvs       = [];

// ═══════════════════════════════════════════════════════════
//  THEME
// ═══════════════════════════════════════════════════════════
const C = {
    bg:            '#F8FBFF',
    primary:       '#769FCD',
    primarySoft:   '#E8F0FE',
    white:         '#FFFFFF',
    textPrimary:   '#2D3748',
    textSecondary: '#64748B',
    border:        '#E0EBFF',
    warning:       '#F59E0B',
    unread:        '#FF4D6D',
};

const MODEL_ICON = {
    Agency:  'business-outline',
    Mentor:  'school-outline',
    Agent:   'ribbon-outline',
    Student: 'person-outline',
};

// ═══════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════

function formatTime(ts) {
    if (!ts) return '';
    const d  = new Date(ts);
    const ms = Date.now() - d.getTime();
    if (ms < 60_000)      return 'Just now';
    if (ms < 3_600_000)   return `${Math.floor(ms / 60_000)}m`;
    if (ms < 86_400_000)  return `${Math.floor(ms / 3_600_000)}h`;
    if (ms < 604_800_000) return `${Math.floor(ms / 86_400_000)}d`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function toId(val) {
    if (!val) return null;
    if (typeof val === 'string') return val.trim() || null;
    if (typeof val === 'object') {
        const s = val._id || val.id;
        return s ? String(s).trim() : null;
    }
    return null;
}

/**
 * Extract the "other" participant from a raw conversation.
 * Backend shape: participants = [{ user, model }, ...]
 * where `user` can be:
 *   - plain string ID
 *   - ObjectId
 *   - populated doc { _id, name, avatar, model }
 */
function getOtherParticipant(raw, myId) {
    const myStr = String(myId || '').trim();

    for (const p of (raw.participants || [])) {
        let id     = null;
        let model  = null;
        let name   = null;
        let avatar = null;

        if (typeof p === 'string') {
            id = p.trim();
        } else if (p.user) {
            const u = p.user;
            id    = toId(u);
            model = p.model || (typeof u === 'object' ? u.model : null);
            name  = typeof u === 'object' ? (u.name || null) : null;
            avatar = typeof u === 'object' ? (u.avatar || u.profileUrl || u.logo || null) : null;
        } else if (p._id) {
            id     = toId(p._id);
            model  = p.model || null;
            name   = p.name  || null;
            avatar = p.avatar || p.profileUrl || p.logo || null;
        }

        if (!id || id === myStr)   continue;
        if (model === 'Student')   continue;  // skip own side

        return { id, model, name, avatar };
    }

    // Fallback: any non-me participant
    for (const p of (raw.participants || [])) {
        const u  = p.user || p;
        const id = toId(u);
        if (id && id !== myStr) {
            return {
                id,
                model:  p.model || null,
                name:   typeof u === 'object' ? (u.name || null) : null,
                avatar: typeof u === 'object' ? (u.avatar || u.profileUrl || u.logo || null) : null,
            };
        }
    }

    return null;
}

function formatConversation(raw, myId) {
    const other   = getOtherParticipant(raw, myId);
    const otherId = other?.id || String(raw._id || raw.id);

    // Prefer contact map (has real fetched names) over socket data
    const contact = _contactMap[otherId];

    const name   = contact?.name   || other?.name   || 'Support';
    const avatar = contact?.logo   || other?.avatar  || '';
    const model  = contact?.model  || other?.model   || 'Agent';
    const type   = contact?.type   || model;

    let lastMessage = 'Start a conversation…';
    let timestamp   = raw.updatedAt || raw.createdAt || new Date().toISOString();

    if (raw.lastMessage) {
        // Check if message is deleted
        if (raw.lastMessage.isDeleted) {
            lastMessage = 'This message was deleted';
        } else {
            lastMessage = raw.lastMessage.content || lastMessage;
        }
        timestamp   = raw.lastMessage.createdAt || timestamp;
    }

    return {
        id:             String(raw._id || raw.id),
        conversationId: String(raw._id || raw.id),
        participantId:  otherId,
        name,
        avatar,
        model,
        type,
        lastMessage,
        timestamp,
        unreadCount:    raw.unreadCount || 0,
        lastMessageDeleted: raw.lastMessage?.isDeleted || false,
    };
}

function buildSortedConvs(myId) {
    const seen = new Map();
    for (const raw of _rawConversations) {
        const conv = formatConversation(raw, myId);
        if (!conv.participantId) continue;

        const key      = conv.participantId;
        const existing = seen.get(key);

        if (!existing || new Date(conv.timestamp) > new Date(existing.timestamp)) {
            seen.set(key, conv);
        }
    }

    const sorted = Array.from(seen.values()).sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    _builtConvs = sorted;
    return sorted;
}

// ═══════════════════════════════════════════════════════════
//  FETCH CONTACT DETAILS
// ═══════════════════════════════════════════════════════════

async function fetchOneContactDetail(id, type, token) {
    try {
        let url;
        if (type === 'Mentor') {
            url = `${Config.API_BASE_URL}/agency/mentors/${id}`;
        } else if (type === 'Admission Officer' || type === 'Visa Officer') {
            url = `${Config.API_BASE_URL}/agency/profile/employee/agents/${id}/agents`;
        } else {
            return null;
        }

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return null;

        const data = await res.json();

        if (type === 'Mentor' && data.mentor) return data.mentor;
        if (data.agent) return data.agent;
        if (data.data)  return data.data;
        if (data.name)  return data;
        return null;
    } catch (e) {
        console.error(`fetchOneContactDetail(${type}):`, e.message);
        return null;
    }
}

async function buildContactMap(profile, activeAgency, token) {
    const map   = {};
    const tasks = [];

    const addContact = async (rawId, base) => {
        const id = toId(rawId);
        if (!id) return;

        const info = { ...base };

        // Fetch real name/avatar for non-Agency types
        if (base.type === 'Mentor' || base.type === 'Admission Officer' || base.type === 'Visa Officer') {
            const details = await fetchOneContactDetail(id, base.type, token);
            if (details) {
                info.name = details.name || info.name;
                info.logo = details.profilepic || details.avatar || details.logo || info.logo;
            }
        }

        map[id] = info;
    };

    if (profile.registeredAgency) {
        tasks.push(addContact(profile.registeredAgency, {
            name:  activeAgency?.name || 'Agency Support',
            logo:  activeAgency?.logo || '',
            model: 'Agency',
            type:  'Agency',
        }));
    }

    if (profile.assignedAgent) {
        tasks.push(addContact(profile.assignedAgent, {
            name:  'Admission Officer',
            logo:  '',
            model: 'Agent',
            type:  'Admission Officer',
        }));
    }

    const vo = profile.assignedVisaOfficer || profile.visaOfficer;
    if (vo) {
        const voId = toId(typeof vo === 'object' ? (vo._id || vo.id) : vo);
        if (voId) {
            tasks.push(addContact(voId, {
                name:  'Visa Officer',
                logo:  '',
                model: 'Agent',
                type:  'Visa Officer',
            }));
        }
    }

    if (profile.connectedMentor?.status === 'confirmed') {
        const mentor   = profile.connectedMentor.mentor;
        const mentorId = toId(typeof mentor === 'object' ? (mentor._id || mentor.id) : mentor);
        if (mentorId) {
            tasks.push(addContact(mentorId, {
                name:  'Your Mentor',
                logo:  '',
                model: 'Mentor',
                type:  'Mentor',
            }));
        }
    }

    await Promise.all(tasks);
    console.log('✅ Contact map built:', Object.keys(map));
    return map;
}

// ═══════════════════════════════════════════════════════════
//  COMPONENT
// ═══════════════════════════════════════════════════════════

export default function MessagesScreen() {
    const router                            = useRouter();
    const { userToken, activeAgency, user } = useAuth();
    const myId                              = String(user?.id || user?._id || '');

    const [conversations, setConversations] = useState(_builtConvs);
    const [contacts,      setContacts]      = useState(
        Object.entries(_contactMap).map(([id, info]) => ({ id, ...info }))
    );
    const [isLoading,    setIsLoading]    = useState(_builtConvs.length === 0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isConnected,  setIsConnected]  = useState(socketService.isConnected());

    const mountedRef  = useRef(false);
    const fetchingRef = useRef(false);
    // Track which conversations have been opened to reset unread count
    const openedConversationsRef = useRef(new Set());

    // ── Refresh from cache ──
    const refreshFromCache = useCallback(() => {
        if (!myId) return;
        const built = buildSortedConvs(myId);
        if (mountedRef.current) {
            setConversations([...built]);
        }
    }, [myId]);

    // ── Load contacts from API ──
   // In message.jsx, update loadContacts function

const loadContacts = useCallback(async (isRefresh = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
        const res = await fetch(`${Config.API_BASE_URL}/students/profile`, {
            headers: { Authorization: `Bearer ${userToken}` },
        });

        if (!res.ok) throw new Error(`Profile fetch failed: ${res.status}`);

        const data    = await res.json();
        const profile = data?.profile || data;
        if (!profile) return;

        const map  = await buildContactMap(profile, activeAgency, userToken);
        _contactMap = map;

        const list = Object.entries(map).map(([id, info]) => ({ id, ...info }));

        if (!mountedRef.current) return;

        setContacts(list);
        
        // Request auto messages for new contacts that don't have conversations yet
        if (socketService.isConnected()) {
            // For each contact, request their conversation to trigger auto message
            list.forEach(contact => {
                // Check if we already have a conversation for this contact
                const existingConv = _rawConversations.some(conv => {
                    const other = getOtherParticipant(conv, myId);
                    return other?.id === contact.id;
                });
                
                if (!existingConv) {
                    console.log(`🔄 Requesting auto message for ${contact.name} (${contact.type})`);
                    // This will trigger the backend to send the auto message
                    socketService.getConversationMessages(contact.id, null, null, 1);
                }
            });
        }

        refreshFromCache();
    } catch (e) {
        console.error('loadContacts error:', e.message);
    } finally {
        fetchingRef.current = false;
        if (isRefresh && mountedRef.current) {
            setIsRefreshing(false);
        }
    }
}, [userToken, activeAgency, refreshFromCache, myId]);

    const onRefresh = useCallback(() => {
        setIsRefreshing(true);
        loadContacts(true);
    }, [loadContacts]);

    // ── Socket listeners ──
    useEffect(() => {
        mountedRef.current = true;

        // Show cached data immediately
        if (_builtConvs.length > 0) {
            setConversations([..._builtConvs]);
            setIsLoading(false);
        }

        socketService.connect(userToken);
        loadContacts();

        const unsubConn = socketService.onConnectionChange(connected => {
            if (mountedRef.current) setIsConnected(connected);
        });

        const unsubList = socketService.onConversationList(data => {
            if (!mountedRef.current) return;

            const raw = Array.isArray(data)
                ? data
                : Array.isArray(data?.conversations)
                    ? data.conversations
                    : [];

            console.log(`📥 conversation_list: ${raw.length} conversations`);
            _rawConversations = raw;

            const built = buildSortedConvs(myId);
            setConversations([...built]);
            setIsLoading(false);
        });

        const unsubNew = socketService.onNewMessage(payload => {
            if (!mountedRef.current) return;

            const msg    = payload.message || payload;
            const convId = String(payload.conversationId || msg.conversationId || '');

            console.log('📥 new_message for conv:', convId);

            setConversations(prev => {
                const idx = prev.findIndex(c => c.conversationId === convId);

                if (idx === -1) {
                    // New conversation from automated message
                    const senderId = String(msg.sender || msg.senderId || '');
                    const contact  = _contactMap[senderId] || {};

                    const newConv = {
                        id:             convId || `new_${Date.now()}`,
                        conversationId: convId || `new_${Date.now()}`,
                        participantId:  senderId,
                        name:           contact.name  || msg.senderInfo?.name  || 'Support',
                        avatar:         contact.logo  || msg.senderInfo?.avatar || '',
                        model:          contact.model || msg.senderInfo?.model  || 'Agent',
                        type:           contact.type  || 'Contact',
                        lastMessage:    msg.content   || '',
                        timestamp:      msg.createdAt || new Date().toISOString(),
                        unreadCount:    1,
                        lastMessageDeleted: false,
                    };

                    const next  = [newConv, ...prev];
                    _builtConvs = next;
                    return next;
                }

                const updated = [...prev];
                updated[idx]  = {
                    ...updated[idx],
                    lastMessage: msg.content   || updated[idx].lastMessage,
                    timestamp:   msg.createdAt || new Date().toISOString(),
                    unreadCount: (updated[idx].unreadCount || 0) + 1,
                    lastMessageDeleted: false,
                };

                const [moved] = updated.splice(idx, 1);
                const next    = [moved, ...updated];
                _builtConvs   = next;
                return next;
            });
        });

        const unsubSent = socketService.onMessageSent(payload => {
            if (!mountedRef.current) return;

            const msg    = payload.message || payload;
            const convId = String(payload.conversationId || msg.conversationId || '');

            console.log('📥 message_sent for conv:', convId);

            if (!convId) return;

            setConversations(prev => {
                const idx = prev.findIndex(c => c.conversationId === convId);

                if (idx !== -1) {
                    const updated = [...prev];
                    updated[idx]  = {
                        ...updated[idx],
                        lastMessage: msg.content   || updated[idx].lastMessage,
                        timestamp:   msg.createdAt || new Date().toISOString(),
                        unreadCount: 0, // Reset unread count for own messages
                        lastMessageDeleted: false,
                    };

                    const [moved] = updated.splice(idx, 1);
                    const next    = [moved, ...updated];
                    _builtConvs   = next;
                    return next;
                }

                // First message in new conversation
                const receiverId = String(msg.receiver || '');
                const contact    = _contactMap[receiverId] || {};

                const newConv = {
                    id:             convId,
                    conversationId: convId,
                    participantId:  receiverId,
                    name:           contact.name  || 'Support',
                    avatar:         contact.logo  || '',
                    model:          contact.model || 'Agent',
                    type:           contact.type  || 'Contact',
                    lastMessage:    msg.content   || '',
                    timestamp:      msg.createdAt || new Date().toISOString(),
                    unreadCount:    0,
                    lastMessageDeleted: false,
                };

                const next  = [newConv, ...prev];
                _builtConvs = next;
                return next;
            });
        });

        const unsubUpd = socketService.onConversationUpdated(upd => {
            if (!mountedRef.current) return;

            const updId = String(upd._id || upd.id || '');
            if (!updId) return;

            setConversations(prev => {
                const idx = prev.findIndex(c => c.conversationId === updId);
                if (idx === -1) return prev;

                // Check if last message is deleted
                const isDeleted = upd.lastMessage?.isDeleted || false;
                const lastMessage = isDeleted 
                    ? 'This message was deleted' 
                    : (upd.lastMessage?.content || prev[idx].lastMessage);

                const updated = [...prev];
                updated[idx]  = {
                    ...updated[idx],
                    lastMessage,
                    timestamp:   upd.lastMessage?.createdAt || updated[idx].timestamp,
                    unreadCount: upd.unreadCount ?? updated[idx].unreadCount,
                    lastMessageDeleted: isDeleted,
                };

                const sorted = [...updated].sort(
                    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
                );

                _builtConvs = sorted;
                return sorted;
            });
        });

        // FIX: Handle message deleted event for conversations list
        const unsubDeleted = socketService.onMessageDeleted(data => {
            if (!mountedRef.current) return;
            
            const msgId = String(data.messageId || '');
            const convId = String(data.conversationId || '');
            const deleteFor = data.deleteFor || 'me';
            
            console.log(`📥 message_deleted for conv: ${convId}, deleteFor: ${deleteFor}`);
            
            // Update the conversation in the list to show deleted message
            setConversations(prev => {
                const idx = prev.findIndex(c => c.conversationId === convId);
                if (idx === -1) return prev;
                
                const updated = [...prev];
                
                // If deleted for everyone, update the last message to show "This message was deleted"
                if (deleteFor === 'everyone') {
                    updated[idx] = {
                        ...updated[idx],
                        lastMessage: 'This message was deleted',
                        lastMessageDeleted: true,
                    };
                } else {
                    // For "delete for me", we need to check if this was the last message
                    // If it was, we might want to show a different message or fetch updated conversation
                    // For now, trigger a refresh
                    setTimeout(() => {
                        if (mountedRef.current) {
                            socketService.socket?.emit("conversation_list");
                        }
                    }, 500);
                }
                
                // Sort again to ensure correct order
                const sorted = [...updated].sort(
                    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
                );
                
                _builtConvs = sorted;
                return sorted;
            });

            // Force a re-render by creating a new reference
            setConversations(current => {
                return current.map(conv => conv);
            });

            // Also refresh from server to ensure consistency
            setTimeout(() => {
                if (mountedRef.current) {
                    socketService.socket?.emit("conversation_list");
                }
            }, 300);
        });

        // NEW: Handle message edited event for conversations list
        const unsubEdited = socketService.onMessageEdited(edited => {
            if (!mountedRef.current) return;
            
            const msgId = String(edited._id || edited.id || '');
            const convId = String(edited.conversationId || '');
            
            if (!convId) return;
            
            setConversations(prev => {
                const idx = prev.findIndex(c => c.conversationId === convId);
                if (idx === -1) return prev;
                
                // Only update if this was the last message
                // We don't know for sure, so we'll refresh
                setTimeout(() => {
                    if (mountedRef.current) {
                        socketService.socket?.emit("conversation_list");
                    }
                }, 300);
                
                return prev;
            });
        });

        const timeout = setTimeout(() => {
            if (mountedRef.current) setIsLoading(false);
        }, 8000);

        return () => {
            mountedRef.current = false;
            clearTimeout(timeout);
            unsubConn();
            unsubList();
            unsubNew();
            unsubSent();
            unsubUpd();
            unsubDeleted();
            unsubEdited();
        };
    }, [userToken, myId]);

    // Reload contacts on screen focus
    useFocusEffect(
        useCallback(() => {
            if (mountedRef.current) {
                loadContacts();
                // Reset opened conversations tracking
                openedConversationsRef.current.clear();
                
                // Refresh conversation list when screen comes into focus
                if (socketService.isConnected()) {
                    socketService.socket?.emit("conversation_list");
                }
            }
        }, [loadContacts])
    );

    // ── Navigation ──
    const openChat = (conv) => {
        // Track that this conversation was opened
        openedConversationsRef.current.add(conv.conversationId);
        
        // Update local state optimistically (remove unread badge immediately)
        setConversations(prev => {
            const idx = prev.findIndex(c => c.conversationId === conv.conversationId);
            if (idx !== -1 && prev[idx].unreadCount > 0) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], unreadCount: 0 };
                _builtConvs = updated;
                return updated;
            }
            return prev;
        });

        router.push({
            pathname: '/agency/selected/chat',
            params: {
                conversationId: conv.conversationId || '',
                recipientId:    conv.participantId  || '',
                recipientModel: conv.model          || 'Agent',
                name:           conv.name           || 'Support',
                logo:           conv.avatar         || '',
            },
        });
    };

    const startChat = (contact) => {
        router.push({
            pathname: '/agency/selected/chat',
            params: {
                recipientId:    contact.id    || '',
                recipientModel: contact.model || 'Agent',
                name:           contact.name  || 'Support',
                logo:           contact.logo  || '',
            },
        });
    };

    // ── Render ──
    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.row} onPress={() => openChat(item)} activeOpacity={0.72}>
            <View style={styles.avatarWrap}>
                {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatarFallback, { backgroundColor: C.primary }]}>
                        <Text style={styles.avatarLetter}>{item.name?.[0]?.toUpperCase() || '?'}</Text>
                    </View>
                )}
                {item.unreadCount > 0 && <View style={styles.unreadDot} />}
            </View>

            <View style={styles.rowContent}>
                <View style={styles.rowTop}>
                    <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.rowTime}>{formatTime(item.timestamp)}</Text>
                </View>

                <Text 
                    style={[
                        styles.rowPreview, 
                        item.lastMessageDeleted && styles.deletedPreview
                    ]} 
                    numberOfLines={1}
                >
                    {item.lastMessage?.length > 60
                        ? item.lastMessage.slice(0, 60) + '…'
                        : item.lastMessage}
                </Text>

                <View style={styles.rowBottom}>
                    <View style={[styles.badge, { backgroundColor: C.primarySoft }]}>
                        <Ionicons
                            name={MODEL_ICON[item.model] || 'person-outline'}
                            size={11}
                            color={C.primary}
                        />
                        <Text style={[styles.badgeText, { color: C.primary }]}>
                            {item.type || item.model}
                        </Text>
                    </View>
                    {item.unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    if (isLoading) {
        return (
            <SafeAreaView style={styles.root}>
                <ScreenHeader onBack={() => router.back()} />
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={C.primary} />
                    <Text style={styles.loadingText}>Loading conversations…</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor={C.white} />
            <ScreenHeader onBack={() => router.back()} />

            {!isConnected && (
                <View style={styles.offlineBanner}>
                    <Ionicons name="cloud-offline-outline" size={15} color={C.white} />
                    <Text style={styles.offlineText}>Reconnecting…</Text>
                </View>
            )}

            <FlatList
                data={conversations}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={onRefresh}
                        colors={[C.primary]}
                        tintColor={C.primary}
                    />
                }
                ListHeaderComponent={
                    contacts.length > 0 ? (
                        <View style={styles.contactsSection}>
                            <Text style={styles.sectionTitle}>Available Contacts</Text>
                            <View style={styles.contactsGrid}>
                                {contacts.map(contact => {
                                    const existingConv = conversations.find(
                                        c => c.participantId === contact.id
                                    );
                                    return (
                                        <TouchableOpacity
                                            key={contact.id}
                                            style={styles.contactItem}
                                            onPress={() =>
                                                existingConv
                                                    ? openChat(existingConv)
                                                    : startChat(contact)
                                            }
                                        >
                                            <View style={[styles.contactAvatar, { borderColor: C.primary }]}>
                                                {contact.logo ? (
                                                    <Image
                                                        source={{ uri: contact.logo }}
                                                        style={styles.contactAvatarImg}
                                                    />
                                                ) : (
                                                    <View
                                                        style={[
                                                            styles.contactAvatarFallback,
                                                            { backgroundColor: C.primary },
                                                        ]}
                                                    >
                                                        <Text style={styles.contactAvatarLetter}>
                                                            {contact.name?.[0]?.toUpperCase()}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={styles.contactName} numberOfLines={1}>
                                                {contact.name?.split(' ')[0]}
                                            </Text>
                                            <Text style={styles.contactType} numberOfLines={1}>
                                                {contact.type}
                                            </Text>
                                            {existingConv && (
                                                <View style={styles.chatBadge}>
                                                    <Ionicons name="chatbubble" size={12} color={C.primary} />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    ) : null
                }
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <Ionicons
                            name="chatbubbles-outline"
                            size={64}
                            color={C.primary}
                            style={{ opacity: 0.25, alignSelf: 'center', marginBottom: 16 }}
                        />
                        <Text style={styles.emptyTitle}>No Messages Yet</Text>
                        <Text style={styles.emptyBody}>
                            {contacts.length > 0
                                ? 'Tap a contact above to start a conversation.'
                                : 'Your assigned contacts will appear here.'}
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

function ScreenHeader({ onBack }) {
    return (
        <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                <Ionicons name="arrow-back" size={22} color="#2D3748" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Messages</Text>
            <View style={{ width: 40 }} />
        </View>
    );
}

// ═══════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════

const styles = StyleSheet.create({
    root:        { flex: 1, backgroundColor: C.bg },
    center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: C.white,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: C.bg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle:  { fontSize: 19, fontWeight: '700', color: '#2D3748' },
    offlineBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 8,
        backgroundColor: C.warning,
    },
    offlineText:  { color: C.white, fontSize: 13, fontWeight: '600' },
    loadingText:  { marginTop: 14, color: C.textSecondary, fontSize: 14 },
    listContent:  { paddingBottom: 28 },

    contactsSection: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
        backgroundColor: C.white,
        borderBottomWidth: 8,
        borderBottomColor: C.bg,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2D3748',
        marginBottom: 16,
    },
    contactsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -8,
    },
    contactItem: {
        width: '25%',
        paddingHorizontal: 8,
        alignItems: 'center',
        marginBottom: 16,
        position: 'relative',
    },
    contactAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        marginBottom: 6,
        overflow: 'hidden',
        backgroundColor: C.bg,
        borderWidth: 2,
        borderColor: C.white,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    contactAvatarImg:      { width: 56, height: 56, borderRadius: 28 },
    contactAvatarFallback: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contactAvatarLetter: { fontSize: 20, fontWeight: '600', color: C.white },
    contactName: {
        fontSize: 12,
        fontWeight: '500',
        color: '#2D3748',
        textAlign: 'center',
        marginBottom: 2,
    },
    contactType: { fontSize: 10, color: C.textSecondary, textAlign: 'center' },
    chatBadge: {
        position: 'absolute',
        top: 0,
        right: 12,
        backgroundColor: C.white,
        borderRadius: 10,
        padding: 2,
        borderWidth: 1,
        borderColor: C.primary,
    },

    row: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: C.white,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
    avatarWrap: { position: 'relative', marginRight: 14 },
    avatar:     { width: 54, height: 54, borderRadius: 27, backgroundColor: C.bg },
    avatarFallback: {
        width: 54,
        height: 54,
        borderRadius: 27,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarLetter: { fontSize: 20, fontWeight: '700', color: C.white },
    unreadDot: {
        position: 'absolute',
        top: 1,
        right: 1,
        width: 13,
        height: 13,
        borderRadius: 6.5,
        backgroundColor: C.unread,
        borderWidth: 2,
        borderColor: C.white,
    },
    rowContent: { flex: 1 },
    rowTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    rowName:    { fontSize: 15, fontWeight: '600', color: '#2D3748', flex: 1, marginRight: 8 },
    rowTime:    { fontSize: 12, color: C.textSecondary },
    rowPreview: { fontSize: 13, color: C.textSecondary, marginBottom: 6 },
    deletedPreview: { fontStyle: 'italic', opacity: 0.7 },
    rowBottom:  {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 6,
    },
    badgeText:       { fontSize: 11, fontWeight: '600' },
    unreadBadge: {
        backgroundColor: C.unread,
        borderRadius: 12,
        minWidth: 22,
        height: 22,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    unreadBadgeText: { fontSize: 11, color: C.white, fontWeight: '700' },

    emptyWrap:  { flex: 1, paddingHorizontal: 24, paddingTop: 48 },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#2D3748',
        textAlign: 'center',
        marginBottom: 8,
    },
    emptyBody: {
        fontSize: 14,
        color: C.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
});