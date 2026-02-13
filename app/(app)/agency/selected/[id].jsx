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
import ChatBot from '../../../components/ChatBot';

const DEFAULT_IMAGE = require('../../../../assets/images/agencies/default.png');

const COLORS = {
    bg: '#F8FAFD',
    primary: '#769FCD',
    sectionTitle: '#2D3748',
    viewAll: '#718096',
    white: '#FFFFFF',
    border: '#E5E7EB',
    cardBg: '#FFFFFF',
    textPrimary: '#1F2937',
    textSecondary: '#6B7280',
    accent: '#E2E8F0',
    lightBlue: '#E8F1FF',
    online: '#10B981',
    seated: '#F59E0B',
    scholarship1: '#769FCD',
    scholarship2: '#6B8CBE',
    scholarship3: '#5E7AAE',
    scholarship4: '#51699E',
};

// Improved spacing system with more granular control
const SPACING = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
};

const BORDER_RADIUS = {
    sm: 8,
    md: 12,
    lg: 16,
    full: 9999,
};

const SHADOWS = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
};

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
    const [scholarshipImageErrors, setScholarshipImageErrors] = useState({});

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
                        `${Config.API_BASE_URL}/students/courses/`,
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
                            title: c.title || c.name || "Course",
                            image: c.image || c.bannerImage || null
                        }));
                        setCourses(courseList);
                        completeAgencyData.courses = courseList;
                        console.log(`✅ Fetched ${courseList.length} courses`);
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
                            amount: s.amount || s.funding,
                            image: s.image || s.bannerImage || s.thumbnail || null,
                            description: s.description || "Scholarship opportunity for international students"
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

            return () => { };
        }, [id, userToken])
    );

    const handleScholarshipImageError = (scholarshipId) => {
        setScholarshipImageErrors(prev => ({ ...prev, [scholarshipId]: true }));
    };

    if (loading) {
        return (
            <View style={[styles.safe, styles.center]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    const getScholarshipColor = (index) => {
        const colors = [COLORS.scholarship1, COLORS.scholarship2, COLORS.scholarship3, COLORS.scholarship4];
        return colors[index % colors.length];
    };

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

            {/* HEADER */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={styles.agencyInfo}>
                        <View style={styles.agencyBadge}>
                            {agencyData?.logo && agencyData.logo.trim() !== '' ? (
                                <Image
                                    source={{ uri: agencyData.logo }}
                                    style={styles.agencyLogoImage}
                                    resizeMode="cover"
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

                {/* SEARCH BAR */}
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

            <ScrollView
                contentContainerStyle={styles.body}
                showsVerticalScrollIndicator={false}
                overScrollMode="never"
            >
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
                                activeOpacity={0.7}
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
                <SectionHeader
                    title="Upcoming Events"
                    onBtnPress={() => router.push(`/agency/selected/events/${id}`)}
                />
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
                                    params: {
                                        id: item._id,
                                        title: item.title,
                                        image: item.bannerImageUrl,
                                        date: item.date,
                                        time: item.time
                                    }
                                })}
                                activeOpacity={0.7}
                            >
                                <View style={styles.imageWrapper}>
                                    {item.bannerImageUrl && item.bannerImageUrl.trim() !== '' ? (
                                        <Image
                                            source={{ uri: item.bannerImageUrl }}
                                            style={styles.eventImg}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <View style={[styles.eventImg, { backgroundColor: COLORS.accent }]} />
                                    )}
                                    <View style={[
                                        styles.modeBadge,
                                        { backgroundColor: item.mode === 'online' ? COLORS.online : COLORS.primary }
                                    ]}>
                                        <Text style={styles.modeBadgeText}>{item.mode}</Text>
                                    </View>
                                </View>

                                <View style={styles.eventContent}>
                                    <Text style={styles.eventTitle} numberOfLines={2}>{item.title}</Text>
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
                <SectionHeader
                    title="Available Scholarships"
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
                        keyExtractor={(item) => item._id || item.id || Math.random().toString()}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                        renderItem={({ item, index }) => {
                            const hasImage = item.image && !scholarshipImageErrors[item.id];
                            const scholarshipColor = getScholarshipColor(index);

                            return (
                                <TouchableOpacity
                                    style={[
                                        styles.scholarshipCard,
                                        { backgroundColor: hasImage ? COLORS.white : scholarshipColor }
                                    ]}
                                    onPress={() => {
                                        const scholarshipId = item._id || item.id;
                                        const scholarshipTitle = item.title || item.name || "Scholarship Program";
                                        router.push({
                                            pathname: '/agency/selected/scholarships/details',
                                            params: {
                                                id: scholarshipId,
                                                agencyId: id,
                                                scholarshipName: scholarshipTitle
                                            }
                                        });
                                    }}
                                    activeOpacity={0.7}
                                >
                                    {hasImage && item.image.trim() !== '' ? (
                                        <Image
                                            source={{ uri: item.image }}
                                            style={styles.scholarshipImage}
                                            resizeMode="contain"
                                            onError={() => handleScholarshipImageError(item.id)}
                                        />
                                    ) : (
                                        <View style={styles.scholarshipContent}>
                                            <Feather name="award" size={24} color={COLORS.white} />
                                            <Text style={styles.scholarshipText} numberOfLines={2}>
                                                {item.title || item.name || "Scholarship Program"}
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                        ItemSeparatorComponent={() => <View style={{ width: SPACING.md }} />}
                    />
                ) : (
                    <Text style={styles.noResultsText}>No scholarships available</Text>
                )}

                {/* UNIVERSITIES */}
                <SectionHeader
                    title="Partner Universities"
                    onBtnPress={() => router.push({ pathname: `/agency/selected/universities/${id}` })}
                />
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
                                onPress={() => router.push({
                                    pathname: `/agency/selected/universities/details`,
                                    params: {
                                        id: item._id,
                                        name: item.name,
                                        logo: item.logo,
                                        website: item.websiteUrl
                                    }
                                })}
                                activeOpacity={0.7}
                            >
                                {item.logo && item.logo.trim() !== '' ? (
                                    <Image source={{ uri: item.logo }} style={styles.uniImg} resizeMode="contain" />
                                ) : (
                                    <View style={styles.uniPlaceholder}>
                                        <Text style={styles.uniPlaceholderText}>
                                            {item.name?.substring(0, 2).toUpperCase() || 'UN'}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => <View style={{ width: SPACING.md }} />}
                    />
                ) : (
                    <Text style={styles.noResultsText}>No partner universities</Text>
                )}

                {/* MENTORS */}
                <SectionHeader
                    title="Meet the Mentors"
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
                                activeOpacity={0.7}
                            >
                                <Image
                                    source={item.profilepic && item.profilepic.trim() !== '' ? { uri: item.profilepic } : DEFAULT_IMAGE}
                                    style={styles.mentorCircleImg}
                                    resizeMode="cover"
                                />
                                <View style={styles.mentorTextContainer}>
                                    <Text style={styles.mentorDisplayName} numberOfLines={1}>{item.name}</Text>
                                    <Text style={styles.mentorExpText} numberOfLines={2}>
                                        {typeof item.experience === 'string' ? item.experience : "Professional mentor"}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => <View style={{ width: SPACING.md }} />}
                    />
                ) : (
                    <Text style={styles.noResultsText}>No mentors available</Text>
                )}

                <View style={{ height: SPACING.xxxl }} />
            </ScrollView>

            {/* ChatBot Component */}
            <ChatBot agencyId={id} />
        </SafeAreaView>
    );
}

