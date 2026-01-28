import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
    FlatList, Image, useWindowDimensions, ActivityIndicator, StatusBar, Linking
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { Config } from '../../../config';

const DEFAULT_IMAGE = require('../../../../assets/images/agencies/default.png');

const COLORS = {
    bg: '#F8FAFD',
    primary: '#769FCD',
    sectionTitle: '#2D3748',
    viewAll: '#718096',
    white: '#FFFFFF',
    border: '#EEF2F7',
    cardBg: '#FFFFFF',
    textPrimary: '#2D3748',
    textSecondary: '#718096',
    accent: '#E2E8F0',
    lightBlue: '#E8F1FF',
    online: '#48BB78', // Green for online
    seated: '#ED8936', // Orange for seated
};
const GAP = 12;
const CARD_BORDER_RADIUS = 16;

export default function SelectedAgencyHome() {
    const router = useRouter();
    const { id, name, agencyLogo } = useLocalSearchParams();
    const { userToken, setActiveAgency } = useAuth();

    const [loading, setLoading] = useState(true);
    const [agencyData, setAgencyData] = useState(null);
    const [courses, setCourses] = useState([]);
    const [events, setEvents] = useState([]);
    const [scholarships, setScholarships] = useState([]);
    const [mentors, setMentors] = useState([]);

    useEffect(() => {
        const fetchAllData = async () => {
            if (!userToken || !id) return;
            setLoading(true);

            try {
                console.log(`📡 Fetching Agency Data [ID: ${id}]`);

                const endpoints = [
                    `${Config.API_BASE_URL}/agency/profile/${id}`,
                    `${Config.API_BASE_URL}/agency/universities/agency/${id}`,
                    `${Config.API_BASE_URL}/agency/courses/agency/${id}`,
                    `${Config.API_BASE_URL}/agency/events/student/${id}`,
                    `${Config.API_BASE_URL}/agency/scholarships/agency/${id}`,
                    `${Config.API_BASE_URL}/students/mentors/${id}`
                ];

                const headers = {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                };

                const responses = await Promise.all(
                    endpoints.map(url => fetch(url, { headers }))
                );

                const [agencyRes, uniRes, coursesRes, eventsRes, scholarRes, mentorRes] = responses;

                let completeAgencyData = {
                    partnerUniversities: [],
                    courses: [],
                    events: [],
                    scholarships: [],
                    mentors: []
                };

                // 1. Agency Profile
                if (agencyRes.ok) {
                    const aJson = await agencyRes.json();
                    const profile = aJson.agency || aJson.profile || aJson;
                    completeAgencyData = { ...completeAgencyData, ...profile };
                    setActiveAgency({
                        id: id,
                        name: profile.organizationName || name || profile.name || "Agency",
                        logo: profile.logo || agencyLogo
                    });
                }

                // 2. Universities
                if (uniRes.ok) {
                    const uJson = await uniRes.json();
                    completeAgencyData.partnerUniversities = uJson.university?.partnerUniversities || uJson.partnerUniversities || [];
                }

                // 3. Courses
                if (coursesRes.ok) {
                    const cJson = await coursesRes.json();
                    const courseList = (cJson.courses || cJson || []).map(c => ({
                        id: c._id || c.id || Math.random().toString(),
                        title: c.title || c.name || "Course"
                    }));
                    setCourses(courseList);
                    completeAgencyData.courses = courseList;
                }

                // 4. Events
                if (eventsRes.ok) {
                    const eJson = await eventsRes.json();
                    const rawEvents = Array.isArray(eJson.events) ? eJson.events : (Array.isArray(eJson) ? eJson : []);

                    const formattedEvents = rawEvents.map(event => {
                        const startDate = new Date(event.startAt || event.date || event.createdAt);

                        const eventMode = event.meetings && event.meetings.length > 0
                            ? event.meetings[0].mode
                            : 'venue';

                        return {
                            ...event,
                            id: event._id || event.id,
                            mode: eventMode,
                            bannerImage: event.bannerImageUrl || event.image,
                            date: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                            time: startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                        };
                    });
                    setEvents(formattedEvents);
                    completeAgencyData.events = formattedEvents;
                }

                // 5. Scholarships
                if (scholarRes.ok) {
                    const sJson = await scholarRes.json();
                    const rawScholar = sJson.scholarship || sJson || [];
                    const formattedScholar = rawScholar.map(s => ({
                        id: s._id || s.id,
                        title: s.title || "Scholarship Program",
                        amount: s.amount || s.funding
                    }));
                    setScholarships(formattedScholar);
                    completeAgencyData.scholarships = formattedScholar;
                }

                // 6. Mentors
                if (mentorRes.ok) {
                    const mJson = await mentorRes.json();
                    const rawMentors = mJson.mentors || [];

                    const formattedMentors = rawMentors.map(m => ({
                        id: m._id,
                        name: m.name,
                        profilepic: m.profilepic,
                        experience: m.experiences && m.experiences.length > 0
                            ? m.experiences[0]
                            : "Professional mentor for higher education"
                    }));

                    setMentors(formattedMentors);
                }

                setAgencyData(completeAgencyData);
            } catch (error) {
                console.error("❌ FetchAllData Error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [id, userToken]);

    if (loading) {
        return (
            <View style={[styles.safe, styles.center]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={styles.agencyInfo}>
                        <View style={styles.agencyBadge}>
                            {agencyData?.logo ? (
                                <Image
                                    source={{ uri: agencyData.logo }}
                                    style={{ width: '100%', height: '100%', borderRadius: 12 }}
                                    resizeMode="contain"
                                />
                            ) : (
                                <Text style={styles.agencyInitial}>
                                    {(agencyData?.organizationName || 'A').charAt(0).toUpperCase()}
                                </Text>
                            )}
                        </View>
                        <View>
                            <Text style={styles.agencyName}>{agencyData?.organizationName || "Agency"}</Text>
                            <Text style={styles.agencyTagline}>Education Services</Text>
                        </View>
                    </View>
                    {/* Notification icon removed as requested */}
                </View>
                <View style={styles.searchContainer}>
                    <Feather name="search" size={20} color="#B0BCCB" style={styles.searchIcon} />
                    <TextInput
                        placeholder="Search courses, events..."
                        style={styles.searchInput}
                        placeholderTextColor="#B0BCCB"
                    />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} overScrollMode="never">

                {/* QUICK STATS */}
                <View style={styles.statsContainer}>
                    {[
                        { icon: "school", label: "Course", count: courses.length },
                        { icon: "event", label: "Event", count: events.length },
                        { icon: "workspace-premium", label: "Scholarship", count: scholarships.length },
                        { icon: "people", label: "Mentor", count: mentors.length }
                    ].map((stat, idx) => (
                        <View key={idx} style={styles.statCard}>
                            <View style={styles.statIconContainer}>
                                <MaterialIcons name={stat.icon} size={20} color={COLORS.primary} />
                            </View>
                            <Text style={styles.statNumber}>{stat.count || 0}</Text>
                            <Text style={styles.statLabel}>{stat.label}</Text>
                        </View>
                    ))}
                </View>

                {/* COURSES - Now interactive with navigation */}
                <SectionHeader
                    title="Featured Courses"
                    onBtnPress={() => router.push({
                        pathname: `/agency/selected/courses/${id}`,
                        params: {
                            courses: JSON.stringify(courses),
                            agencyName: agencyData?.organizationName
                        }
                    })}
                />
                <FlatList
                    horizontal
                    data={courses}
                    keyExtractor={(item, index) => `course-${item._id || item.id || index}`}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item, index }) => (
                        <TouchableOpacity
                            style={[
                                styles.courseCard,
                                { backgroundColor: index % 2 === 0 ? '#FF6B6B' : '#949BFF' }
                            ]}
                            onPress={() => router.push({
                                pathname: `/agency/selected/courses/details`, // Directs to the detail page we built
                                params: {
                                    courseId: item._id || item.id,
                                    agencyId: id,
                                    courseName: item.title
                                }
                            })}
                        >
                            <View style={styles.courseIcon}>
                                <Ionicons name="book-outline" size={20} color="rgba(255,255,255,0.9)" />
                            </View>
                            <Text style={styles.courseText} numberOfLines={2}>
                                {item.title || item}
                            </Text>
                        </TouchableOpacity>
                    )}
                    ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
                />

                {/* EVENTS */}
                <SectionHeader title="Upcoming Events" onBtnPress={() => router.push(`/agency/selected/events/${id}`)} />
                {events.length > 0 ? (
                    <FlatList
                        horizontal
                        data={events}
                        keyExtractor={(item) => item._id || item.id}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.eventCardHorizontal}
                                onPress={() => router.push({
                                    pathname: `/agency/selected/events/details`,
                                    params: { id: item._id, title: item.title, image: item.bannerImageUrl, date: item.date, time: item.time }
                                })}
                            >
                                <View style={styles.imageWrapper}>
                                    <Image source={{ uri: item.bannerImageUrl }} style={styles.eventImgHorizontal} resizeMode="cover" />
                                    <View style={[styles.modeBadge, { backgroundColor: item.mode === 'online' ? COLORS.online : COLORS.primary }]}>
                                        <Text style={styles.modeBadgeText}>{item.mode}</Text>
                                    </View>
                                </View>

                                <View style={styles.eventContentHorizontal}>
                                    <Text style={styles.eventTitleHorizontal} numberOfLines={1}>{item.title}</Text>
                                    <View style={styles.eventDetails}>
                                        <View style={styles.eventDetailRow}>
                                            <Feather name="calendar" size={12} color={COLORS.textSecondary} />
                                            <Text style={styles.eventDetailText}>{item.date}</Text>
                                        </View>
                                        <View style={styles.eventDetailRow}>
                                            <Feather name="clock" size={12} color={COLORS.textSecondary} />
                                            <Text style={styles.eventDetailText}>{item.time}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.eventAction}>
                                        <Text style={styles.eventActionText}>Details</Text>
                                        <Feather name="arrow-right" size={12} color={COLORS.primary} />
                                    </View>
                                </View>
                            </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
                    />
                ) : (
                    <Text style={styles.noEventsText}>No upcoming events</Text>
                )}

                {/* SCHOLARSHIPS */}
                <SectionHeader title="Available Scholarships" onBtnPress={() => router.push({ pathname: `/agency/selected/scholarships/${id}`, params: { initialData: JSON.stringify(scholarships), agencyName: agencyData?.organizationName } })} />
                <FlatList
                    horizontal
                    data={scholarships}
                    keyExtractor={(item) => item.id}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.scholarshipCard} onPress={() => router.push({ pathname: `/agency/selected/scholarships/details`, params: { id: item.id, title: item.title } })}>
                            <View style={styles.scholarshipHeader}><MaterialIcons name="workspace-premium" size={18} color={COLORS.white} /></View>
                            <Text style={styles.scholarshipText} numberOfLines={2}>{item.title}</Text>
                        </TouchableOpacity>
                    )}
                    ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
                />

                {/* UNIVERSITIES */}
                <SectionHeader title="Partner Universities" onBtnPress={() => router.push({ pathname: `/agency/selected/universities/${id}` })} />
                <FlatList
                    horizontal
                    data={agencyData?.partnerUniversities || []}
                    keyExtractor={(item, index) => item._id || index.toString()}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.uniTile} onPress={() => router.push({ pathname: `/agency/selected/universities/details`, params: { id: item._id, name: item.name, logo: item.logo, website: item.websiteUrl } })}>
                            {item.logo ? <Image source={{ uri: item.logo }} style={styles.uniImg} resizeMode="contain" /> : <View style={styles.uniPlaceholder}><Text style={styles.uniPlaceholderText}>{item.name?.substring(0, 2).toUpperCase() || 'UN'}</Text></View>}
                        </TouchableOpacity>
                    )}
                    ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
                />

                {/* MENTORS SECTION - Keeping original layout but making it consistent */}
                <SectionHeader title="Meet the Mentors" onBtnPress={() => router.push(`/agency/selected/mentors/${id}`)} />
                <FlatList
                    horizontal
                    data={mentors}
                    keyExtractor={(item) => item.id}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.mentorCard}
                            onPress={() => router.push({
                                pathname: `/agency/selected/mentors/details`,
                                params: { id: item.id, agencyId: id }
                            })}
                        >
                            <Image
                                source={item.profilepic ? { uri: item.profilepic } : DEFAULT_IMAGE}
                                style={styles.mentorCircleImg}
                            />
                            <View style={styles.mentorTextContainer}>
                                <Text style={styles.mentorDisplayName}>{item.name}</Text>
                                <Text style={styles.mentorExpText} numberOfLines={3}>
                                    {item.experience}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}
                    ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
                />

                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

