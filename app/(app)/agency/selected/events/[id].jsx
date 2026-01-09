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
    bg: '#FFFFFF',
    primary: '#769FCD',
    text: '#769FCD',
    textMuted: '#64748B',
    cardBg: '#FFFFFF',
    border: '#E2E8F0',
};

export default function AllEvents() {
    const router = useRouter();
    const { id } = useLocalSearchParams(); // Agency ID
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
                // Simple fallback data
                setEvents([
                    { 
                        id: '1', 
                        _id: '1',
                        title: 'Higher Education Fair 2024', 
                        image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=250&fit=crop',
                        location: "Convention Center"
                    },
                    { 
                        id: '2', 
                        _id: '2',
                        title: 'Study Abroad Webinar', 
                        image: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400&h=250&fit=crop',
                        location: "Online"
                    },
                    { 
                        id: '3', 
                        _id: '3',
                        title: 'Nursing Career Workshop', 
                        image: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=400&h=250&fit=crop',
                        location: "Main Campus"
                    },
                    { 
                        id: '4', 
                        _id: '4',
                        title: 'Visa & Immigration Seminar', 
                        image: 'https://images.unsplash.com/photo-1551135049-8a33b2fb2f61?w=400&h=250&fit=crop',
                        location: "Conference Hall"
                    },
                    { 
                        id: '5', 
                        _id: '5',
                        title: 'Scholarship Application Day', 
                        image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=400&h=250&fit=crop',
                        location: "Student Center"
                    },
                    { 
                        id: '6', 
                        _id: '6',
                        title: 'University Open Day', 
                        image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=250&fit=crop',
                        location: "Main Auditorium"
                    },
                ]);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, [id, userToken]);

    const renderEventItem = ({ item }) => {
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
                            eventImage: item.image || "" // Pass the image URL
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
                    
                    <View style={styles.locationRow}>
                        <Feather name="map-pin" size={12} color={COLORS.textMuted} />
                        <Text style={styles.locationText} numberOfLines={1}>
                            {item.location || "Online"}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    style={styles.backButton}
                >
                    <Ionicons name="chevron-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Events</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : events.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Feather name="calendar" size={48} color="#CBD5E1" />
                    <Text style={styles.emptyText}>No events available</Text>
                </View>
            ) : (
                <FlatList
                    data={events}
                    numColumns={2}
                    keyExtractor={(item, index) => (item._id || item.id || index).toString()}
                    renderItem={renderEventItem}
                    contentContainerStyle={styles.listContainer}
                    columnWrapperStyle={styles.columnWrapper}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { 
        flex: 1, 
        backgroundColor: COLORS.bg 
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.bg,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
        flex: 1,
        textAlign: 'center',
        marginLeft: -40,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    emptyText: {
        fontSize: 16,
        color: COLORS.textMuted,
    },
    listContainer: { 
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 24,
    },
    columnWrapper: { 
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    eventCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    eventImage: {
        width: '100%',
        height: 120,
    },
    cardContent: {
        padding: 12,
    },
    eventTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
        lineHeight: 20,
        marginBottom: 8,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    locationText: {
        fontSize: 12,
        color: COLORS.textMuted,
        flex: 1,
    },
});