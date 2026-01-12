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

const COLORS = {
    bg: '#F8FAFD',
    primary: '#769FCD',
    primaryLight: 'rgba(118, 159, 205, 0.1)',
    white: '#FFFFFF',
    textPrimary: '#2D3748',
    textSecondary: '#718096',
    border: '#EEF2F7',
    cardBg: '#FFFFFF',
    danger: '#FF6B6B',
    success: '#4CAF50',
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
                const response = await fetch(`https://edu-agent-backend-nine.vercel.app/api/v1/agency/events/detail/${id}`, {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                });

                if (response.ok) {
                    const json = await response.json();
                    setData({
                        title: json.event?.title || eventTitle || "Event",
                        image: eventImage || json.event?.image || null,
                        date: json.event?.date || eventDate || "Date not specified",
                        time: json.event?.time || "Time not specified",
                        location: json.event?.location || eventLocation || "Location not specified",
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
                    date: eventDate || "June 20, 2024",
                    time: "11:00 AM - 12:30 PM",
                    location: eventLocation || "Online via Zoom",
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
    }, [id, userToken, eventTitle, eventImage, eventDate, eventLocation]);

    const formatDate = (dateString) => {
        if (!dateString || dateString === "Date not specified") return "Date TBA";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!data) return null;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
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
                    <Text style={styles.headerTitle}>Event Details</Text>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.scrollContent}
            >
                {/* Event Image Banner */}
                <View style={styles.bannerContainer}>
                    <Image 
                        source={{ uri: data.image }} 
                        style={styles.eventImage}
                        resizeMode="cover"
                    />
                    <View style={styles.imageOverlay} />
                </View>

                {/* Main Content Card */}
                <View style={styles.contentCard}>
                    {/* Event Title */}
                    <Text style={styles.eventTitle}>{data.title}</Text>
                    
                    {/* Event Details Row */}
                    <View style={styles.detailsRow}>
                        <View style={styles.detailItem}>
                            <View style={[styles.detailIcon, { backgroundColor: COLORS.primaryLight }]}>
                                <Feather name="calendar" size={16} color={COLORS.primary} />
                            </View>
                            <View style={styles.detailText}>
                                <Text style={styles.detailLabel}>Date</Text>
                                <Text style={styles.detailValue}>{formatDate(data.date)}</Text>
                            </View>
                        </View>
                        
                        <View style={styles.detailItem}>
                            <View style={[styles.detailIcon, { backgroundColor: COLORS.primaryLight }]}>
                                <Feather name="clock" size={16} color={COLORS.primary} />
                            </View>
                            <View style={styles.detailText}>
                                <Text style={styles.detailLabel}>Time</Text>
                                <Text style={styles.detailValue}>{data.time}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Location */}
                    <View style={styles.locationContainer}>
                        <View style={[styles.locationIcon, { backgroundColor: COLORS.primaryLight }]}>
                            <Feather name="map-pin" size={18} color={COLORS.primary} />
                        </View>
                        <View style={styles.locationTextContainer}>
                            <Text style={styles.locationLabel}>Venue</Text>
                            <Text style={styles.locationValue}>{data.location}</Text>
                        </View>
                    </View>

                    {/* About Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Feather name="info" size={20} color={COLORS.primary} />
                            <Text style={styles.sectionTitle}>About This Event</Text>
                        </View>
                        <Text style={styles.paragraph}>{data.about}</Text>
                    </View>

                    {/* Agenda Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Feather name="list" size={20} color={COLORS.primary} />
                            <Text style={styles.sectionTitle}>Event Agenda</Text>
                        </View>
                        <View style={styles.agendaContainer}>
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

                    {/* Registration Details Card */}
                    <View style={styles.registrationCard}>
                        <View style={styles.registrationHeader}>
                            <Feather name="clipboard" size={20} color={COLORS.white} />
                            <Text style={styles.registrationTitle}>Registration Details</Text>
                        </View>
                        
                        <View style={styles.registrationGrid}>
                            <View style={styles.registrationItem}>
                                <Text style={styles.registrationLabel}>Participation Fee</Text>
                                <Text style={styles.registrationValue}>{data.registration.fee}</Text>
                            </View>
                            
                            <View style={styles.registrationItem}>
                                <Text style={styles.registrationLabel}>Available Seats</Text>
                                <Text style={styles.registrationValue}>{data.registration.seats}</Text>
                            </View>
                            
                            <View style={styles.registrationItem}>
                                <Text style={styles.registrationLabel}>Registration Deadline</Text>
                                <Text style={styles.registrationValue}>{data.registration.deadline}</Text>
                            </View>
                        </View>
                    </View>
                </View>
                
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Fixed Register Button */}
            <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.registerButton} activeOpacity={0.85}>
                    <Text style={styles.registerButtonText}>Register Now</Text>
                    <Feather name="arrow-right" size={20} color={COLORS.white} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.bg,
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
    scrollContent: {
        paddingBottom: 20,
    },
    // Banner Image
    bannerContainer: {
        height: 220,
        position: 'relative',
    },
    eventImage: {
        width: '100%',
        height: '100%',
    },
    imageOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
    },
    // Main Content Card
    contentCard: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: -30,
        paddingHorizontal: 24,
        paddingTop: 30,
        paddingBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    eventTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 20,
        lineHeight: 32,
    },
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    detailItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bg,
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    detailIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    detailText: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bg,
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    locationIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    locationTextContainer: {
        flex: 1,
    },
    locationLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    locationValue: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    section: {
        marginBottom: 28,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginLeft: 10,
    },
    paragraph: {
        fontSize: 15,
        color: COLORS.textSecondary,
        lineHeight: 24,
    },
    agendaContainer: {
        backgroundColor: COLORS.bg,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    agendaItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    agendaNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        marginTop: 2,
    },
    agendaNumberText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.primary,
    },
    agendaText: {
        flex: 1,
        fontSize: 15,
        color: COLORS.textPrimary,
        lineHeight: 22,
    },
    registrationCard: {
        backgroundColor: COLORS.primary,
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    registrationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    registrationTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.white,
        marginLeft: 10,
    },
    registrationGrid: {
        padding: 20,
    },
    registrationItem: {
        marginBottom: 16,
    },
    registrationLabel: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: 4,
    },
    registrationValue: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.white,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        paddingHorizontal: 24,
        paddingVertical: 20,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    registerButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 16,
        paddingVertical: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        elevation: 2,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    registerButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: COLORS.white,
    },
});