import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList,
    Image, ActivityIndicator, StatusBar, useWindowDimensions, TextInput
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';
import { Config } from '../../../../config';

const COLORS = {
    bg: '#F8FAFD',
    primary: '#769FCD',
    white: '#FFFFFF',
    textPrimary: '#2D3748',
    textSecondary: '#718096',
    online: '#48BB78',
    venue: '#769FCD',
    dateBg: 'rgba(255, 255, 255, 0.92)',
    border: '#EDF2F7'
};

export default function AllEvents() {
    const router = useRouter();
    const { id, agencyName } = useLocalSearchParams();
    const { userToken } = useAuth();
    const { width } = useWindowDimensions();

    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    // Unified Load Function
    const loadEvents = async (query = '') => {
        try {
            if (query.length > 0) setIsSearching(true);
            else setLoading(true);

            // Toggle URL based on search input
            const url = query.trim().length > 0
                ? `${Config.API_BASE_URL}/agency/events/student/${id}?search=${query}`
                : `${Config.API_BASE_URL}/agency/events/student/${id}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });

            const json = await response.json();
            if (response.ok) {
                const rawEvents = Array.isArray(json.events) ? json.events : (Array.isArray(json) ? json : []);

                const formattedEvents = rawEvents.map(event => {
                    const startDate = new Date(event.startAt || event.date || event.createdAt);
                    const eventMode = event.meetings && event.meetings.length > 0 
                        ? event.meetings[0].mode 
                        : 'venue';

                    return {
                        ...event,
                        id: event._id || event.id,
                        mode: eventMode, 
                        displayDay: !isNaN(startDate.getTime()) ? startDate.toLocaleDateString('en-US', { day: '2-digit' }) : "??",
                        displayMonth: !isNaN(startDate.getTime()) ? startDate.toLocaleDateString('en-US', { month: 'short' }) : "TBA",
                        fullDate: startDate.toISOString()
                    };
                });
                setEvents(formattedEvents);
            }
        } catch (error) {
            console.log("Fetch error:", error);
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    };

    useEffect(() => {
        loadEvents();
    }, [id, userToken]);

    const renderEventItem = ({ item }) => {
        const cardWidth = (width - 48) / 2;
        const displayImage = item.bannerImageUrl || item.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400';

        return (
            <TouchableOpacity
                style={[styles.eventCard, { width: cardWidth }]}
                activeOpacity={0.7}
                onPress={() => router.push({
                    pathname: '/agency/selected/events/details',
                    params: { id: item.id, eventTitle: item.title, eventImage: displayImage, eventDate: item.fullDate, eventMode: item.mode }
                })}
            >
                <View style={styles.imageContainer}>
                    <Image source={{ uri: displayImage }} style={styles.eventImage} resizeMode="cover" />
                    
                    <View style={styles.cardOverlayHeader}>
                        <View style={[styles.modeBadge, { backgroundColor: item.mode === 'online' ? COLORS.online : COLORS.venue }]}>
                            <Text style={styles.modeBadgeText}>{item.mode}</Text>
                        </View>

                        <View style={styles.dateBadge}>
                            <Text style={styles.dateDay}>{item.displayDay}</Text>
                            <Text style={styles.dateMonth}>{item.displayMonth}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.cardContent}>
                    <Text style={styles.eventTitle} numberOfLines={2}>{item.title}</Text>
                    <View style={styles.locationRow}>
                        <Feather name="map-pin" size={12} color={COLORS.primary} />
                        <Text style={styles.locationText} numberOfLines={1}>
                            {typeof item.location === 'object' ? item.location.venueName : (item.location || "Venue TBA")}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{agencyName || 'Agency'}</Text>
                    <View style={{ width: 40 }} />
                </View>
                <Text style={styles.headerSubtitle}>Events & Seminars</Text>

                {/* Search Bar built into Header */}
                <View style={styles.searchWrapper}>
                    <Ionicons name="search" size={18} color={COLORS.textSecondary} />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="Search for events..."
                        placeholderTextColor="#A0AEC0"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={() => loadEvents(searchQuery)}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearchQuery(''); loadEvents(''); }}>
                            <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
            ) : (
                <FlatList
                    data={events}
                    numColumns={2}
                    renderItem={renderEventItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContainer}
                    columnWrapperStyle={styles.columnWrapper}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="calendar-outline" size={60} color={COLORS.border} />
                            <Text style={styles.emptyText}>No events found</Text>
                        </View>
                    }
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
    center: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    header: { 
        backgroundColor: COLORS.primary, 
        paddingBottom: 25, 
        borderBottomLeftRadius: 30, 
        borderBottomRightRadius: 30, 
        paddingHorizontal: 20,
        paddingTop: 10
    },
    headerContent: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginTop: 10 
    },
    headerTitle: { 
        color: COLORS.white, 
        fontSize: 18, 
        fontWeight: '700', 
        flex: 1, 
        textAlign: 'center' 
    },
    headerSubtitle: { 
        color: 'rgba(255,255,255,0.9)', 
        textAlign: 'center', 
        marginTop: 4,
        marginBottom: 15,
        fontSize: 14 
    },
    backButton: { 
        width: 40, 
        height: 40, 
        borderRadius: 12, 
        backgroundColor: 'rgba(255,255,255,0.2)', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    searchWrapper: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 45,
        alignItems: 'center',
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        color: COLORS.textPrimary,
    },
    listContainer: { 
        padding: 16 
    },
    columnWrapper: { 
        justifyContent: 'space-between', 
        marginBottom: 16 
    },
    
    // Card Styles - No shadows, clean borders
    eventCard: { 
        backgroundColor: COLORS.white, 
        borderRadius: 20, 
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    imageContainer: { 
        height: 125, 
        width: '100%' 
    },
    eventImage: { 
        width: '100%', 
        height: '100%' 
    },
    
    // Header overlay
    cardOverlayHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: 8,
    },
    
    modeBadge: { 
        paddingHorizontal: 8, 
        paddingVertical: 4, 
        borderRadius: 8,
        maxWidth: '60%'
    },
    modeBadgeText: { 
        color: COLORS.white, 
        fontSize: 9, 
        fontWeight: '800', 
        textTransform: 'uppercase' 
    },
    
    dateBadge: { 
        backgroundColor: COLORS.dateBg, 
        width: 38, 
        height: 40, 
        borderRadius: 10, 
        alignItems: 'center', 
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border
    },
    dateDay: { 
        fontSize: 13, 
        fontWeight: '800', 
        color: '#2D3748', 
        lineHeight: 14 
    },
    dateMonth: { 
        fontSize: 8, 
        fontWeight: '700', 
        color: '#769FCD', 
        textTransform: 'uppercase' 
    },
    
    cardContent: { 
        padding: 12 
    },
    eventTitle: { 
        fontSize: 13, 
        fontWeight: '700', 
        color: '#2D3748', 
        marginBottom: 6, 
        height: 38 
    },
    locationRow: { 
        flexDirection: 'row', 
        alignItems: 'center' 
    },
    locationText: { 
        fontSize: 10, 
        color: '#718096', 
        marginLeft: 4, 
        flex: 1 
    },
    emptyState: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        paddingVertical: 80 
    },
    emptyText: { 
        fontSize: 18, 
        fontWeight: '600', 
        color: COLORS.textSecondary, 
        marginTop: 20 
    },
});