import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
    FlatList, Image, useWindowDimensions, ActivityIndicator, StatusBar, Linking,
    RefreshControl, Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { Config } from '../../../config';
import { useFocusEffect } from 'expo-router';
import ChatBot from '../../../components/ChatBot';
import { NAV_BAR_HEIGHT } from '../../../components/BottomNavBar';

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
    // useWindowDimensions re-renders on rotation/resize automatically
    const { width: W, height: H } = useWindowDimensions();
    const { id, name, agencyLogo } = useLocalSearchParams();
    const { userToken, setActiveAgency, refreshUserProfile } = useAuth();

    // ── Responsive helpers derived from live window dimensions ──────────────
    // All sizing is relative to screen width so it works on any device
    const rs  = (size) => (W / 375) * size;          // scale relative to 375 base
    const rfs = (size) => Math.round(rs(size));       // font size (integer)
    const rsp = (size) => rs(size);                   // padding / spacing

    // Card sizes as % of screen width so they look right on phones + tablets
    const COURSE_CARD_W    = W * 0.44;
    const COURSE_CARD_H    = H * 0.14;
    const EVENT_CARD_W     = W * 0.72;
    const EVENT_IMG_H      = H * 0.17;
    const SCHOLAR_CARD_W   = W * 0.50;
    const SCHOLAR_CARD_H   = H * 0.16;
    const UNI_TILE_W       = W * 0.36;
    const UNI_TILE_H       = H * 0.12;
    const MENTOR_CARD_W    = W * 0.68;
    const MENTOR_IMG_SIZE  = rs(56);
    const AGENCY_BADGE_SIZE = rs(46);

    // ── state ────────────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [notificationCount, setNotificationCount] = useState(0);
    const [agencyData, setAgencyData] = useState(null);
    const [courses, setCourses] = useState([]);
    const [events, setEvents] = useState([]);
    const [scholarships, setScholarships] = useState([]);
    const [mentors, setMentors] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [scholarshipImageErrors, setScholarshipImageErrors] = useState({});

    const filteredCourses = courses.filter(course =>
        course.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredEvents = events.filter(event =>
        event.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ── verification ─────────────────────────────────────────────────────────
    const verifyAgencyWithBackend = async () => {
        if (!userToken || !id) return false;
        setVerifying(true);
        try {
            const response = await fetch(`${Config.API_BASE_URL}/students/profile`, {
                headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' }
            });
            if (!response.ok) return false;

            const data = await response.json();
            const backendAgencyId = data.profile?.registeredAgency;

            if (!backendAgencyId) {
                Alert.alert('Agency Not Registered', 'Your agency selection was not saved. Please select your agency again.', [
                    { text: 'Go to Agency Selection', onPress: () => router.replace('/(app)/decision') }
                ]);
                return false;
            }

            if (backendAgencyId !== id) {
                try {
                    const agencyRes = await fetch(`${Config.API_BASE_URL}/agency/profile/${backendAgencyId}`, {
                        headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' }
                    });
                    if (agencyRes.ok) {
                        const agencyData = await agencyRes.json();
                        const fullProfile = agencyData.agency || agencyData.profile || agencyData;
                        await setActiveAgency({ id: backendAgencyId, name: fullProfile.organizationName || 'Your Agency', logo: fullProfile.logo || '' });
                        Alert.alert('Agency Mismatch', `Taking you to your registered agency: ${fullProfile.organizationName || 'Your Agency'}`, [
                            { text: 'Go to Correct Agency', onPress: () => router.replace({ pathname: `/agency/selected/${backendAgencyId}`, params: { name: fullProfile.organizationName, agencyLogo: fullProfile.logo } }) }
                        ]);
                    }
                } catch (e) { console.error('[VERIFY] Error:', e); }
                return false;
            }
            return true;
        } catch (error) {
            console.error('[VERIFY] Error:', error);
            return false;
        } finally {
            setVerifying(false);
        }
    };

    // ── data fetching ─────────────────────────────────────────────────────────
    const fetchAllData = async (isRefreshing = false) => {
        if (!userToken || !id) return;
        if (!isRefreshing) setLoading(true);

        try {
            const endpoints = [
                `${Config.API_BASE_URL}/agency/profile/${id}`,
                `${Config.API_BASE_URL}/agency/universities/agency/${id}`,
                `${Config.API_BASE_URL}/students/courses/`,
                `${Config.API_BASE_URL}/agency/events/student`,
                `${Config.API_BASE_URL}/agency/scholarships/agency/${id}`,
                `${Config.API_BASE_URL}/students/mentors/${id}`,
                `${Config.API_BASE_URL}/students/students/notification/count`
            ];
            const headers = { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' };
            const responses = await Promise.all(endpoints.map(url => fetch(url, { headers })));
            const [agencyRes, uniRes, coursesRes, eventsRes, scholarRes, mentorRes, countRes] = responses;

            let completeAgencyData = { partnerUniversities: [], courses: [], events: [], scholarships: [], mentors: [] };

            if (agencyRes.ok) {
                const aJson = await agencyRes.json();
                const profile = aJson.agency || aJson.profile || aJson;
                completeAgencyData = { ...completeAgencyData, ...profile };
                setActiveAgency({ id, name: profile.organizationName || profile.name || "Agency", logo: profile.profileUrl || agencyLogo });
            }

            if (uniRes.ok) {
                const uJson = await uniRes.json();
                completeAgencyData.partnerUniversities = uJson.university?.partnerUniversities || uJson.partnerUniversities || [];
            }

            if (coursesRes.ok) {
                const cJson = await coursesRes.json();
                const courseList = (cJson.courses || cJson || []).map(c => ({
                    id: c._id || c.id || Math.random().toString(),
                    title: c.title || c.name || "Course",
                    image: c.image || c.bannerImage || null
                }));
                setCourses(courseList);
                completeAgencyData.courses = courseList;
            }

            if (eventsRes.ok) {
                const eJson = await eventsRes.json();
                const rawEvents = Array.isArray(eJson.events) ? eJson.events : (Array.isArray(eJson) ? eJson : []);
                const formattedEvents = rawEvents.map(event => {
                    const startDate = new Date(event.startAt || event.date || event.createdAt);
                    const eventMode = event.meetings?.length > 0 ? event.meetings[0].mode : 'venue';
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

            if (mentorRes.ok) {
                const mJson = await mentorRes.json();
                const rawMentors = mJson.mentors || [];
                setMentors(rawMentors.map(m => ({
                    id: m._id,
                    name: m.name,
                    profilepic: m.profileUrl,
                    experience: m.experiences?.length > 0 ? m.experiences[0] : "Professional mentor for higher education"
                })));
            }

            if (countRes?.ok) {
                const countJson = await countRes.json();
                setNotificationCount(countJson.total || 0);
            }

            setAgencyData(completeAgencyData);
        } catch (error) {
            console.error("❌ FetchAllData Error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(React.useCallback(() => { fetchAllData(false); return () => {}; }, [id, userToken]));

    useEffect(() => {
        if (!loading && userToken && id) {
            const timer = setTimeout(() => verifyAgencyWithBackend(), 1500);
            return () => clearTimeout(timer);
        }
    }, [loading, userToken, id]);

    const onRefresh = React.useCallback(() => { setRefreshing(true); fetchAllData(true); }, [id, userToken]);
    const handleScholarshipImageError = (scholarshipId) =>
        setScholarshipImageErrors(prev => ({ ...prev, [scholarshipId]: true }));

    const getScholarshipColor = (index) => {
        const colors = [COLORS.scholarship1, COLORS.scholarship2, COLORS.scholarship3, COLORS.scholarship4];
        return colors[index % colors.length];
    };

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

            {verifying && (
                <View style={styles.verificationBanner}>
                    <ActivityIndicator size="small" color={COLORS.white} />
                    <Text style={[styles.verificationText, { fontSize: rfs(13) }]}>Verifying agency with server...</Text>
                </View>
            )}

            {/* HEADER */}
            <View style={[styles.header, { paddingHorizontal: rsp(16), paddingVertical: rsp(14) }]}>
                <View style={[styles.headerTop, { marginBottom: rsp(12) }]}>
                    <View style={styles.agencyInfo}>
                        <View style={[styles.agencyBadge, { width: AGENCY_BADGE_SIZE, height: AGENCY_BADGE_SIZE, borderRadius: rs(10), marginRight: rsp(10) }]}>
                            {agencyData?.logo && agencyData.logo.trim() !== '' ? (
                                <Image source={{ uri: agencyData.logo }} style={styles.agencyLogoImage} resizeMode="cover" />
                            ) : (
                                <Text style={[styles.agencyInitial, { fontSize: rfs(18) }]}>
                                    {(agencyData?.organizationName || 'A').charAt(0).toUpperCase()}
                                </Text>
                            )}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.agencyName, { fontSize: rfs(16) }]} numberOfLines={1}>
                                {agencyData?.organizationName || "Agency"}
                            </Text>
                            <Text style={[styles.agencyTagline, { fontSize: rfs(12) }]}>Education Services</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[styles.notificationButton, { width: rsp(40), height: rsp(40), borderRadius: rs(10) }]}
                        onPress={() => router.push(`(app)/agency/selected/notifications/${id}`)}
                    >
                        <Ionicons name="notifications-outline" size={rfs(22)} color={COLORS.textPrimary} />
                        {notificationCount > 0 && (
                            <View style={styles.notificationBadge}>
                                <Text style={[styles.notificationBadgeText, { fontSize: rfs(10) }]}>
                                    {notificationCount > 9 ? '9+' : notificationCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* SEARCH BAR */}
                <View style={[styles.searchContainer, { height: rsp(46), borderRadius: rs(10), paddingHorizontal: rsp(12) }]}>
                    <Feather name="search" size={rfs(17)} color={COLORS.textSecondary} style={{ marginRight: rsp(8) }} />
                    <TextInput
                        placeholder="Search courses, events..."
                        style={[styles.searchInput, { fontSize: rfs(14) }]}
                        placeholderTextColor={COLORS.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={rfs(18)} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <ScrollView
                contentContainerStyle={[styles.body, { paddingHorizontal: rsp(16), paddingTop: rsp(14), paddingBottom: NAV_BAR_HEIGHT + rsp(60) }]}
                showsVerticalScrollIndicator={false}
                overScrollMode="never"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
                }
            >
                {/* QUICK STATS */}
                <View style={[styles.statsContainer, { marginBottom: rsp(14), gap: rsp(8) }]}>
                    {[
                        { label: "Courses",      count: courses.length },
                        { label: "Events",       count: events.length },
                        { label: "Scholarships", count: scholarships.length },
                        { label: "Mentors",      count: mentors.length }
                    ].map((stat, idx) => (
                        <View key={idx} style={[styles.statCard, { borderRadius: rs(10), paddingVertical: rsp(14) }]}>
                            <Text style={[styles.statNumber, { fontSize: rfs(22) }]}>{stat.count || 0}</Text>
                            <Text style={[styles.statLabel, { fontSize: rfs(11) }]}>{stat.label}</Text>
                        </View>
                    ))}
                </View>

                {/* COURSES */}
                <SectionHeader rs={rs} rfs={rfs} rsp={rsp} title="Featured Courses" onBtnPress={() => router.push({ pathname: `/agency/selected/courses/${id}`, params: { courses: JSON.stringify(courses), agencyName: agencyData?.organizationName } })} />
                {filteredCourses.length > 0 ? (
                    <FlatList
                        horizontal
                        data={filteredCourses}
                        keyExtractor={(item, index) => `course-${item._id || item.id || index}`}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: rsp(4), marginBottom: rsp(12) }}
                        renderItem={({ item, index }) => (
                            <TouchableOpacity
                                style={[styles.courseCard, { width: COURSE_CARD_W, height: COURSE_CARD_H, borderRadius: rs(10), padding: rsp(14), backgroundColor: index % 2 === 0 ? '#FF6B6B' : '#949BFF' }]}
                                onPress={() => router.push({ pathname: `/agency/selected/courses/details`, params: { courseId: item._id || item.id, agencyId: id, courseName: item.title } })}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.courseText, { fontSize: rfs(14) }]} numberOfLines={3}>{item.title || item}</Text>
                            </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => <View style={{ width: rsp(12) }} />}
                    />
                ) : (
                    <Text style={[styles.noResultsText, { fontSize: rfs(14), marginVertical: rsp(18) }]}>{searchQuery ? 'No courses found' : 'No courses available'}</Text>
                )}

                {/* EVENTS */}
                <SectionHeader rs={rs} rfs={rfs} rsp={rsp} title="Upcoming Events" onBtnPress={() => router.push(`/agency/selected/events/${id}`)} />
                {filteredEvents.length > 0 ? (
                    <FlatList
                        horizontal
                        data={filteredEvents}
                        keyExtractor={(item) => item._id || item.id}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: rsp(4), marginBottom: rsp(12) }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.eventCard, { width: EVENT_CARD_W, borderRadius: rs(10) }]}
                                onPress={() => router.push({ pathname: `/agency/selected/events/details`, params: { id: item._id, title: item.title, image: item.bannerImageUrl, date: item.date, time: item.time } })}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.imageWrapper, { height: EVENT_IMG_H }]}>
                                    {item.bannerImageUrl && item.bannerImageUrl.trim() !== '' ? (
                                        <Image source={{ uri: item.bannerImageUrl }} style={styles.eventImg} resizeMode="cover" />
                                    ) : (
                                        <View style={[styles.eventImg, { backgroundColor: COLORS.accent }]} />
                                    )}
                                    <View style={[styles.modeBadge, { backgroundColor: item.mode === 'online' ? COLORS.online : COLORS.primary, top: rsp(10), left: rsp(10), paddingHorizontal: rsp(8), paddingVertical: rsp(5), borderRadius: rs(6) }]}>
                                        <Text style={[styles.modeBadgeText, { fontSize: rfs(10) }]}>{item.mode}</Text>
                                    </View>
                                </View>
                                <View style={[styles.eventContent, { padding: rsp(12) }]}>
                                    <Text style={[styles.eventTitle, { fontSize: rfs(14), marginBottom: rsp(6) }]} numberOfLines={2}>{item.title}</Text>
                                    <View style={[styles.eventDetails, { marginBottom: rsp(8), gap: rsp(5) }]}>
                                        <View style={[styles.eventDetailRow, { gap: rsp(5) }]}>
                                            <Feather name="calendar" size={rfs(12)} color={COLORS.textSecondary} />
                                            <Text style={[styles.eventDetailText, { fontSize: rfs(12) }]}>{item.date}</Text>
                                        </View>
                                        <View style={[styles.eventDetailRow, { gap: rsp(5) }]}>
                                            <Feather name="clock" size={rfs(12)} color={COLORS.textSecondary} />
                                            <Text style={[styles.eventDetailText, { fontSize: rfs(12) }]}>{item.time}</Text>
                                        </View>
                                    </View>
                                    <View style={[styles.eventAction, { gap: rsp(4) }]}>
                                        <Text style={[styles.eventActionText, { fontSize: rfs(12) }]}>View Details</Text>
                                        <Feather name="arrow-right" size={rfs(12)} color={COLORS.primary} />
                                    </View>
                                </View>
                            </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => <View style={{ width: rsp(12) }} />}
                    />
                ) : (
                    <Text style={[styles.noResultsText, { fontSize: rfs(14), marginVertical: rsp(18) }]}>{searchQuery ? 'No events found' : 'No upcoming events'}</Text>
                )}

                {/* SCHOLARSHIPS */}
                <SectionHeader rs={rs} rfs={rfs} rsp={rsp} title="Available Scholarships" onBtnPress={() => router.push({ pathname: `/agency/selected/scholarships/${id}`, params: { initialData: JSON.stringify(scholarships), agencyName: agencyData?.organizationName } })} />
                {scholarships.length > 0 ? (
                    <FlatList
                        horizontal
                        data={scholarships}
                        keyExtractor={(item) => item._id || item.id || Math.random().toString()}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: rsp(4), marginBottom: rsp(12) }}
                        renderItem={({ item, index }) => {
                            const hasImage = item.image && !scholarshipImageErrors[item.id];
                            return (
                                <TouchableOpacity
                                    style={[styles.scholarshipCard, { width: SCHOLAR_CARD_W, height: SCHOLAR_CARD_H, borderRadius: rs(10), backgroundColor: hasImage ? COLORS.white : getScholarshipColor(index) }]}
                                    onPress={() => router.push({ pathname: '/agency/selected/scholarships/details', params: { id: item._id || item.id, agencyId: id, scholarshipName: item.title || item.name || "Scholarship Program" } })}
                                    activeOpacity={0.7}
                                >
                                    {hasImage && item.image.trim() !== '' ? (
                                        <Image source={{ uri: item.image }} style={styles.scholarshipImage} resizeMode="contain" onError={() => handleScholarshipImageError(item.id)} />
                                    ) : (
                                        <View style={[styles.scholarshipContent, { padding: rsp(14), gap: rsp(8) }]}>
                                            <Feather name="award" size={rfs(22)} color={COLORS.white} />
                                            <Text style={[styles.scholarshipText, { fontSize: rfs(13) }]} numberOfLines={2}>{item.title || item.name || "Scholarship Program"}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                        ItemSeparatorComponent={() => <View style={{ width: rsp(12) }} />}
                    />
                ) : (
                    <Text style={[styles.noResultsText, { fontSize: rfs(14), marginVertical: rsp(18) }]}>No scholarships available</Text>
                )}

                {/* UNIVERSITIES */}
                <SectionHeader rs={rs} rfs={rfs} rsp={rsp} title="Partner Universities" onBtnPress={() => router.push({ pathname: `/agency/selected/universities/${id}` })} />
                {agencyData?.partnerUniversities?.length > 0 ? (
                    <FlatList
                        horizontal
                        data={agencyData.partnerUniversities}
                        keyExtractor={(item, index) => item._id || index.toString()}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: rsp(4), marginBottom: rsp(12) }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.uniTile, { width: UNI_TILE_W, height: UNI_TILE_H, borderRadius: rs(10) }]}
                                onPress={() => router.push({ pathname: `/agency/selected/universities/details`, params: { id: item._id, name: item.name, logo: item.profileUrl, website: item.websiteUrl } })}
                                activeOpacity={0.7}
                            >
                                {item.profileUrl && item.profileUrl.trim() !== '' ? (
                                    <Image source={{ uri: item.profileUrl }} style={styles.uniImg} resizeMode="contain" />
                                ) : (
                                    <View style={[styles.uniPlaceholder, { borderRadius: rs(8) }]}>
                                        <Text style={[styles.uniPlaceholderText, { fontSize: rfs(16) }]}>{item.name?.substring(0, 2).toUpperCase() || 'UN'}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => <View style={{ width: rsp(12) }} />}
                    />
                ) : (
                    <Text style={[styles.noResultsText, { fontSize: rfs(14), marginVertical: rsp(18) }]}>No partner universities</Text>
                )}

                {/* MENTORS */}
                <SectionHeader rs={rs} rfs={rfs} rsp={rsp} title="Meet the Mentors" onBtnPress={() => router.push(`/agency/selected/mentors/${id}`)} />
                {mentors.length > 0 ? (
                    <FlatList
                        horizontal
                        data={mentors}
                        keyExtractor={(item) => item.id}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: rsp(4), marginBottom: rsp(12) }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.mentorCard, { width: MENTOR_CARD_W, borderRadius: rs(10), padding: rsp(14) }]}
                                onPress={() => router.push({ pathname: `/agency/selected/mentors/details`, params: { id: item.id, agencyId: id } })}
                                activeOpacity={0.7}
                            >
                                <Image
                                    source={item.profilepic && item.profilepic.trim() !== '' ? { uri: item.profilepic } : DEFAULT_IMAGE}
                                    style={[styles.mentorCircleImg, { width: MENTOR_IMG_SIZE, height: MENTOR_IMG_SIZE, borderRadius: MENTOR_IMG_SIZE / 2 }]}
                                    resizeMode="cover"
                                />
                                <View style={[styles.mentorTextContainer, { marginLeft: rsp(12) }]}>
                                    <Text style={[styles.mentorDisplayName, { fontSize: rfs(14) }]} numberOfLines={1}>{item.name}</Text>
                                    <Text style={[styles.mentorExpText, { fontSize: rfs(12) }]} numberOfLines={2}>
                                        {typeof item.experience === 'string' ? item.experience : "Professional mentor"}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => <View style={{ width: rsp(12) }} />}
                    />
                ) : (
                    <Text style={[styles.noResultsText, { fontSize: rfs(14), marginVertical: rsp(18) }]}>No mentors available</Text>
                )}

                <View style={{ height: rsp(28) }} />
            </ScrollView>

            <View style={[styles.chatBotContainer, { bottom: NAV_BAR_HEIGHT + 10 }]}>
                <ChatBot agencyId={id} />
            </View>
        </SafeAreaView>
    );
}

