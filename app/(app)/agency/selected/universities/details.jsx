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
    StatusBar,
    Linking
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';
import { Config } from '../../../../config';

const COLORS = {
    bg: '#F8FAFD',
    primary: '#769FCD',
    primaryLight: 'rgba(118, 159, 205, 0.1)',
    white: '#FFFFFF',
    textPrimary: '#2D3748',
    textSecondary: '#718096',
    border: '#EEF2F7',
    cardBg: '#FFFFFF',
    success: '#4CAF50',
};

export default function UniversityDetail() {
    const router = useRouter();
    const { id, uniName, uniLogo } = useLocalSearchParams();
    const { userToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [imageError, setImageError] = useState(false);
    const [selectedCourseId, setSelectedCourseId] = useState(null); // Track student's selected course

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                // Fetch university details and student profile in parallel
                const [uniResponse, profileResponse] = await Promise.all([
                    fetch(`${Config.API_BASE_URL}/agency/universities/${id}`, {
                        headers: { 'Authorization': `Bearer ${userToken}` }
                    }),
                    fetch(`${Config.API_BASE_URL}/students/profile`, {
                        headers: { 'Authorization': `Bearer ${userToken}` }
                    })
                ]);

                // Handle university data
                if (uniResponse.ok) {
                    const json = await uniResponse.json();
                    const uni = json.unversity || json.university || {};

                    setData({
                        name: uni?.name || uniName || "University",
                        logo: uni?.logo || uniLogo || null,
                        website: uni?.websiteURL || "No website provided",
                        country: uni?.country || "Country not specified",
                        about: uni?.about || "No description available",
                        mission: uni?.mission || "No mission statement available",
                        courses: uni?.courses || [],
                    });
                } else {
                    throw new Error("No data");
                }

                // Handle student profile - extract selected course ID
                if (profileResponse.ok) {
                    const profileJson = await profileResponse.json();
                    const selectedCourse =
                        profileJson.selectedCourse ||
                        profileJson.data?.selectedCourse ||
                        profileJson.profile?.selectedCourse;

                    if (selectedCourse) {
                        // selectedCourse might be an object with _id or just a string ID
                        const courseId = selectedCourse?._id || selectedCourse;
                        setSelectedCourseId(String(courseId));
                    }
                }
            } catch (error) {
                console.log("Error fetching data:", error);
                // Fallback data
                setData({
                    name: uniName || "University of Technology",
                    logo: uniLogo || null,
                    website: "https://www.university.edu",
                    country: "United States",
                    about: "A prestigious research university known for innovation and academic excellence. Founded in 1868, it has produced numerous Nobel laureates and industry leaders.",
                    mission: "To advance knowledge and educate students in science, technology, and other areas of scholarship that will best serve the nation and the world.",
                    courses: [
                        { _id: '1', title: "Computer Science" },
                        { _id: '2', title: "Mechanical Engineering" },
                        { _id: '3', title: "Business Administration" },
                        { _id: '4', title: "Biotechnology" },
                        { _id: '5', title: "Architecture" }
                    ],
                });
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, [id, userToken, uniName, uniLogo]);

    const handleWebsitePress = () => {
        if (data?.website) {
            let url = data.website;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = `https://${url}`;
            }
            Linking.openURL(url).catch(err => console.error('Failed to open URL:', err));
        }
    };

    // Check if a course is the student's selected/applied course
    const isCourseSelected = (course) => {
        if (!selectedCourseId) return false;
        const courseId = course?._id || course?.id;
        return String(courseId) === selectedCourseId;
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading university details...</Text>
            </View>
        );
    }

    if (!data) return null;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="chevron-back" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>University Details</Text>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            {/* University Image Banner */}
            <View style={styles.bannerContainer}>
                {data.logo && !imageError ? (
                    <Image
                        source={{ uri: data.logo }}
                        style={styles.universityBannerImage}
                        resizeMode="cover"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <View style={styles.bannerPlaceholder}>
                        <Text style={styles.bannerPlaceholderText}>
                            {data.name ? data.name.charAt(0).toUpperCase() : 'U'}
                        </Text>
                    </View>
                )}
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.contentCard}>
                    {/* University Name */}
                    <Text style={styles.universityName}>{data.name}</Text>

                    {/* Quick Info Grid */}
                    <View style={styles.infoGrid}>
                        <View style={styles.infoCard}>
                            <View style={[styles.infoIcon, { backgroundColor: COLORS.primaryLight }]}>
                                <MaterialIcons name="location-on" size={18} color={COLORS.primary} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Location</Text>
                                <Text style={styles.infoValue}>{data.country}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Website */}
                    <TouchableOpacity
                        style={styles.websiteCard}
                        onPress={handleWebsitePress}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.websiteIcon, { backgroundColor: COLORS.primaryLight }]}>
                            <Feather name="globe" size={20} color={COLORS.primary} />
                        </View>
                        <View style={styles.websiteContent}>
                            <Text style={styles.websiteLabel}>Official Website</Text>
                            <Text style={styles.websiteText} numberOfLines={1}>
                                {data.website.replace(/^https?:\/\//, '').replace(/^www\./, '')}
                            </Text>
                        </View>
                        <Feather name="external-link" size={18} color={COLORS.primary} />
                    </TouchableOpacity>

                    {/* About Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Feather name="info" size={20} color={COLORS.primary} />
                            <Text style={styles.sectionTitle}>About University</Text>
                        </View>
                        <Text style={styles.paragraph}>{data.about}</Text>
                    </View>

                    {/* Mission Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Feather name="target" size={20} color={COLORS.primary} />
                            <Text style={styles.sectionTitle}>Mission & Vision</Text>
                        </View>
                        <Text style={styles.paragraph}>{data.mission}</Text>
                    </View>

                    {/* Courses Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Feather name="book-open" size={20} color={COLORS.primary} />
                            <Text style={styles.sectionTitle}>Available Programs</Text>
                        </View>

                        {/* Legend hint if student has a selected course */}
                        {selectedCourseId && (
                            <Text style={styles.selectionHint}>
                                You have an active application on one of these programs.
                            </Text>
                        )}

                        {data.courses.length > 0 ? (
                            <FlatList
                                data={data.courses}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={(item) => item._id || item.id || Math.random().toString()}
                                contentContainerStyle={styles.coursesList}
                                renderItem={({ item, index }) => {
                                    const applied = isCourseSelected(item);
                                    return (
                                        <TouchableOpacity
                                            style={[
                                                styles.courseCard,
                                                {
                                                    backgroundColor: applied
                                                        ? '#B0BEC5'  // Grey out applied course
                                                        : getCourseColor(index)
                                                },
                                                applied && styles.courseCardApplied,
                                            ]}
                                            activeOpacity={applied ? 1 : 0.85}
                                            disabled={applied}
                                        >
                                            <Feather
                                                name={applied ? "check-circle" : "book"}
                                                size={20}
                                                color="rgba(255,255,255,0.9)"
                                            />
                                            <Text style={styles.courseCardText}>
                                                {item.title || "Course"}
                                            </Text>
                                            {applied && (
                                                <Text style={styles.appliedBadge}>Applied</Text>
                                            )}
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                        ) : (
                            <View style={styles.noCourses}>
                                <Feather name="book" size={28} color={COLORS.border} />
                                <Text style={styles.noCoursesText}>No courses available</Text>
                            </View>
                        )}
                    </View>
                </View>
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Fixed Apply Button */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={[
                        styles.applyButton,
                        selectedCourseId && styles.applyButtonDisabled,
                    ]}
                    activeOpacity={selectedCourseId ? 1 : 0.85}
                    disabled={!!selectedCourseId}
                    onPress={() => {
                        if (data?.courses) {
                            router.push({
                                pathname: "agency/selected/courses/unicourse",
                                params: {
                                    courses: JSON.stringify(data.courses),
                                    uniName: data.name,
                                    agencyId: id
                                }
                            });
                        }
                    }}
                >
                    <Text style={styles.applyButtonText}>
                        {selectedCourseId ? 'APPLICATION IN PROGRESS' : 'Apply Now'}
                    </Text>
                    {!selectedCourseId && (
                        <Feather name="arrow-right" size={20} color={COLORS.white} />
                    )}
                </TouchableOpacity>
                {selectedCourseId && (
                    <Text style={styles.blockedText}>
                        You already have an active course application.
                    </Text>
                )}
            </View>
        </SafeAreaView>
    );
}

const getCourseColor = (index) => {
    const colors = ['#FF6B6B', '#769FCD', '#4ECDC4', '#95E1D3', '#FFD166'];
    return colors[index % colors.length];
};

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
    loadingText: {
        fontSize: 16,
        color: COLORS.textSecondary,
        marginTop: 12,
    },
    header: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 20,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.white,
        textAlign: 'center',
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 0,
    },
    bannerContainer: {
        height: 220,
        width: '100%',
        backgroundColor: COLORS.primary,
        overflow: 'hidden',
    },
    universityBannerImage: {
        width: '100%',
        height: '100%',
    },
    bannerPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bannerPlaceholderText: {
        fontSize: 80,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.3)',
    },
    contentCard: {
        backgroundColor: COLORS.white,
        paddingHorizontal: 24,
        paddingTop: 28,
        paddingBottom: 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -20,
    },
    universityName: {
        fontSize: 26,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 32,
    },
    infoGrid: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    infoCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bg,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    infoIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    websiteCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bg,
        borderRadius: 16,
        padding: 16,
        marginBottom: 28,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    websiteIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    websiteContent: {
        flex: 1,
    },
    websiteLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    websiteText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.primary,
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
    selectionHint: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 12,
        fontStyle: 'italic',
    },
    coursesList: {
        paddingRight: 20,
    },
    courseCard: {
        width: 150,
        height: 100,
        borderRadius: 16,
        padding: 16,
        marginRight: 12,
        justifyContent: 'space-between',
    },
    courseCardApplied: {
        opacity: 0.75,
    },
    courseCardText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
        lineHeight: 18,
    },
    appliedBadge: {
        fontSize: 11,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.9)',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    noCourses: {
        backgroundColor: COLORS.bg,
        borderRadius: 16,
        padding: 32,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    noCoursesText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    applyButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 16,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    applyButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: COLORS.white,
    },
    applyButtonDisabled: {
        backgroundColor: '#B0BEC5',
    },
    blockedText: {
        textAlign: 'center',
        color: COLORS.textSecondary,
        marginTop: 10,
        fontSize: 12,
    },
});