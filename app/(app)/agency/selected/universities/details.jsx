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
    const { id, uniName, uniLogo, uniCountry } = useLocalSearchParams();
    const { userToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const response = await fetch(`https://edu-agent-backend-nine.vercel.app/api/v1/agency/universities/${id}`, {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                });

                if (response.ok) {
                    const json = await response.json();
                    const uni = json.unversity || json.university || {};
                    console.log(response.status, json);

                    setData({
                        name: uni?.name || uniName || "University",
                        logo: uni?.logo || uniLogo || null,
                        website: uni?.websiteURL || "No website provided",
                        country: uni?.country || uniCountry || "Country not specified",
                        about: uni?.about || "No description available",
                        mission: uni?.mission || "No mission statement available",
                        courses: uni?.courses || [],
                        ranking: uni?.ranking || "Top 100",
                        type: uni?.type || "Public University"
                    });
                } else {
                    throw new Error("No data");
                }
            } catch (error) {
                console.log("Error fetching uni details:", error);
                // Fallback data
                setData({
                    name: uniName || "University of Technology",
                    logo: uniLogo || null,
                    website: "https://www.university.edu",
                    country: uniCountry || "United States",
                    about: "A prestigious research university known for innovation and academic excellence. Founded in 1868, it has produced numerous Nobel laureates and industry leaders.",
                    mission: "To advance knowledge and educate students in science, technology, and other areas of scholarship that will best serve the nation and the world.",
                    courses: [
                        { _id: '1', title: "Computer Science" },
                        { _id: '2', title: "Mechanical Engineering" },
                        { _id: '3', title: "Business Administration" },
                        { _id: '4', title: "Biotechnology" },
                        { _id: '5', title: "Architecture" }
                    ],
                    ranking: "Top 50 Worldwide",
                    type: "Public Research University"
                });
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id, userToken, uniName, uniLogo, uniCountry]);

    const handleWebsitePress = () => {
        if (data?.website) {
            let url = data.website;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = `https://${url}`;
            }
            Linking.openURL(url).catch(err => console.error('Failed to open URL:', err));
        }
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

            {/* Header with consistent blue design */}
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

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* University Logo Banner */}
                <View style={styles.bannerContainer}>
                    <View style={styles.bannerOverlay} />
                    {data.logo ? (
                        <Image
                            source={{ uri: data.logo }}
                            style={styles.universityLogo}
                            resizeMode="contain"
                        />
                    ) : (
                        <View style={styles.logoPlaceholder}>
                            <Text style={styles.logoPlaceholderText}>
                                {data.name ? data.name.charAt(0).toUpperCase() : 'U'}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Main Content Card */}
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

                        <View style={styles.infoCard}>
                            <View style={[styles.infoIcon, { backgroundColor: COLORS.primaryLight }]}>
                                <Feather name="award" size={18} color={COLORS.primary} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Global Ranking</Text>
                                <Text style={styles.infoValue}>{data.ranking}</Text>
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
                        {data.courses.length > 0 ? (
                            <FlatList
                                data={data.courses}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={(item) => item._id || item.id}
                                contentContainerStyle={styles.coursesList}
                                renderItem={({ item, index }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.courseCard,
                                            {
                                                backgroundColor: getCourseColor(index),
                                                elevation: 2,
                                                shadowColor: '#000',
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: 0.1,
                                                shadowRadius: 4,
                                            }
                                        ]}
                                        activeOpacity={0.85}
                                    >
                                        <Feather name="book" size={20} color="rgba(255,255,255,0.9)" />
                                        <Text style={styles.courseCardText}>{item.title || "Course"}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        ) : (
                            <View style={styles.noCourses}>
                                <Feather name="book" size={28} color={COLORS.border} />
                                <Text style={styles.noCoursesText}>No courses available</Text>
                            </View>
                        )}
                    </View>

                    {/* University Type Card */}
                    <View style={styles.typeCard}>
                        <View style={styles.typeHeader}>
                            <MaterialIcons name="school" size={20} color={COLORS.white} />
                            <Text style={styles.typeTitle}>University Type</Text>
                        </View>
                        <Text style={styles.typeValue}>{data.type}</Text>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Fixed Apply Button in UniversityDetail.jsx */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={styles.applyButton}
                    activeOpacity={0.85}
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
                    <Text style={styles.applyButtonText}>Apply Now</Text>
                    <Feather name="arrow-right" size={20} color={COLORS.white} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

// Helper function to get consistent course card colors
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
    // Banner
    bannerContainer: {
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
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
    },
    universityLogo: {
        width: '70%',
        height: '70%',
        position: 'relative',
        zIndex: 1,
    },
    logoPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        zIndex: 1,
    },
    logoPlaceholderText: {
        fontSize: 36,
        fontWeight: '700',
        color: '#FFFFFF',
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
        gap: 15,
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
        marginBottom: 24,
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
    courseCardText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
        lineHeight: 18,
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
    typeCard: {
        backgroundColor: COLORS.primary,
        borderRadius: 20,
        padding: 20,
        marginTop: 10,
        elevation: 3,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    typeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    typeTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.white,
        marginLeft: 10,
    },
    typeValue: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.white,
    },
    // Bottom Bar with Apply Button
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
    applyButton: {
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
    applyButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: COLORS.white,
    },
});