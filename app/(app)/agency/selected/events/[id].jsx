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
    const { id, agencyName } = useLocalSearchParams(); // Agency ID and name
    const { userToken } = useAuth();
    const { width } = useWindowDimensions();

    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState([]);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const response = await fetch(`${BASE_URL}/agency/events/agency/${id}`, {
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
                // Fallback data with better images
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
                    },
                    { 
                        id: '3', 
                        _id: '3',
                        title: 'Nursing Career Workshop', 
                        image: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=400&h=250&fit=crop',
                        location: "Main Campus",
                        date: "2024-04-05"
                    },
                    { 
                        id: '4', 
                        _id: '4',
                        title: 'Visa & Immigration Seminar', 
                        image: 'https://images.unsplash.com/photo-1551135049-8a33b2fb2f61?w=400&h=250&fit=crop',
                        location: "Conference Hall",
                        date: "2024-03-28"
                    },
                    { 
                        id: '5', 
                        _id: '5',
                        title: 'Scholarship Application Day', 
                        image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=400&h=250&fit=crop',
                        location: "Student Center",
                        date: "2024-04-10"
                    },
                    { 
                        id: '6', 
                        _id: '6',
                        title: 'University Open Day', 
                        image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=250&fit=crop',
                        location: "Main Auditorium",
                        date: "2024-04-22"
                    },
                ]);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, [id, userToken]);

    const formatDate = (dateString) => {
        if (!dateString) return "Date TBA";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const renderEventItem = ({ item, index }) => {
        const eventId = item._id || item.id;
        const cardWidth = (width - 48) / 2;
        
        return (
            <TouchableOpacity
                style={[styles.eventCard, { width: cardWidth }]}
                activeOpacity={0.85}
                onPress={() => {
                    router.push({
                        pathname: '/agency/selected/events/details',
                        params: { 
                            id: eventId,
                            agencyId: id,
                            eventTitle: item.title || "Event",
                            eventImage: item.image || "",
                            eventDate: item.date || "",
                            eventLocation: item.location || ""
                        }
                    });
                }}
            >
                <Image
                    source={{ uri: item.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=250&fit=crop' }}
                    style={styles.eventImage}
                    resizeMode="cover"
                />
                
                <View style={styles.cardContent}>
                    <Text style={styles.eventTitle} numberOfLines={2}>
                        {item.title || "Event"}
                    </Text>
                    
                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Feather name="calendar" size={12} color={COLORS.textSecondary} />
                            <Text style={styles.infoText} numberOfLines={1}>
                                {formatDate(item.date)}
                            </Text>
                        </View>
                        
                        <View style={styles.infoItem}>
                            <Feather name="map-pin" size={12} color={COLORS.textSecondary} />
                            <Text style={styles.infoText} numberOfLines={1}>
                                {item.location || "TBA"}
                            </Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

            {/* Header with consistent blue design */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="chevron-back" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        {agencyName ? `${agencyName}` : 'Agency'}
                    </Text>
                    <View style={{ width: 40 }} />
                </View>
                <Text style={styles.headerSubtitle}>
                    Events & Seminars
                </Text>
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
                    <Text style={styles.emptyText}>
                        Check back later for upcoming events
                    </Text>
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
    safe: { 
        flex: 1, 
        backgroundColor: COLORS.bg 
    },
    // Header with consistent blue design
    header: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 20,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        elevation: 4,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
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
        fontSize: 22,
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
    eventsCountContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
    },
    eventsCountBadge: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    eventsCountText: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    emptyIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(118, 159, 205, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    listContainer: { 
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 40,
    },
    columnWrapper: { 
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    eventCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    eventImage: {
        width: '100%',
        height: 130,
    },
    cardContent: {
        padding: 16,
    },
    eventTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
        lineHeight: 20,
        marginBottom: 12,
        letterSpacing: 0.2,
    },
    infoRow: {
        gap: 8,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    infoText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        flex: 1,
    },
});