// SectionHeader also receives rs/rfs/rsp so it scales consistently
function SectionHeader({ title, onBtnPress, rs, rfs, rsp }) {
    return (
        <View style={[styles.sectionHeader, { marginBottom: rsp(10), marginTop: rsp(10) }]}>
            <Text style={[styles.sectionHeading, { fontSize: rfs(16) }]}>{title}</Text>
            <TouchableOpacity onPress={onBtnPress} style={styles.viewAllBtn} activeOpacity={0.7}>
                <Text style={[styles.viewAllText, { fontSize: rfs(13) }]}>View all</Text>
                <Feather name="chevron-right" size={rfs(15)} color={COLORS.primary} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    safe:   { flex: 1, backgroundColor: COLORS.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // HEADER — horizontal padding & vertical padding set inline via rsp()
    header: {
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        zIndex: 10,
    },
    headerTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    agencyInfo:  { flexDirection: 'row', alignItems: 'center', flex: 1 },
    agencyBadge: { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    agencyLogoImage: { width: '100%', height: '100%' },
    agencyInitial:   { fontWeight: '700', color: COLORS.white },
    agencyName:      { fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
    agencyTagline:   { color: COLORS.textSecondary, fontWeight: '500' },
    notificationButton: { backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
    notificationBadge: {
        position: 'absolute', top: 8, right: 8,
        backgroundColor: '#EF4444', borderRadius: 9999,
        minWidth: 18, height: 18,
        justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: 4, borderWidth: 2, borderColor: COLORS.white,
    },
    notificationBadgeText: { color: COLORS.white, fontWeight: '700' },

    // SEARCH
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
    searchInput:     { flex: 1, color: COLORS.textPrimary, paddingVertical: 0 },

    // BODY — padding set inline
    body: {},
    statsContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    statCard: {
        flex: 1, backgroundColor: COLORS.white,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: COLORS.border,
    },
    statNumber: { fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
    statLabel:  { color: COLORS.textSecondary, fontWeight: '500', textAlign: 'center' },

    // SECTION HEADERS
    sectionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionHeading: { fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.3 },
    viewAllBtn:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 4 },
    viewAllText:    { color: COLORS.primary, fontWeight: '600', marginRight: 2 },

    // COURSES
    courseCard: { justifyContent: 'center', alignItems: 'flex-start' },
    courseText: { color: COLORS.white, fontWeight: '600', lineHeight: 20 },

    // EVENTS
    eventCard:       { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
    imageWrapper:    { position: 'relative', backgroundColor: COLORS.accent },
    eventImg:        { width: '100%', height: '100%' },
    modeBadge:       { position: 'absolute' },
    modeBadgeText:   { color: COLORS.white, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    eventContent:    {},
    eventTitle:      { fontWeight: '700', color: COLORS.textPrimary, lineHeight: 20 },
    eventDetails:    {},
    eventDetailRow:  { flexDirection: 'row', alignItems: 'center' },
    eventDetailText: { color: COLORS.textSecondary, fontWeight: '500' },
    eventAction:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
    eventActionText: { color: COLORS.primary, fontWeight: '600' },

    // SCHOLARSHIPS
    scholarshipCard:    { overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
    scholarshipImage:   { width: '100%', height: '100%' },
    scholarshipContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scholarshipText:    { color: COLORS.white, fontWeight: '600', lineHeight: 20, textAlign: 'center' },

    // UNIVERSITIES
    uniTile: {
        backgroundColor: COLORS.white, justifyContent: 'center',
        alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
    },
    uniImg:             { width: '100%', height: '100%', resizeMode: 'cover' },
    uniPlaceholder:     { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.lightBlue },
    uniPlaceholderText: { fontWeight: '700', color: COLORS.primary },

    // MENTORS
    mentorCard:          { backgroundColor: COLORS.white, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
    mentorCircleImg:     { backgroundColor: COLORS.accent, borderWidth: 2, borderColor: COLORS.border },
    mentorTextContainer: { flex: 1, justifyContent: 'center' },
    mentorDisplayName:   { fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
    mentorExpText:       { color: COLORS.textSecondary, lineHeight: 18, fontWeight: '500' },

    // MISC
    noResultsText: { textAlign: 'center', color: COLORS.textSecondary, fontWeight: '500' },

    // CHATBOT
    chatBotContainer: { position: 'absolute', right: 16, zIndex: 1000 },

    // VERIFICATION BANNER
    verificationBanner: {
        backgroundColor: COLORS.primary, flexDirection: 'row',
        alignItems: 'center', justifyContent: 'center',
        paddingVertical: 8, paddingHorizontal: 16, gap: 8, zIndex: 20,
    },
    verificationText: { color: COLORS.white, fontWeight: '600' },
});