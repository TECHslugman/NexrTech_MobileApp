import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    Image, 
    ActivityIndicator,
    FlatList,
    StatusBar 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';

const COLORS = {
    bg: '#FFFFFF',
    primary: '#769FCD',
    text: '#1E293B',
    textMuted: '#64748B',
    cardBg: '#FFFFFF',
    border: '#E2E8F0',
    buttonBg: '#769FCD',
};

export default function EventDetail() {
    const router = useRouter();
    const { id, eventTitle, eventImage } = useLocalSearchParams();
    const { userToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const response = await fetch(`https://edu-agent-backend-nine.vercel.app/api/v1/agency/events/detail/${id}`, {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                });

                if (response.ok) {
                    const json = await response.json();
                    setData({
                        title: json.event?.title || eventTitle || "Event",
                        image: eventImage || json.event?.image || null,
                        date: json.event?.date || "Date not specified",
                        time: json.event?.time || "Time not specified",
                        location: json.event?.location || "Location not specified",
                        about: json.event?.about || "No description available",
                        agenda: json.event?.agenda || ["Event agenda details will be updated soon"],
                        registration: json.event?.registration || { fee: "Free", seats: "100", deadline: "TBA" }
                    });
                } else {
                    throw new Error("No data");
                }
            } catch (error) {
                // Fallback data
                setData({
                    title: eventTitle || "Study Abroad Webinar",
                    image: eventImage || 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400&h=250&fit=crop',
                    date: "June 20, 2024",
                    time: "11:00 AM - 12:30 PM",
                    location: "Online via Zoom",
                    about: "This webinar is designed to help students understand the complete process of applying to study abroad, with a special focus on admissions, visa requirements, scholarships, and documentation.",
                    agenda: [
                        "Admission Process Overview",
                        "Visa Documentation Guidance",
                        "Scholarships & Financial Aid",
                        "Live Q&A Session"
                    ],
                    registration: {
                        fee: "Free Entry",
                        seats: "100",
                        deadline: "June 18, 2024"
                    }
                });
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id, userToken, eventTitle, eventImage]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!data) return null;

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    style={styles.backButton}
                >
                    <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Event Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.scrollContent}
            >
                {/* Event Image Banner */}
                <View style={styles.banner}>
                    <View style={styles.bannerOverlay} />
                    <Image 
                        source={{ uri: data.image }} 
                        style={styles.eventImage}
                        resizeMode="cover"
                    />
                </View>

                {/* Event Title */}
                <View style={styles.titleContainer}>
                    <Text style={styles.eventTitle}>{data.title}</Text>
                </View>

                {/* Info Cards */}
                <View style={styles.infoGrid}>
                    {/* Date */}
                    <View style={styles.infoCard}>
                        <View style={styles.infoIconContainer}>
                            <Feather name="calendar" size={18} color={COLORS.primary} />
                        </View>
                        <Text style={styles.infoLabel}>Date</Text>
                        <Text style={styles.infoValue}>{data.date}</Text>
                    </View>

                    {/* Time */}
                    <View style={styles.infoCard}>
                        <View style={styles.infoIconContainer}>
                            <Feather name="clock" size={18} color={COLORS.primary} />
                        </View>
                        <Text style={styles.infoLabel}>Time</Text>
                        <Text style={styles.infoValue}>{data.time}</Text>
                    </View>
                </View>

                {/* Location */}
                <View style={styles.locationCard}>
                    <View style={styles.locationIcon}>
                        <Feather name="map-pin" size={18} color={COLORS.primary} />
                    </View>
                    <Text style={styles.locationText}>{data.location}</Text>
                </View>

                {/* About Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Feather name="info" size={20} color={COLORS.primary} />
                        <Text style={styles.sectionTitle}>About This Event</Text>
                    </View>
                    <View style={styles.sectionContent}>
                        <Text style={styles.paragraph}>{data.about}</Text>
                    </View>
                </View>

                {/* Agenda Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Feather name="list" size={20} color={COLORS.primary} />
                        <Text style={styles.sectionTitle}>Event Agenda</Text>
                    </View>
                    <View style={styles.sectionContent}>
                        {data.agenda.map((item, index) => (
                            <View key={index} style={styles.agendaItem}>
                                <View style={styles.agendaNumber}>
                                    <Text style={styles.agendaNumberText}>{index + 1}</Text>
                                </View>
                                <Text style={styles.agendaText}>{item}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Registration Info */}
                <View style={styles.registrationCard}>
                    <View style={styles.registrationHeader}>
                        <Feather name="users" size={20} color="#FFFFFF" />
                        <Text style={styles.registrationTitle}>Registration Details</Text>
                    </View>
                    <View style={styles.registrationGrid}>
                        <View style={styles.registrationItem}>
                            <Text style={styles.registrationLabel}>Fee</Text>
                            <Text style={styles.registrationValue}>{data.registration.fee}</Text>
                        </View>
                        <View style={styles.registrationItem}>
                            <Text style={styles.registrationLabel}>Seats</Text>
                            <Text style={styles.registrationValue}>{data.registration.seats}</Text>
                        </View>
                        <View style={styles.registrationItem}>
                            <Text style={styles.registrationLabel}>Deadline</Text>
                            <Text style={styles.registrationValue}>{data.registration.deadline}</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Register Button */}
            <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.registerButton} activeOpacity={0.8}>
                    <Text style={styles.registerButtonText}>Register Now</Text>
                    <Feather name="arrow-right" size={18} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.bg,
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
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.primary,
        flex: 1,
        textAlign: 'center',
        marginLeft: -40,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    banner: {
        height: 200,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    bannerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(118, 159, 205, 0.9)',
    },
    eventImage: {
        width: '100%',
        height: '100%',
        position: 'relative',
        zIndex: 1,
    },
    titleContainer: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        alignItems: 'center',
    },
    eventTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.text,
        textAlign: 'center',
        lineHeight: 30,
    },
    infoGrid: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 16,
    },
    infoCard: {
        flex: 1,
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    infoIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(118, 159, 205, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    infoLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: '600',
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        textAlign: 'center',
    },
    locationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    locationIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(118, 159, 205, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    locationText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        flex: 1,
    },
    section: {
        marginBottom: 24,
        paddingHorizontal: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    sectionContent: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    paragraph: {
        fontSize: 15,
        color: COLORS.text,
        lineHeight: 24,
    },
    agendaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    agendaNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(118, 159, 205, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    agendaNumberText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.primary,
    },
    agendaText: {
        flex: 1,
        fontSize: 15,
        color: COLORS.text,
        lineHeight: 20,
    },
    registrationCard: {
        marginHorizontal: 20,
        marginBottom: 30,
        backgroundColor: COLORS.primary,
        borderRadius: 16,
        overflow: 'hidden',
    },
    registrationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
    registrationTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    registrationGrid: {
        padding: 20,
    },
    registrationItem: {
        marginBottom: 16,
    },
    registrationLabel: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.7)',
        marginBottom: 4,
    },
    registrationValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.bg,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    registerButton: {
        backgroundColor: COLORS.buttonBg,
        borderRadius: 12,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    registerButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});