function SectionHeader({ title, onBtnPress }) {
    return (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeading}>{title}</Text>
            <TouchableOpacity onPress={onBtnPress} style={styles.viewAllBtn} activeOpacity={0.7}>
                <Text style={styles.viewAllText}>View all</Text>
                <Feather name="chevron-right" size={16} color={COLORS.primary} />
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

    // HEADER STYLES
    header: {
        backgroundColor: COLORS.white,
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.lg,
        paddingBottom: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    agencyInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    agencyBadge: {
        width: 48,
        height: 48,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
        overflow: 'hidden',
    },
    agencyLogoImage: {
        width: '100%',
        height: '100%',
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
        fontSize: 13,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    notificationButton: {
        width: 44,
        height: 44,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: SPACING.sm,
    },
    notificationBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#EF4444',
        borderRadius: BORDER_RADIUS.full,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    notificationBadgeText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: '700',
    },

    // SEARCH BAR
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bg,
        borderRadius: BORDER_RADIUS.md,
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
        paddingVertical: 0,
    },

    // BODY & STATS
    body: {
        paddingTop: SPACING.lg,
        paddingHorizontal: SPACING.lg,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.lg,
        gap: SPACING.sm,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.md,
        paddingVertical: SPACING.lg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    statNumber: {
        fontSize: 26,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '500',
        textAlign: 'center',
    },

    // SECTION HEADERS
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
        marginTop: SPACING.md,
    },
    sectionHeading: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
        letterSpacing: -0.3,
    },
    viewAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.xs,
    },
    viewAllText: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '600',
        marginRight: 2,
    },

    // LIST CONTENT
    listContent: {
        paddingBottom: SPACING.xs,
        marginBottom: SPACING.md,
    },

    // COURSE CARDS
    courseCard: {
        width: 180,
        height: 110,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.lg,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    courseText: {
        color: COLORS.white,
        fontWeight: '600',
        fontSize: 15,
        lineHeight: 21,
    },

    // EVENT CARDS
    eventCard: {
        width: 280,
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    imageWrapper: {
        position: 'relative',
        height: 140,
        backgroundColor: COLORS.accent,
    },
    eventImg: {
        width: '100%',
        height: '100%',
    },
    modeBadge: {
        position: 'absolute',
        top: SPACING.md,
        left: SPACING.md,
        paddingHorizontal: SPACING.sm + 2,
        paddingVertical: 6,
        borderRadius: BORDER_RADIUS.sm,
    },
    modeBadgeText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    eventContent: {
        padding: SPACING.lg,
    },
    eventTitle: {
        fontSize: 15,
        fontWeight: '700',
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
        fontSize: 13,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    eventAction: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
        paddingTop: SPACING.xs,
    },
    eventActionText: {
        fontSize: 13,
        color: COLORS.primary,
        fontWeight: '600',
    },

    // SCHOLARSHIP CARDS
    scholarshipCard: {
        width: 200,
        height: 130,
        borderRadius: BORDER_RADIUS.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    scholarshipImage: {
        width: '100%',
        height: '100%',
    },
    scholarshipContent: {
        flex: 1,
        padding: SPACING.lg,
        justifyContent: 'center',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    scholarshipText: {
        color: COLORS.white,
        fontWeight: '600',
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
    },

    // UNIVERSITY CARDS
    uniTile: {
        width: 140,
        height: 100,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
        padding: 0,  // Remove padding for images
    },
    uniImg: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',  // or 'contain' based on preference
    },
    uniPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.lightBlue,
        borderRadius: BORDER_RADIUS.sm,
    },
    uniPlaceholderText: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.primary,
    },

    // MENTOR CARDS
    mentorCard: {
        width: 260,
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.lg,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    mentorCircleImg: {
        width: 60,
        height: 60,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.accent,
        borderWidth: 2,
        borderColor: COLORS.border,
    },
    mentorTextContainer: {
        flex: 1,
        marginLeft: SPACING.md,
        justifyContent: 'center',
    },
    mentorDisplayName: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    mentorExpText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        lineHeight: 18,
        fontWeight: '500',
    },

    // NO RESULTS
    noResultsText: {
        textAlign: 'center',
        color: COLORS.textSecondary,
        marginVertical: SPACING.xl,
        fontSize: 14,
        fontWeight: '500',
    },
});