function SectionHeader({ title, onBtnPress }) {
    return (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeading}>{title}</Text>
            <TouchableOpacity onPress={onBtnPress} style={styles.viewAllBtn}>
                <Text style={styles.viewAllText}>View all</Text>
                <Feather name="chevron-right" size={14} color={COLORS.primary} />
            </TouchableOpacity>
        </View>
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
        backgroundColor: COLORS.bg,
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 20,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    agencyInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    agencyBadge: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    agencyInitial: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    agencyName: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    agencyTagline: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 48,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: COLORS.textPrimary,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        marginTop: 10,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: 14,
        padding: 14,
        alignItems: 'center',
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    statIconContainer: {
        marginBottom: 6,
    },
    statNumber: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 11,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    body: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    listContent: {
        paddingHorizontal: 2,
        paddingBottom: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 20,
    },
    sectionHeading: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.sectionTitle,
    },
    viewAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    viewAllText: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '600',
        marginRight: 4,
    },
    courseCard: {
        width: 160,
        height: 120,
        borderRadius: 16,
        padding: 16,
        justifyContent: 'space-between',
    },
    courseIcon: {
        marginBottom: 8,
    },
    courseText: {
        color: COLORS.white,
        fontWeight: '600',
        fontSize: 15,
        lineHeight: 20,
    },
    eventCardHorizontal: {
        width: 280,
        backgroundColor: COLORS.white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
        marginRight: GAP,
    },
    eventImgHorizontal: {
        width: '100%',
        height: 120,
    },
    eventContentHorizontal: {
        padding: 12,
    },
    eventTitleHorizontal: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 8,
    },
    eventDetails: {
        marginBottom: 12,
    },
    eventDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    eventDetailText: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    eventAction: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
    },
    eventActionText: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: '600',
    },
    noEventsText: {
        textAlign: 'center',
        color: COLORS.textSecondary,
        fontStyle: 'italic',
        marginVertical: 20,
    },

    modeBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        zIndex: 1,
    },
    modeBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    imageWrapper: {
        position: 'relative',
    },
    scholarshipCard: {
        width: 180,
        height: 120,
        borderRadius: 16,
        backgroundColor: COLORS.primary,
        padding: 16,
        justifyContent: 'space-between',
    },
    scholarshipHeader: {
        marginBottom: 10,
    },
    scholarshipText: {
        color: COLORS.white,
        fontWeight: '600',
        fontSize: 15,
        lineHeight: 20,
    },
    uniTile: {
        width: 140,
        height: 100,
        borderRadius: 16,
        backgroundColor: COLORS.white,
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    uniImg: {
        width: '100%',
        height: '100%',
    },
    uniPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    uniPlaceholderText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    // MENTOR CARD - Keeping original style but ensuring consistency
    mentorCard: {
        width: 240,
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        // Shadow/Elevation for consistency
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    mentorCircleImg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.accent,
    },
    mentorTextContainer: {
        flex: 1,
        marginLeft: 15,
    },
    mentorDisplayName: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.primary,
        marginBottom: 4,
    },
    mentorExpText: {
        fontSize: 13,
        color: COLORS.textPrimary,
        lineHeight: 18,
    }
});