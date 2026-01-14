import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Image,
    ActivityIndicator,
    StatusBar,
    useWindowDimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';

const BASE_URL = 'https://edu-agent-backend-nine.vercel.app/api/v1';

const COLORS = {
    bg: '#F8FAFD',
    primary: '#769FCD',
    primaryLight: 'rgba(118, 159, 205, 0.1)',
    white: '#FFFFFF',
    textPrimary: '#2D3748',
    textSecondary: '#718096',
    border: '#EEF2F7',
    cardBg: '#FFFFFF',
};

export default function AllEvents() {
    const router = useRouter();
    const { id, agencyName } = useLocalSearchParams();
    const { userToken } = useAuth();
    const { width } = useWindowDimensions();

    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState([]);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const response = await fetch(`${BASE_URL}/agency/events/student/${id}`, {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                });

                const json = await response.json();
                if (response.ok) {
                    if (Array.isArray(json)) {
                        setEvents(json);
                    } else if (Array.isArray(json.events)) {
                        setEvents(json.events);
                    } else if (Array.isArray(json.data)) {
                        setEvents(json.data);
                    } else {
                        throw new Error("Unexpected data format");
                    }
                } else {
                    throw new Error("No data");
                }
            } catch (error) {
                console.log("API Error, using fallback data:", error);
                setEvents([
                    {
                        id: '1',
                        _id: '1',
                        title: 'Higher Education Fair 2024',
                        image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=250&fit=crop',
                        location: "Convention Center",
                        date: "2024-04-15"
                    },
                    {
                        id: '2',
                        _id: '2',
                        title: 'Study Abroad Webinar',
                        image: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400&h=250&fit=crop',
                        location: "Online",
                        date: "2024-03-20"
                    }
                ]);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, [id, userToken]);

    // Helper to safely format location (handles string or object)
    const renderLocationText = (loc) => {
        if (!loc) return "Location TBA";
        if (typeof loc === 'object') {
            return loc.venueName || loc.addressLine || "Location specified";
        }
        return loc;
    };

    const formatDate = (dateValue) => {
        if (!dateValue) return "Date TBA";
        // Handle if date is an object with a startDate property
        const dateStr = typeof dateValue === 'object' ? dateValue.startDate : dateValue;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return "TBA";
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const renderEventItem = ({ item }) => {
        const eventId = item._id || item.id;
        const cardWidth = (width - 48) / 2;
        const displayImage = item.bannerImageUrl || item.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400';
        
        // Ensure location is a string before passing to router
        const locationString = renderLocationText(item.location);

        return (
            <TouchableOpacity
                style={[styles.eventCard, { width: cardWidth }]}
                activeOpacity={0.9}
                onPress={() => {
                    router.push({
                        pathname: '/agency/selected/events/details',
                        params: {
                            id: eventId,
                            eventTitle: item.title,
                            eventImage: displayImage, 
                            eventDate: typeof item.date === 'object' ? item.date.startDate : item.date,
                            eventLocation: locationString // Pass as string to avoid param errors
                        }
                    });
                }}
            >
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: displayImage }}
                        style={styles.eventImage}
                    />
                    <View style={styles.dateBadge}>
                        <Text style={styles.dateBadgeText}>{formatDate(item.date).split(' ')[0]}</Text>
                        <Text style={styles.dateBadgeMonth}>{formatDate(item.date).split(' ')[1]}</Text>
                    </View>
                </View>

                <View style={styles.cardContent}>
                    <Text style={styles.eventTitle} numberOfLines={2}>{item.title}</Text>
                    <View style={styles.locationRow}>
                        <Feather name="map-pin" size={12} color={COLORS.primary} />
                        <Text style={styles.locationText} numberOfLines={1}>
                            {locationString}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="chevron-back" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {agencyName ? `${agencyName}` : 'Agency'}
                    </Text>
                    <View style={{ width: 40 }} />
                </View>
                <Text style={styles.headerSubtitle}>Events & Seminars</Text>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading events...</Text>
                </View>
            ) : events.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIcon}>
                        <Feather name="calendar" size={60} color={COLORS.border} />
                    </View>
                    <Text style={styles.emptyTitle}>No Events Available</Text>
                    <Text style={styles.emptyText}>Check back later for upcoming events</Text>
                </View>
            ) : (
                <>
                    <View style={styles.eventsCountContainer}>
                        <View style={styles.eventsCountBadge}>
                            <Text style={styles.eventsCountText}>
                                {events.length} {events.length === 1 ? 'Event' : 'Events'} Available
                            </Text>
                        </View>
                    </View>

                    <FlatList
                        data={events}
                        numColumns={2}
                        keyExtractor={(item, index) => (item._id || item.id || index).toString()}
                        renderItem={renderEventItem}
                        contentContainerStyle={styles.listContainer}
                        columnWrapperStyle={styles.columnWrapper}
                        showsVerticalScrollIndicator={false}
                    />
                </>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 20,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.white,
        textAlign: 'center',
        flex: 1,
    },
    headerSubtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
        textAlign: 'center',
        fontWeight: '500',
    },
    imageContainer: { position: 'relative' },
    dateBadge: {
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: 5,
        borderRadius: 8,
        alignItems: 'center',
        minWidth: 40,
    },
    dateBadgeText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
    dateBadgeMonth: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase' },
    eventsCountContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
    eventsCountBadge: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    eventsCountText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { marginTop: 10, color: COLORS.textSecondary },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
    emptyIcon: { marginBottom: 20 },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.textPrimary },
    emptyText: { textAlign: 'center', color: COLORS.textSecondary },
    listContainer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
    columnWrapper: { justifyContent: 'space-between', marginBottom: 16 },
    eventCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    eventImage: { width: '100%', height: 120 },
    cardContent: { padding: 12 },
    eventTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    locationText: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
});