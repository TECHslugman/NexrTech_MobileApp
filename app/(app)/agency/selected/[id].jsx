import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
    FlatList, Image, useWindowDimensions, ActivityIndicator, StatusBar, Linking
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';

const DEFAULT_IMAGE = require('../../../../assets/images/agencies/default.png');
const BASE_URL = 'https://edu-agent-backend-nine.vercel.app/api/v1';

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
};
const GAP = 12;

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
                // Summary Log instead of multiple lines
                console.log(`📡 Fetching Agency Data [ID: ${id}]`);

                const endpoints = [
                    `${BASE_URL}/agency/profile/${id}`,
                    `${BASE_URL}/agency/universities/agency/${id}`,
                    `${BASE_URL}/agency/courses/agency/${id}`,
                    `${BASE_URL}/agency/events/student/${id}`,
                    `${BASE_URL}/agency/scholarships/agency/${id}`,
                    `${BASE_URL}/agency/mentors/agency/${id}`
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

                // 1. Handle Agency Profile (Main Data)
                if (agencyRes.ok) {
                    const aJson = await agencyRes.json();
                    const profile = aJson.agency || aJson.profile || aJson;

                    completeAgencyData = { ...completeAgencyData, ...profile };

                    // Set active agency for the global context (used by Chat)
                    setActiveAgency({
                        id: id,
                        name: profile.organizationName || name || profile.name || "Agency",
                        logo: profile.logo || agencyLogo
                    });
                } else {
                    console.warn(`⚠️ Profile Fetch Failed: ${agencyRes.status}`);
                }

                // 2. Handle Universities
                if (uniRes.ok) {
                    const uJson = await uniRes.json();
                    completeAgencyData.partnerUniversities = uJson.university?.partnerUniversities || uJson.partnerUniversities || [];
                }

                // 3. Handle Courses
                if (coursesRes.ok) {
                    const cJson = await coursesRes.json();
                    const courseList = (cJson.courses || cJson || []).map(c => ({
                        id: c._id || c.id || Math.random().toString(),
                        title: c.title || c.name || "Course"
                    }));
                    setCourses(courseList);
                    completeAgencyData.courses = courseList;
                }

                // 4. Handle Events
                if (eventsRes.ok) {
                    const eJson = await eventsRes.json();
                    const rawEvents = Array.isArray(eJson.events) ? eJson.events : (Array.isArray(eJson) ? eJson : []);

                    const formattedEvents = rawEvents.map(event => {
                        const startDate = new Date(event.startAt || event.date || event.createdAt);
                        return {
                            ...event,
                            id: event._id || event.id,
                            date: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                            time: startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                        };
                    });
                    setEvents(formattedEvents);
                    completeAgencyData.events = formattedEvents;
                }

                // 5. Handle Scholarships
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

                // 6. Handle Mentors
                if (mentorRes.ok) {
                    const mJson = await mentorRes.json();
                    const mentorsList = mJson.mentors || mJson || [];
                    setMentors(mentorsList);
                    completeAgencyData.mentors = mentorsList;
                }

                setAgencyData(completeAgencyData);
                console.log("✅ All data synchronized");

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

            {/* HEADER */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={styles.agencyInfo}>
                        <View style={styles.agencyBadge}>
                            {/* If agencyData.logo exists, show the Image, otherwise show the Initial */}
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

                    <TouchableOpacity style={styles.notificationBtn}>
                        <Feather name="bell" size={22} color={COLORS.primary} />
                        <View style={styles.notificationDot} />
                    </TouchableOpacity>
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

            <ScrollView
                contentContainerStyle={styles.body}
                showsVerticalScrollIndicator={false}
                overScrollMode="never"
            >
                {/* QUICK STATS */}
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <View style={styles.statIconContainer}>
                            <MaterialIcons name="school" size={20} color={COLORS.primary} />
                        </View>
                        <Text style={styles.statNumber}>{courses.length || 0}</Text>
                        <Text style={styles.statLabel}>Course</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={styles.statIconContainer}>
                            <MaterialIcons name="event" size={20} color={COLORS.primary} />
                        </View>
                        <Text style={styles.statNumber}>{events.length || 0}</Text>
                        <Text style={styles.statLabel}>Event</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={styles.statIconContainer}>
                            <MaterialIcons name="workspace-premium" size={20} color={COLORS.primary} />
                        </View>
                        <Text style={styles.statNumber}>{scholarships.length || 0}</Text>
                        <Text style={styles.statLabel}>Scholarship</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={styles.statIconContainer}>
                            <Ionicons name="people" size={20} color={COLORS.primary} />
                        </View>
                        <Text style={styles.statNumber}>{mentors.length || 0}</Text>
                        <Text style={styles.statLabel}>Mentor</Text>
                    </View>
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
                <FlatList
                    horizontal
                    data={courses}
                    keyExtractor={(item, index) => `course-${item.id || index}`}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item, index }) => (
                        <View style={[styles.courseCard, {
                            backgroundColor: index % 2 === 0 ? '#FF6B6B' : '#949BFF',
                        }]}>
                            <View style={styles.courseIcon}>
                                <Ionicons name="book-outline" size={20} color="rgba(255,255,255,0.9)" />
                            </View>
                            <Text style={styles.courseText} numberOfLines={2}>
                                {item.title || item}
                            </Text>
                        </View>
                    )}
                    ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
                />

                {/* EVENTS */}
                <SectionHeader
                    title="Upcoming Events"
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
                                style={styles.eventCardHorizontal}
                                onPress={() => router.push({
                                    pathname: `/agency/selected/events/details`,
                                    params: {
                                        id: item._id,
                                        title: item.title,
                                        image: item.image
                                    }
                                })}
                            >
                                <Image source={{ uri: item.image }} style={styles.eventImgHorizontal} resizeMode="cover" />
                                <View style={styles.eventContentHorizontal}>
                                    <Text style={styles.eventTitleHorizontal} numberOfLines={2}>{item.title}</Text>
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
                                params: {
                                    id: item.id,
                                    title: item.title
                                }
                            })}
                        >
                            <View style={styles.scholarshipHeader}>
                                <MaterialIcons name="workspace-premium" size={18} color={COLORS.white} />
                            </View>
                            <Text style={styles.scholarshipText} numberOfLines={2}>
                                {item.title}
                            </Text>
                        </TouchableOpacity>
                    )}
                    ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
                />

                {/* UNIVERSITIES */}
                <SectionHeader
                    title="Partner Universities"
                    onBtnPress={() => router.push({ pathname: `/agency/selected/universities/${id}` })}
                />
                <FlatList
                    horizontal
                    data={agencyData?.partnerUniversities || []}
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
                        >
                            {item.logo ? (
                                <Image
                                    source={{ uri: item.logo }}
                                    style={styles.uniImg}
                                    resizeMode="contain"
                                />
                            ) : (
                                <View style={styles.uniPlaceholder}>
                                    <Text style={styles.uniPlaceholderText}>
                                        {item.name?.substring(0, 2).toUpperCase() || 'UN'}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    )}
                    ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
                />

                {/* MENTORS */}
                <SectionHeader
                    title="Expert Mentors"
                    onBtnPress={() => router.push(`/agency/selected/mentors/${id}`)}
                />
                {mentors.map((mentor) => (
                    <View key={mentor.id} style={styles.mentorCard}>
                        <Image source={{ uri: mentor.avatar }} style={styles.mentorAvatar} />
                        <View style={styles.mentorInfo}>
                            <Text style={styles.mentorName}>{mentor.name}</Text>
                            <Text style={styles.mentorSub}>{mentor.bio}</Text>
                            <View style={styles.mentorTags}>
                                <View style={styles.mentorTag}>
                                    <Text style={styles.mentorTagText}>Higher Education</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                ))}

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
    notificationBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        position: 'relative',
    },
    notificationDot: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FF4757',
        borderWidth: 1.5,
        borderColor: COLORS.white,
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
    mentorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 10,
    },
    mentorAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    mentorInfo: {
        flex: 1,
        marginLeft: 14,
    },
    mentorName: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    mentorSub: {
        fontSize: 13,
        color: COLORS.textSecondary,
        lineHeight: 18,
        marginBottom: 8,
    },
    mentorTags: {
        flexDirection: 'row',
    },
    mentorTag: {
        backgroundColor: 'rgba(118, 159, 205, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    mentorTagText: {
        fontSize: 11,
        color: COLORS.primary,
        fontWeight: '600',
    },
});