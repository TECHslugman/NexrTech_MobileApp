import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
    FlatList, Image, Dimensions, ActivityIndicator, StatusBar, Animated
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { Config } from '../../../config';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive scaling functions
const scale = (size) => (SCREEN_WIDTH / 375) * size;
const verticalScale = (size) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

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
    gradient1: '#FF6B6B',
    gradient2: '#949BFF',
    gradient3: '#4ECDC4',
    gradient4: '#FFD93D',
};

const GAP = moderateScale(12);
const CARD_BORDER_RADIUS = moderateScale(16);

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
            <SafeAreaView style={[styles.safe, styles.loadingContainer]}>
                <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading your dashboard...</Text>
            </SafeAreaView>
        );
    }

    const gradients = [COLORS.gradient1, COLORS.gradient2, COLORS.gradient3, COLORS.gradient4];

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

            {/* HEADER */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={styles.agencyInfo}>
                        <View style={styles.agencyBadge}>
                            {agencyData?.logo ? (
                                <Image
                                    source={{ uri: agencyData.logo }}
                                    style={styles.agencyBadgeImage}
                                    resizeMode="cover"
                                />
                            ) : (
                                <Text style={styles.agencyInitial}>
                                    {(agencyData?.organizationName || 'A').charAt(0).toUpperCase()}
                                </Text>
                            )}
                        </View>
                        <View style={styles.agencyTextContainer}>
                            <Text style={styles.agencyName} numberOfLines={1}>
                                {agencyData?.organizationName || "Agency"}
                            </Text>
                            <Text style={styles.agencyTagline}>Education Services</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.searchContainer}>
                    <View style={styles.searchIconContainer}>
                        <Feather name="search" size={moderateScale(18)} color="#B0BCCB" />
                    </View>
                    <TextInput
                        placeholder="Search courses, events..."
                        style={styles.searchInput}
                        placeholderTextColor="#B0BCCB"
                    />
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.body}
                showsVerticalScrollIndicator={false}
                overScrollMode="never"
            >
                {/* QUICK STATS */}
                <View style={styles.statsContainer}>
                    {[
                        { icon: "school", label: "Courses", count: courses.length, color: '#FF6B6B' },
                        { icon: "event", label: "Events", count: events.length, color: '#949BFF' },
                        { icon: "workspace-premium", label: "Scholarships", count: scholarships.length, color: '#4ECDC4' },
                        { icon: "people", label: "Mentors", count: mentors.length, color: COLORS.primary }
                    ].map((stat, idx) => (
                        <View key={idx} style={styles.statCard}>
                            <View style={[styles.statIconContainer, { backgroundColor: stat.color + '15' }]}>
                                <MaterialIcons name={stat.icon} size={moderateScale(22)} color={stat.color} />
                            </View>
                            <Text style={styles.statNumber}>{stat.count || 0}</Text>
                            <Text style={styles.statLabel}>{stat.label}</Text>
                        </View>
                    ))}
                </View>

                {/* COURSES */}
                <SectionHeader
                    title="Featured Courses"
                    icon="book-open"
                    onBtnPress={() => router.push({
                        pathname: `/agency/selected/courses/${id}`,
                        params: {
                            courses: JSON.stringify(courses),
                            agencyName: agencyData?.organizationName
                        }
                    })}
                />
                {courses.length > 0 ? (
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
                                    { backgroundColor: gradients[index % gradients.length] }
                                ]}
                                onPress={() => router.push({
                                    pathname: `/agency/selected/courses/details`,
                                    params: {
                                        courseId: item._id || item.id,
                                        agencyId: id,
                                        courseName: item.title
                                    }
                                })}
                                activeOpacity={0.8}
                            >
                                <View style={styles.courseIconBg}>
                                    <Ionicons name="book-outline" size={moderateScale(24)} color="#FFFFFF" />
                                </View>
                                <Text style={styles.courseText} numberOfLines={3}>
                                    {item.title || item}
                                </Text>
                                <View style={styles.courseArrow}>
                                    <Feather name="arrow-right" size={moderateScale(16)} color="#FFFFFF" />
                                </View>
                            </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
                    />
                ) : (
                    <EmptyState icon="book" message="No courses available yet" />
                )}

                {/* EVENTS */}
                <SectionHeader
                    title="Upcoming Events"
                    icon="calendar"
                    onBtnPress={() => router.push(`/agency/selected/events/${id}`)}
                />
                {events.length > 0 ? (
                    <FlatList
                        horizontal
                        data={events}
                        keyExtractor={(item) => item._id || item.id}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.eventCard}
                                onPress={() => router.push({
                                    pathname: `/agency/selected/events/details`,
                                    params: {
                                        id: item._id,
                                        title: item.title,
                                        image: item.bannerImageUrl,
                                        date: item.date,
                                        time: item.time
                                    }
                                })}
                                activeOpacity={0.9}
                            >
                                <View style={styles.eventImageContainer}>
                                    <Image
                                        source={{ uri: item.bannerImageUrl }}
                                        style={styles.eventImage}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.eventGradient} />
                                    <View style={[
                                        styles.modeBadge,
                                        { backgroundColor: item.mode === 'online' ? COLORS.online : COLORS.seated }
                                    ]}>
                                        <Feather
                                            name={item.mode === 'online' ? 'video' : 'map-pin'}
                                            size={moderateScale(10)}
                                            color="#FFFFFF"
                                        />
                                        <Text style={styles.modeBadgeText}>{item.mode}</Text>
                                    </View>
                                </View>

                                <View style={styles.eventContent}>
                                    <Text style={styles.eventTitle} numberOfLines={2}>
                                        {item.title}
                                    </Text>
                                    <View style={styles.eventMetaContainer}>
                                        <View style={styles.eventMetaRow}>
                                            <View style={styles.eventMetaBadge}>
                                                <Feather name="calendar" size={moderateScale(11)} color={COLORS.primary} />
                                            </View>
                                            <Text style={styles.eventMetaText} numberOfLines={1}>
                                                {item.date}
                                            </Text>
                                        </View>
                                        <View style={styles.eventMetaRow}>
                                            <View style={styles.eventMetaBadge}>
                                                <Feather name="clock" size={moderateScale(11)} color={COLORS.primary} />
                                            </View>
                                            <Text style={styles.eventMetaText} numberOfLines={1}>
                                                {item.time}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
                    />
                ) : (
                    <EmptyState icon="calendar" message="No upcoming events" />
                )}

                {/* SCHOLARSHIPS */}
                <SectionHeader
                    title="Available Scholarships"
                    icon="award"
                    onBtnPress={() => router.push({
                        pathname: `/agency/selected/scholarships/${id}`,
                        params: {
                            initialData: JSON.stringify(scholarships),
                            agencyName: agencyData?.organizationName
                        }
                    })}
                />
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
                                onPress={() => router.push({
                                    pathname: `/agency/selected/scholarships/details`,
                                    params: { id: item.id, title: item.title }
                                })}
                                activeOpacity={0.8}
                            >
                                <View style={styles.scholarshipIconContainer}>
                                    <MaterialIcons
                                        name="workspace-premium"
                                        size={moderateScale(28)}
                                        color="#FFFFFF"
                                    />
                                </View>
                                <Text style={styles.scholarshipText} numberOfLines={3}>
                                    {item.title}
                                </Text>
                                <View style={styles.scholarshipFooter}>
                                    <Text style={styles.scholarshipLabel}>Learn More</Text>
                                    <Feather name="arrow-right" size={moderateScale(14)} color="#FFFFFF" />
                                </View>
                            </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
                    />
                ) : (
                    <EmptyState icon="award" message="No scholarships available" />
                )}

                {/* UNIVERSITIES */}
                <SectionHeader
                    title="Partner Universities"
                    icon="briefcase"
                    onBtnPress={() => router.push({ pathname: `/agency/selected/universities/${id}` })}
                />
                {agencyData?.partnerUniversities?.length > 0 ? (
                    <FlatList
                        horizontal
                        data={agencyData.partnerUniversities}
                        keyExtractor={(item, index) => item._id || index.toString()}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.universityCard}
                                onPress={() => router.push({
                                    pathname: `/agency/selected/universities/details`,
                                    params: {
                                        id: item._id,
                                        name: item.name,
                                        logo: item.logo,
                                        website: item.websiteUrl
                                    }
                                })}
                                activeOpacity={0.85}
                            >
                                <View style={styles.universityLogoContainer}>
                                    {item.logo ? (
                                        <Image
                                            source={{ uri: item.logo }}
                                            style={styles.universityLogo}
                                            resizeMode="contain"
                                        />
                                    ) : (
                                        <View style={styles.universityPlaceholder}>
                                            <Feather name="briefcase" size={moderateScale(28)} color={COLORS.primary} />
                                        </View>
                                    )}
                                </View>
                                {item.name && (
                                    <Text style={styles.universityName} numberOfLines={2}>
                                        {item.name}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
                    />
                ) : (
                    <EmptyState icon="briefcase" message="No partner universities" />
                )}

                {/* MENTORS */}
                <SectionHeader
                    title="Meet the Mentors"
                    icon="users"
                    onBtnPress={() => router.push(`/agency/selected/mentors/${id}`)}
                />
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
                                activeOpacity={0.9}
                            >
                                <View style={styles.mentorImageContainer}>
                                    <Image
                                        source={item.profilepic ? { uri: item.profilepic } : DEFAULT_IMAGE}
                                        style={styles.mentorImage}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.mentorOnlineBadge} />
                                </View>
                                <View style={styles.mentorContent}>
                                    <Text style={styles.mentorName} numberOfLines={1}>
                                        {item.name}
                                    </Text>
                                    <Text style={styles.mentorExperience} numberOfLines={3}>
                                        {item.experience}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
                    />
                ) : (
                    <EmptyState icon="users" message="No mentors available" />
                )}

                <View style={{ height: moderateScale(40) }} />
            </ScrollView>
        </SafeAreaView>
    );
}

