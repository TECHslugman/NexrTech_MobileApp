import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    StatusBar
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

export default function EventDetail() {
    const router = useRouter();
    const { id, eventTitle, eventImage, eventDate, eventLocation } = useLocalSearchParams();
    const { userToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const response = await fetch(`${BASE_URL}/agency/events/profile/${id}`, {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                });

                const json = await response.json();
                
                if (response.ok && json.event) {
                    const e = json.event;
                    setData({
                        title: e.title,
                        subtitle: e.subtitle,
                        image: e.bannerImageUrl || eventImage,
                        date: e.startAt,
                        location: e.location?.venueName || e.location?.addressLine || eventLocation,
                        address: e.location?.addressLine,
                        about: e.about || e.description,
                        whoShouldAttend: e.whoShouldAttend,
                        agenda: e.agendaItems || []
                    });
                } else {
                    throw new Error("Failed to load event data");
                }
            } catch (error) {
                console.log("Fetch Error:", error.message);
                // Use only the params we received
                setData({
                    title: eventTitle,
                    image: eventImage,
                    date: eventDate,
                    location: eventLocation,
                    about: "Event details not available.",
                    agenda: []
                });
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id]);

    const formatDate = (dateString) => {
        if (!dateString) return "Date TBA";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    };

    const formatTime = (dateString) => {
        if (!dateString) return "Time TBA";
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    if (loading) return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading event details...</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>Event Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.scrollContent}
            >
                {/* Event Image */}
                <Image source={{ uri: data.image }} style={styles.eventImage} />
                
                {/* Main Content */}
                <View style={styles.contentCard}>
                    {/* Event Title Section */}
                    <View style={styles.titleContainer}>
                        <Text style={styles.eventTitle}>{data.title}</Text>
                        {data.subtitle && <Text style={styles.subtitle}>{data.subtitle}</Text>}
                    </View>

                    {/* Event Info Cards */}
                    <View style={styles.infoCardsContainer}>
                        {/* Date Card */}
                        <View style={styles.infoCard}>
                            <View style={[styles.infoIcon, { backgroundColor: 'rgba(118, 159, 205, 0.15)' }]}>
                                <Feather name="calendar" size={20} color={COLORS.primary} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>DATE</Text>
                                <Text style={styles.infoValue}>{formatDate(data.date)}</Text>
                            </View>
                        </View>

                        {/* Time Card */}
                        <View style={styles.infoCard}>
                            <View style={[styles.infoIcon, { backgroundColor: 'rgba(118, 159, 205, 0.15)' }]}>
                                <Feather name="clock" size={20} color={COLORS.primary} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>TIME</Text>
                                <Text style={styles.infoValue}>{formatTime(data.date)}</Text>
                            </View>
                        </View>

                        {/* Location Card */}
                        <View style={styles.infoCard}>
                            <View style={[styles.infoIcon, { backgroundColor: 'rgba(118, 159, 205, 0.15)' }]}>
                                <Feather name="map-pin" size={20} color={COLORS.primary} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>VENUE</Text>
                                <Text style={styles.infoValue} numberOfLines={1}>{data.location}</Text>
                                {data.address && (
                                    <Text style={styles.infoSubValue} numberOfLines={1}>{data.address}</Text>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* About Event Section */}
                    {data.about && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.sectionIcon}>
                                    <Feather name="info" size={18} color={COLORS.primary} />
                                </View>
                                <Text style={styles.sectionTitle}>About This Event</Text>
                            </View>
                            <Text style={styles.paragraph}>{data.about}</Text>
                        </View>
                    )}

                    {/* Who Should Attend Section */}
                    {data.whoShouldAttend && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.sectionIcon}>
                                    <Feather name="users" size={18} color={COLORS.primary} />
                                </View>
                                <Text style={styles.sectionTitle}>Who Should Attend</Text>
                            </View>
                            <Text style={styles.paragraph}>{data.whoShouldAttend}</Text>
                        </View>
                    )}

                    {/* Agenda Section */}
                    {data.agenda && data.agenda.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.sectionIcon}>
                                    <Feather name="list" size={18} color={COLORS.primary} />
                                </View>
                                <Text style={styles.sectionTitle}>Event Agenda</Text>
                            </View>
                            <View style={styles.agendaContainer}>
                                {data.agenda.map((item, index) => (
                                    <View key={index} style={styles.agendaItem}>
                                        <View style={styles.agendaBullet} />
                                        <Text style={styles.agendaText}>{item}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}
                </View>
                
                {/* Bottom Spacing for the button */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Fixed Register Button */}
            <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.registerButton} activeOpacity={0.9}>
                    <Text style={styles.registerText}>Register for Event</Text>
                    <Feather name="arrow-right" size={20} color={COLORS.white} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: COLORS.bg 
    },
    center: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: COLORS.bg
    },
    loadingText: {
        marginTop: 16,
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    header: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    headerTitle: { 
        color: COLORS.white, 
        fontSize: 18, 
        fontWeight: '700', 
        flex: 1, 
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    backButton: { 
        width: 40, 
        height: 40, 
        borderRadius: 20, 
        backgroundColor: 'rgba(255,255,255,0.2)', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    eventImage: { 
        width: '100%', 
        height: 220,
    },
    contentCard: { 
        backgroundColor: COLORS.white, 
        borderTopLeftRadius: 24, 
        borderTopRightRadius: 24, 
        marginTop: -20, 
        padding: 20,
        paddingBottom: 30,
    },
    titleContainer: {
        marginBottom: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    eventTitle: { 
        fontSize: 24, 
        fontWeight: '700', 
        color: COLORS.textPrimary,
        lineHeight: 30,
        marginBottom: 8,
    },
    subtitle: { 
        fontSize: 16, 
        color: COLORS.primary, 
        fontWeight: '500',
        lineHeight: 22,
    },
    infoCardsContainer: {
        marginBottom: 28,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primaryLight,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    infoIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginBottom: 4,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    infoValue: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
        lineHeight: 20,
    },
    infoSubValue: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
        lineHeight: 18,
    },
    section: {
        marginBottom: 28,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    paragraph: {
        fontSize: 15,
        color: COLORS.textSecondary,
        lineHeight: 24,
    },
    agendaContainer: {
        backgroundColor: COLORS.primaryLight,
        borderRadius: 16,
        padding: 20,
    },
    agendaItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    agendaBullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.primary,
        marginTop: 9,
        marginRight: 12,
    },
    agendaText: {
        flex: 1,
        fontSize: 14,
        color: COLORS.textPrimary,
        lineHeight: 22,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    registerButton: {
        backgroundColor: COLORS.primary,
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    registerText: {
        color: COLORS.white,
        fontWeight: '600',
        fontSize: 16,
        marginRight: 8,
        letterSpacing: 0.3,
    },
});