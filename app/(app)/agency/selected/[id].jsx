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
import { useFocusEffect } from 'expo-router';
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
    online: '#48BB78',
    seated: '#ED8936',
};

const SPACING = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
};

const BORDER_RADIUS = 12;

export default function SelectedAgencyHome() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const { id, name, agencyLogo } = useLocalSearchParams();
    const { userToken, setActiveAgency } = useAuth();

    const [loading, setLoading] = useState(true);
    const [notificationCount, setNotificationCount] = useState(0);
    const [agencyData, setAgencyData] = useState(null);
    const [courses, setCourses] = useState([]);
    const [events, setEvents] = useState([]);
    const [scholarships, setScholarships] = useState([]);
    const [mentors, setMentors] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Filtered data based on search query
    const filteredCourses = courses.filter(course =>
        course.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredEvents = events.filter(event =>
        event.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useFocusEffect(
        React.useCallback(() => {
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
                        `${Config.API_BASE_URL}/students/mentors/${id}`,
                        `${Config.API_BASE_URL}/students/students/notification/count`
                    ];

                    const headers = {
                        'Authorization': `Bearer ${userToken}`,
                        'Content-Type': 'application/json'
                    };

                    const responses = await Promise.all(
                        endpoints.map(url => fetch(url, { headers }))
                    );

                    const [
                        agencyRes,
                        uniRes,
                        coursesRes,
                        eventsRes,
                        scholarRes,
                        mentorRes,
                        countRes 
                    ] = responses;

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
                            name: profile.organizationName || profile.name || "Agency",
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

                    // 7. Notification Count
                    if (countRes) {
                        if (countRes.ok) {
                            const countJson = await countRes.json();
                            setNotificationCount(countJson.total || 0);
                        } else {
                            const errorText = await countRes.text();
                            console.error(`❌ Notification API failed with status ${countRes.status}:`, errorText);
                        }
                    }

                    setAgencyData(completeAgencyData);
                } catch (error) {
                    console.error("❌ FetchAllData Error:", error);
                } finally {
                    setLoading(false);
                }
            };

            fetchAllData();
        
            return () => {}; 
        }, [id, userToken]) 
    );

    if (loading) {
        return (
            <View style={[styles.safe, styles.center]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    const responsiveWidth = width * 0.9;

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
                                    style={styles.agencyLogoImage}
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
                    <TouchableOpacity
                        style={styles.notificationButton}
                        onPress={() => router.push(`(app)/agency/selected/notifications/${id}`)}
                    >
                        <Ionicons name="notifications-outline" size={22} color={COLORS.textPrimary} />
                        {notificationCount > 0 && (
                            <View style={styles.notificationBadge}>
                                <Text style={styles.notificationBadgeText}>
                                    {notificationCount > 9 ? '9+' : notificationCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
                <View style={styles.searchContainer}>
                    <Feather name="search" size={18} color={COLORS.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        placeholder="Search courses, events..."
                        style={styles.searchInput}
                        placeholderTextColor={COLORS.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} overScrollMode="never">

                {/* QUICK STATS */}
                <View style={styles.statsContainer}>
                    {[
                        { label: "Courses", count: courses.length },
                        { label: "Events", count: events.length },
                        { label: "Scholarships", count: scholarships.length },
                        { label: "Mentors", count: mentors.length }
                    ].map((stat, idx) => (
                        <View key={idx} style={styles.statCard}>
                            <Text style={styles.statNumber}>{stat.count || 0}</Text>
                            <Text style={styles.statLabel}>{stat.label}</Text>
                        </View>
                    ))}
                </View>

                {/* COURSES */}
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
                {filteredCourses.length > 0 ? (
                    <FlatList
                        horizontal
                        data={filteredCourses}
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
                                    pathname: `/agency/selected/courses/details`,
                                    params: {
                                        courseId: item._id || item.id,
                                        agencyId: id,
                                        courseName: item.title
                                    }
                                })}
                            >
                                <Text style={styles.courseText} numberOfLines={3}>
                                    {item.title || item}
                                </Text>
                            </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => <View style={{ width: SPACING.md }} />}
                    />
                ) : (
                    <Text style={styles.noResultsText}>
                        {searchQuery ? 'No courses found' : 'No courses available'}
                    </Text>
                )}

                {/* EVENTS */}
                <SectionHeader title="Upcoming Events" onBtnPress={() => router.push(`/agency/selected/events/${id}`)} />
                {filteredEvents.length > 0 ? (
                    <FlatList
                        horizontal
                        data={filteredEvents}
                        keyExtractor={(item) => item._id || item.id}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.eventCard}
                                onPress={() => router.push({
                                    pathname: `/agency/selected/events/details`,
                                    params: { id: item._id, title: item.title, image: item.bannerImageUrl, date: item.date, time: item.time }
                                })}
                            >
                                <View style={styles.imageWrapper}>
                                    <Image source={{ uri: item.bannerImageUrl }} style={styles.eventImg} resizeMode="cover" />
                                    <View style={[styles.modeBadge, { backgroundColor: item.mode === 'online' ? COLORS.online : COLORS.primary }]}>
                                        <Text style={styles.modeBadgeText}>{item.mode}</Text>
                                    </View>
                                </View>

                                <View style={styles.eventContent}>
                                    <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
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
                                        <Text style={styles.eventActionText}>View Details</Text>
                                        <Feather name="arrow-right" size={12} color={COLORS.primary} />
                                    </View>
                                </View>
                            </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => <View style={{ width: SPACING.md }} />}
                    />
                ) : (
                    <Text style={styles.noResultsText}>
                        {searchQuery ? 'No events found' : 'No upcoming events'}
                    </Text>
                )}

                {/* SCHOLARSHIPS */}
                <SectionHeader title="Available Scholarships" onBtnPress={() => router.push({ pathname: `/agency/selected/scholarships/${id}`, params: { initialData: JSON.stringify(scholarships), agencyName: agencyData?.organizationName } })} />
                {scholarships.length > 0 ? (
                    <FlatList
                        horizontal
                        data={scholarships}
                        keyExtractor={(item) => item.id}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                        renderItem={({ item }) => (
                            <TouchableOpacity 
                                style={styles.scholarshipCard} 
                                onPress={() => router.push({ pathname: `/agency/selected/scholarships/details`, params: { id: item.id, title: item.title } })}
                            >
                                <Text style={styles.scholarshipText} numberOfLines={3}>{item.title}</Text>
                            </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => <View style={{ width: SPACING.md }} />}
                    />
                ) : (
                    <Text style={styles.noResultsText}>No scholarships available</Text>
                )}

                {/* UNIVERSITIES */}
                <SectionHeader title="Partner Universities" onBtnPress={() => router.push({ pathname: `/agency/selected/universities/${id}` })} />
                {agencyData?.partnerUniversities && agencyData.partnerUniversities.length > 0 ? (
                    <FlatList
                        horizontal
                        data={agencyData.partnerUniversities}
                        keyExtractor={(item, index) => item._id || index.toString()}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                        renderItem={({ item }) => (
                            <TouchableOpacity 
                                style={styles.uniTile} 
                                onPress={() => router.push({ pathname: `/agency/selected/universities/details`, params: { id: item._id, name: item.name, logo: item.logo, website: item.websiteUrl } })}
                            >
                                {item.logo ? (
                                    <Image source={{ uri: item.logo }} style={styles.uniImg} resizeMode="contain" />
                                ) : (
                                    <View style={styles.uniPlaceholder}>
                                        <Text style={styles.uniPlaceholderText}>{item.name?.substring(0, 2).toUpperCase() || 'UN'}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => <View style={{ width: SPACING.md }} />}
                    />
                ) : (
                    <Text style={styles.noResultsText}>No partner universities</Text>
                )}

                {/* MENTORS SECTION */}
                <SectionHeader title="Meet the Mentors" onBtnPress={() => router.push(`/agency/selected/mentors/${id}`)} />
                {mentors.length > 0 ? (
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
                        ItemSeparatorComponent={() => <View style={{ width: SPACING.md }} />}
                    />
                ) : (
                    <Text style={styles.noResultsText}>No mentors available</Text>
                )}

                <View style={{ height: 40 }} />
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
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.md,
        paddingBottom: SPACING.lg,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    agencyInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    agencyBadge: {
        width: 48,
        height: 48,
        borderRadius: BORDER_RADIUS,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    agencyLogoImage: {
        width: '100%',
        height: '100%',
        borderRadius: BORDER_RADIUS,
    },
    agencyInitial: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.white,
    },
    agencyName: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    agencyTagline: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    notificationButton: {
        width: 44,
        height: 44,
        borderRadius: BORDER_RADIUS,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: SPACING.sm,
    },
    notificationBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    notificationBadgeText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: '700',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS,
        paddingHorizontal: SPACING.md,
        height: 48,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    searchIcon: {
        marginRight: SPACING.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: COLORS.textPrimary,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.xl,
        marginTop: SPACING.md,
        gap: SPACING.md,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS,
        paddingVertical: SPACING.lg,
        paddingHorizontal: SPACING.xs,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        minHeight: 80,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 11,
        color: COLORS.textSecondary,
        fontWeight: '500',
        textAlign: 'center',
    },
    body: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.xl,
    },
    listContent: {
        paddingVertical: SPACING.xs,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
        marginTop: SPACING.xl,
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
        height: 100,
        borderRadius: BORDER_RADIUS,
        padding: SPACING.lg,
        justifyContent: 'center',
        alignItems: 'flex-start',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    courseText: {
        color: COLORS.white,
        fontWeight: '600',
        fontSize: 14,
        lineHeight: 20,
    },
    eventCard: {
        width: 280,
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    eventImg: {
        width: '100%',
        height: 140,
    },
    eventContent: {
        padding: SPACING.lg,
    },
    eventTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
        lineHeight: 20,
    },
    eventDetails: {
        marginBottom: SPACING.md,
        gap: 6,
    },
    eventDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
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
    modeBadge: {
        position: 'absolute',
        top: SPACING.md,
        left: SPACING.md,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: 6,
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
        height: 100,
        borderRadius: BORDER_RADIUS,
        backgroundColor: COLORS.primary,
        padding: SPACING.lg,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    scholarshipText: {
        color: COLORS.white,
        fontWeight: '600',
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
    },
    uniTile: {
        width: 140,
        height: 100,
        borderRadius: BORDER_RADIUS,
        backgroundColor: COLORS.white,
        padding: SPACING.lg,
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
    mentorCard: {
        width: 260,
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS,
        padding: SPACING.lg,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    mentorCircleImg: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.accent,
    },
    mentorTextContainer: {
        flex: 1,
        marginLeft: SPACING.md,
        justifyContent: 'center',
    },
    mentorDisplayName: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    mentorExpText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        lineHeight: 18,
    },
    noResultsText: {
        textAlign: 'center',
        color: COLORS.textSecondary,
        fontStyle: 'italic',
        marginVertical: SPACING.lg,
        fontSize: 14,
    },
});