function SectionHeader({ title, icon, onBtnPress }) {
    return (
        <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
                <View style={styles.sectionIconBadge}>
                    <Feather name={icon} size={moderateScale(16)} color={COLORS.primary} />
                </View>
                <Text style={styles.sectionHeading}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onBtnPress} style={styles.viewAllBtn} activeOpacity={0.7}>
                <Text style={styles.viewAllText}>View all</Text>
                <Feather name="arrow-right" size={moderateScale(14)} color={COLORS.primary} />
            </TouchableOpacity>
        </View>
    );
}

function EmptyState({ icon, message }) {
    return (
        <View style={styles.emptyState}>
            <Feather name={icon} size={moderateScale(40)} color={COLORS.border} />
            <Text style={styles.emptyStateText}>{message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: COLORS.bg
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        gap: moderateScale(12),
    },
    loadingText: {
        fontSize: moderateScale(14),
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    header: {
        backgroundColor: COLORS.bg,
        paddingHorizontal: '5%',
        paddingTop: moderateScale(15),
        paddingBottom: moderateScale(20),
    },
    headerTop: {
        marginBottom: moderateScale(16),
    },
    agencyInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    agencyBadge: {
        width: moderateScale(56),
        height: moderateScale(56),
        borderRadius: moderateScale(16),
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: moderateScale(14),
        overflow: 'hidden',
        borderWidth: 3,
        borderColor: COLORS.white,
        elevation: 4,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    agencyBadgeImage: {
        width: '100%',
        height: '100%',
    },
    agencyInitial: {
        fontSize: moderateScale(22),
        fontWeight: '700',
        color: COLORS.white,
    },
    agencyTextContainer: {
        flex: 1,
    },
    agencyName: {
        fontSize: moderateScale(20),
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: moderateScale(2),
    },
    agencyTagline: {
        fontSize: moderateScale(13),
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(14),
        paddingHorizontal: '4%',
        height: moderateScale(50),
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    searchIconContainer: {
        marginRight: moderateScale(10),
    },
    searchInput: {
        flex: 1,
        fontSize: moderateScale(15),
        color: COLORS.textPrimary,
    },
    body: {
        paddingHorizontal: '5%',
        paddingBottom: moderateScale(20),
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: moderateScale(20),
        marginTop: moderateScale(10),
        gap: moderateScale(10),
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(16),
        padding: '4%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        minHeight: moderateScale(100),
        justifyContent: 'space-between',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    statIconContainer: {
        width: moderateScale(44),
        height: moderateScale(44),
        borderRadius: moderateScale(12),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: moderateScale(8),
    },
    statNumber: {
        fontSize: moderateScale(20),
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: moderateScale(2),
    },
    statLabel: {
        fontSize: moderateScale(11),
        color: COLORS.textSecondary,
        fontWeight: '600',
        textAlign: 'center',
    },
    listContent: {
        paddingVertical: moderateScale(8),
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: moderateScale(14),
        marginTop: moderateScale(24),
    },
    sectionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(10),
        flex: 1,
    },
    sectionIconBadge: {
        width: moderateScale(36),
        height: moderateScale(36),
        borderRadius: moderateScale(10),
        backgroundColor: COLORS.lightBlue,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionHeading: {
        fontSize: moderateScale(18),
        fontWeight: '700',
        color: COLORS.sectionTitle,
        flex: 1,
    },
    viewAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: moderateScale(6),
        paddingHorizontal: moderateScale(10),
        backgroundColor: COLORS.lightBlue,
        borderRadius: moderateScale(8),
        gap: moderateScale(4),
    },
    viewAllText: {
        fontSize: moderateScale(13),
        color: COLORS.primary,
        fontWeight: '600',
    },
    courseCard: {
        width: moderateScale(170),
        height: moderateScale(140),
        borderRadius: CARD_BORDER_RADIUS,
        padding: moderateScale(16),
        justifyContent: 'space-between',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    courseIconBg: {
        width: moderateScale(44),
        height: moderateScale(44),
        borderRadius: moderateScale(12),
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    courseText: {
        color: COLORS.white,
        fontWeight: '700',
        fontSize: moderateScale(15),
        lineHeight: moderateScale(20),
        flex: 1,
        marginTop: moderateScale(12),
    },
    courseArrow: {
        alignSelf: 'flex-end',
    },
    eventCard: {
        width: moderateScale(280),
        backgroundColor: COLORS.white,
        borderRadius: CARD_BORDER_RADIUS,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    eventImageContainer: {
        width: '100%',
        height: moderateScale(140),
        position: 'relative',
    },
    eventImage: {
        width: '100%',
        height: '100%',
    },
    eventGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '40%',
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    modeBadge: {
        position: 'absolute',
        top: moderateScale(10),
        right: moderateScale(10),
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: moderateScale(10),
        paddingVertical: moderateScale(6),
        borderRadius: moderateScale(8),
        gap: moderateScale(4),
    },
    modeBadgeText: {
        color: '#FFFFFF',
        fontSize: moderateScale(10),
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    eventContent: {
        padding: moderateScale(14),
    },
    eventTitle: {
        fontSize: moderateScale(15),
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: moderateScale(10),
        lineHeight: moderateScale(20),
    },
    eventMetaContainer: {
        gap: moderateScale(6),
    },
    eventMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(8),
    },
    eventMetaBadge: {
        width: moderateScale(24),
        height: moderateScale(24),
        borderRadius: moderateScale(6),
        backgroundColor: COLORS.lightBlue,
        justifyContent: 'center',
        alignItems: 'center',
    },
    eventMetaText: {
        fontSize: moderateScale(12),
        color: COLORS.textSecondary,
        fontWeight: '500',
        flex: 1,
    },
    scholarshipCard: {
        width: moderateScale(190),
        height: moderateScale(160),
        borderRadius: CARD_BORDER_RADIUS,
        backgroundColor: COLORS.primary,
        padding: moderateScale(18),
        justifyContent: 'space-between',
        elevation: 3,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    scholarshipIconContainer: {
        width: moderateScale(56),
        height: moderateScale(56),
        borderRadius: moderateScale(14),
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scholarshipText: {
        color: COLORS.white,
        fontWeight: '700',
        fontSize: moderateScale(15),
        lineHeight: moderateScale(20),
        flex: 1,
        marginTop: moderateScale(12),
    },
    scholarshipFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    scholarshipLabel: {
        color: COLORS.white,
        fontSize: moderateScale(12),
        fontWeight: '600',
    },
    universityCard: {
        width: moderateScale(140),
        minHeight: moderateScale(140),
        borderRadius: CARD_BORDER_RADIUS,
        backgroundColor: COLORS.white,
        padding: moderateScale(16),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: moderateScale(10),
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    universityLogoContainer: {
        width: moderateScale(70),
        height: moderateScale(70),
        borderRadius: moderateScale(12),
        overflow: 'hidden',
        backgroundColor: COLORS.accent,
    },
    universityLogo: {
        width: '100%',
        height: '100%',
    },
    universityPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.lightBlue,
    },
    universityName: {
        fontSize: moderateScale(12),
        fontWeight: '600',
        color: COLORS.textPrimary,
        textAlign: 'center',
        lineHeight: moderateScale(16),
    },
    mentorCard: {
        width: moderateScale(260),
        backgroundColor: COLORS.white,
        borderRadius: CARD_BORDER_RADIUS,
        padding: moderateScale(16),
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    mentorImageContainer: {
        width: moderateScale(80),
        height: moderateScale(80),
        borderRadius: moderateScale(40),
        overflow: 'hidden',
        alignSelf: 'center',
        marginBottom: moderateScale(12),
        position: 'relative',
        borderWidth: 3,
        borderColor: COLORS.lightBlue,
    },
    mentorImage: {
        width: '100%',
        height: '100%',
    },
    mentorOnlineBadge: {
        position: 'absolute',
        bottom: moderateScale(4),
        right: moderateScale(4),
        width: moderateScale(16),
        height: moderateScale(16),
        borderRadius: moderateScale(8),
        backgroundColor: COLORS.online,
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    mentorContent: {
        alignItems: 'center',
    },
    mentorName: {
        fontSize: moderateScale(16),
        fontWeight: '700',
        color: COLORS.primary,
        marginBottom: moderateScale(6),
        textAlign: 'center',
    },
    mentorExperience: {
        fontSize: moderateScale(12),
        color: COLORS.textSecondary,
        lineHeight: moderateScale(18),
        textAlign: 'center',
        fontWeight: '500',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: moderateScale(40),
        gap: moderateScale(12),
    },
    emptyStateText: {
        fontSize: moderateScale(14),
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
});