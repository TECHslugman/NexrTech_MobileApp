import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';
import { Config } from '../../../../config';

const COLORS = {
    bg: '#F8FAFD',
    primary: '#769FCD',
    white: '#FFFFFF',
    border: '#EEF2F7',
    textPrimary: '#2D3748',
    textSecondary: '#718096',
    unreadBg: '#F0F7FF', // Slightly darker for better contrast
    readBg: '#FFFFFF',
};

export default function NotificationsScreen() {
    const router = useRouter();
    const { userToken } = useAuth();

    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Fetch notifications from API using token
    const fetchNotifications = async () => {
        if (!userToken) return;

        try {
            const response = await fetch(`${Config.API_BASE_URL}/students/students/notification/history`, {
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setNotifications(data.notifications || []);
            } else {
                // UPDATED LOGGING HERE:
                const errorBody = await response.text();
                console.error(`❌ API Error ${response.status}:`, errorBody);
            }
        } catch (error) {
            console.error('❌ Network Error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [userToken]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    // Mark specific notification as read
    const markAsRead = async (notificationId) => {
        try {
            // Ensure this endpoint matches your backend's PATCH/PUT route
            const response = await fetch(`${Config.API_BASE_URL}students/students/notification/read/${notificationId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                setNotifications(prev =>
                    prev.map(notif =>
                        notif._id === notificationId ? { ...notif, isRead: true } : notif
                    )
                );
            }
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const getTimeAgo = (date) => {
        const now = new Date();
        const notifDate = new Date(date);
        const diffInMs = now.getTime() - notifDate.getTime();
        const diffInMins = Math.floor(diffInMs / 60000);
        const diffInHours = Math.floor(diffInMins / 60);
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInMins < 1) return 'Just now';
        if (diffInMins < 60) return `${diffInMins}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInDays < 7) return `${diffInDays}d ago`;
        return notifDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'document': return 'document-text';
            case 'message': return 'chatbubble';
            case 'uploaded file': return 'cloud-upload';
            default: return 'notifications';
        }
    };

    const renderNotificationItem = ({ item }) => {
        const isUnread = !item.isRead;

        return (
            <TouchableOpacity
                style={[
                    styles.notificationCard,
                    { backgroundColor: isUnread ? COLORS.unreadBg : COLORS.readBg }
                ]}
                onPress={() => {
                    if (isUnread) markAsRead(item._id);
                    // Handle navigation if link exists
                    if (item.link) router.push(item.link);
                }}
            >
                <View style={styles.iconContainer}>
                    <Ionicons
                        name={getNotificationIcon(item.type)}
                        size={22}
                        color={COLORS.primary}
                    />
                </View>

                <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle}>{item.title}</Text>
                    <Text style={styles.notificationMessage} numberOfLines={2}>
                        {item.body}
                    </Text>
                    <Text style={styles.notificationTime}>
                        {getTimeAgo(item.createdAt)}
                    </Text>
                </View>

                {isUnread && <View style={styles.unreadDot} />}
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={{ width: 40 }} />
            </View>

            {notifications.length > 0 ? (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item._id}
                    renderItem={renderNotificationItem}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
                    }
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <Ionicons name="notifications-off-outline" size={64} color={COLORS.textSecondary} />
                    <Text style={styles.emptyTitle}>No Notifications</Text>
                    <Text style={styles.emptyMessage}>You're all caught up!</Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 16
    },
    backButton: {
        width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.white,
        justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
    listContainer: { paddingHorizontal: 20, paddingBottom: 20 },
    notificationCard: {
        flexDirection: 'row', padding: 14, borderRadius: 12, marginBottom: 12,
        borderWidth: 1, borderColor: COLORS.border
    },
    iconContainer: {
        width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.white,
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
        borderWidth: 1, borderColor: COLORS.border
    },
    notificationContent: { flex: 1 },
    notificationTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4 },
    notificationMessage: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 6 },
    notificationTime: { fontSize: 12, color: COLORS.textSecondary },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginLeft: 8, marginTop: 4 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, marginTop: 16 },
    emptyMessage: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 },
});