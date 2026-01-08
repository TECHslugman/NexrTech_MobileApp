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

export default function SelectedAgencyHome() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { userToken } = useAuth();

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
                // 1. AGENCY PROFILE & UNIVERSITIES
                const agencyRes = await fetch(`${BASE_URL}/agency/profile/${id}`, {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                });
                if (agencyRes.ok) {
                    const aJson = await agencyRes.json();
                    setAgencyData(aJson.agency || aJson.profile);
                } else {
                    setAgencyData({ organizationName: "Agency Name", partnerUniversities: [] });
                }

                // 2. COURSES
                const coursesRes = await fetch(`${BASE_URL}/agency/courses/agency/${id}`, {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                });
                if (coursesRes.ok) {
                    const cJson = await coursesRes.json();
                    if (Array.isArray(cJson.courses)) {
                        // Convert to objects with id and title
                        const courseObjects = cJson.courses.map(course => ({
                            id: course._id || course.id || Math.random().toString(),
                            title: course.title || "Course"
                        }));
                        setCourses(courseObjects);
                        // LOG COURSE IDs HERE
                        console.log('=== COURSE IDs FOR POSTMAN ===');
                        courseObjects.forEach((course, index) => {
                            console.log(`Course ${index + 1}: "${course.title}" - ID: ${course.id}`);

                            // Specific log for "Bachelor of Civil engerneering" course
                            if (course.title === "Bachelor of Civil engerneering" || course.title.includes("Bachelor of Civil engerneering")) {
                                console.log(`✨ FOUND "Bachelor of Civil engerneering" COURSE - ID: ${course.id} ✨`);
                            }
                        });
                        console.log('=============================');
                    } else {
                        // If API returns something else
                        setCourses(cJson.courses || []);
                    }
                } else {
                    // Fallback as objects with id and title only
                    setCourses([
                        { id: 'c1', title: "Bachelors of Nursing" },
                        { id: 'c2', title: "Bachelors of Political Sci." },
                        { id: 'c3', title: "IT" }
                    ]);
                }

                // 4. SCHOLARSHIPS
                const scholarRes = await fetch(`${BASE_URL}/agency/scholarships/agency/${id}`, {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                });
                if (scholarRes.ok) {
                    const sJson = await scholarRes.json();
                    setScholarships(sJson.scholarships || []);
                } else {
                    setScholarships(["Australia Awards", "The Snow Scholarship"]);
                }

                // 5. MENTORS
                const mentorRes = await fetch(`${BASE_URL}/agency/mentors/agency/${id}`, {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                });
                if (mentorRes.ok) {
                    const mJson = await mentorRes.json();
                    setMentors(mJson.mentors || []);
                } else {
                    setMentors([{ id: '1', name: 'Karma Dema', bio: '2+ years of mentoring students for higher education abroad', avatar: 'https://via.placeholder.com/100' }]);
                }

            } catch (error) {
                console.error("Critical Fetch Error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [id, userToken]);

    const GAP = 12;

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
                            <Text style={styles.agencyInitial}>
                                {(agencyData?.organizationName || 'A').charAt(0).toUpperCase()}
                            </Text>
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
                        <Text style={styles.statLabel}>Courses</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={styles.statIconContainer}>
                            <MaterialIcons name="event" size={20} color={COLORS.primary} />
                        </View>
                        <Text style={styles.statNumber}>{events.length || 0}</Text>
                        <Text style={styles.statLabel}>Events</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={styles.statIconContainer}>
                            <MaterialIcons name="workspace-premium" size={20} color={COLORS.primary} />
                        </View>
                        <Text style={styles.statNumber}>{scholarships.length || 0}</Text>
                        <Text style={styles.statLabel}>Scholarships</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={styles.statIconContainer}>
                            <Ionicons name="people" size={20} color={COLORS.primary} />
                        </View>
                        <Text style={styles.statNumber}>{mentors.length || 0}</Text>
                        <Text style={styles.statLabel}>Mentors</Text>
                    </View>
                </View>

                {/* COURSES */}
                <SectionHeader
                    title="Featured Courses"
                    onBtnPress={() => router.push({
                        pathname: `/agency/selected/courses/${id}`,
                        params: {
                            courses: JSON.stringify(courses), // Pass the courses array (objects with id and title)
                            agencyName: agencyData?.organizationName // Pass agency name
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
                                {item.title || item} {/* Show item.title for objects, item for strings */}
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
                {events.map((event) => (
                    <TouchableOpacity key={event.id} style={styles.eventCard}>
                        <View style={styles.eventImageContainer}>
                            <Image source={{ uri: event.image }} style={styles.eventImg} resizeMode="contain" />
                        </View>
                        <View style={styles.eventContent}>
                            <Text style={styles.eventTitle}>{event.title}</Text>
                            <View style={styles.eventAction}>
                                <Text style={styles.eventActionText}>View Details</Text>
                                <Feather name="arrow-right" size={14} color={COLORS.primary} />
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}

                {/* SCHOLARSHIPS */}
                <SectionHeader
                    title="Available Scholarships"
                    onBtnPress={() => router.push(`/agency/selected/scholarships/${id}`)}
                />
                <FlatList
                    horizontal
                    data={scholarships}
                    keyExtractor={(_, index) => `scholar-${index}`}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <View style={styles.scholarshipCard}>
                            <View style={styles.scholarshipHeader}>
                                <MaterialIcons name="workspace-premium" size={18} color={COLORS.white} />
                            </View>
                            <Text style={styles.scholarshipText}>{item}</Text>
                        </View>
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
                    keyExtractor={(item) => item._id || Math.random().toString()}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.uniTile}
                            onPress={() => item.websiteUrl && Linking.openURL(item.websiteUrl)}
                        >
                            <Image
                                source={item.logo ? { uri: item.logo } : DEFAULT_IMAGE}
                                style={styles.uniImg}
                                resizeMode="contain"
                            />
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

            {/* NAV BAR */}
            <View style={styles.navBar}>
                <TouchableOpacity style={styles.navItemActive}>
                    <View style={styles.navIconActive}>
                        <Ionicons name="home" size={22} color={COLORS.white} />
                    </View>
                    <Text style={styles.navLabelActive}>Home</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navItem}>
                    <Ionicons name="refresh-outline" size={22} color="#BFC7D1" />
                    <Text style={styles.navLabel}>Updates</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navItem}>
                    <Ionicons name="mail-outline" size={22} color="#BFC7D1" />
                    <Text style={styles.navLabel}>Messages</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => router.push('/user-profile')}
                >
                    <Ionicons name="person-outline" size={22} color="#BFC7D1" />
                    <Text style={styles.navLabel}>Profile</Text>
                </TouchableOpacity>
            </View>
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
    // HEADER STYLES
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
    // STATS SECTION
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
    // BODY
    body: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    listContent: {
        paddingHorizontal: 2,
    },
    // SECTION HEADER
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
    // COURSE CARD
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
    // EVENT CARD
    eventCard: {
        width: '100%',
        height: 160,
        borderRadius: 16,
        backgroundColor: COLORS.white,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 10,
    },
    eventImageContainer: {
        width: '100%',
        height: '65%',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
    },
    eventImg: {
        width: '100%',
        height: '100%',
    },
    eventContent: {
        padding: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    eventTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
        flex: 1,
        marginRight: 10,
    },
    eventAction: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    eventActionText: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: '600',
        marginRight: 4,
    },
    // SCHOLARSHIP CARD
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
    // UNIVERSITY TILE
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
    // MENTOR CARD
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
    // NAV BAR
    navBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 75,
        backgroundColor: COLORS.white,
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingBottom: 20,
    },
    navItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    navItemActive: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    navIconActive: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    navLabel: {
        fontSize: 11,
        color: '#BFC7D1',
        fontWeight: '500',
    },
    navLabelActive: {
        fontSize: 11,
        color: COLORS.primary,
        fontWeight: '700',
    },
});