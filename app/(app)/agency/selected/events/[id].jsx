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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';

const BASE_URL = 'https://edu-agent-backend-nine.vercel.app/api/v1';
const DEFAULT_EVENT_IMG = 'https://ehef.id/storage/files/shares/logo-ehef-id.png';

const COLORS = {
    bg: '#F8FAFD',
    primary: '#87A1C5', 
    white: '#FFFFFF',
    border: '#EEF2F7',
    text: '#444'
};

export default function AllEvents() {
    const router = useRouter();
    const { id } = useLocalSearchParams(); // This is the Agency ID
    const { userToken } = useAuth();
    const { width } = useWindowDimensions();

    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState([]);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                // Endpoint ready for your backend integration
                const response = await fetch(`${BASE_URL}/agency/events/${id}`, {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                });

                const json = await response.json();
                if (response.ok && (json.events || json.data)) {
                    setEvents(json.events || json.data);
                } else {
                    throw new Error("No data");
                }
            } catch (error) {
                // Fallback Provisionary Data if API fails or is not yet active
                setEvents([
                    { id: '1', title: 'Higher Education Fair', image: DEFAULT_EVENT_IMG },
                    { id: '2', title: 'Global Study Webinar', image: null },
                    { id: '3', title: 'Nursing Workshop', image: null },
                    { id: '4', title: 'Visa Guidance 2026', image: DEFAULT_EVENT_IMG },
                ]);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, [id]);

    const renderEventItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.eventCard, { width: (width - 50) / 2 }]}
            activeOpacity={0.8}
            onPress={() => {
                // ROUTING LOGIC: Points to /events/details/[id].jsx
                router.push({
                    pathname: `/agency/selected/events/details/${item.id}`,
                    params: { agencyId: id } // Passing agency context if needed
                });
            }}
        >
            <View style={styles.imageContainer}>
                <Image
                    source={item.image ? { uri: item.image } : { uri: 'https://via.placeholder.com/150' }}
                    style={styles.eventImage}
                    resizeMode="contain"
                />
            </View>
            <View style={styles.cardFooter}>
                <Text style={styles.eventTitle} numberOfLines={2}>{item.title}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" />

            {/* Simple Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Events</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={events}
                    numColumns={2}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderEventItem}
                    columnWrapperStyle={styles.row}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 15,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border
    },
    headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.primary },
    backBtn: { padding: 5 },
    listContainer: { paddingVertical: 20, paddingBottom: 50 },
    row: { justifyContent: 'space-between', paddingHorizontal: 20 },
    eventCard: {
        backgroundColor: COLORS.white,
        borderRadius: 15,
        marginBottom: 20,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    imageContainer: {
        width: '100%',
        height: 110,
        backgroundColor: '#fff',
        padding: 15,
        justifyContent: 'center',
        alignItems: 'center'
    },
    eventImage: { width: '100%', height: '100%' },
    cardFooter: {
        padding: 12,
        backgroundColor: '#fff',
        minHeight: 55,
        justifyContent: 'center',
        alignItems: 'center'
    },
    eventTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.text,
        textAlign: 'center'
    }
});
