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
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';

const COLORS = {
    bg: '#FFFFFF',
    primary: '#769FCD',
    text: '#1E293B',
    textMuted: '#64748B',
    cardBg: '#FFFFFF',
    border: '#E2E8F0',
    buttonBg: '#769FCD',
};

export default function UniversityDetail() {
    const router = useRouter();
    const { id, uniName, uniLogo } = useLocalSearchParams(); // Add uniLogo here
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
                    // Accessing data from json.university as per Postman screenshot
                    const uni = json.unversity;

                    setData({
                        name: uni?.name || uniName || "University",
                        logo: uni?.logo || uniLogo || null,
                        website: uni?.websiteURL || "No website provided", // Fixed field name
                        country: uni?.country || "Country not specified",
                        about: uni?.about || "No description available",
                        mission: uni?.mission || "No mission statement available",
                        courses: uni?.courses || [] // Maps the array of courses
                    });
                } else {
                    throw new Error("No data");
                }
            } catch (error) {
                console.log("Error fetching uni details:", error);
                // Fallback stays as you had it
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id, userToken, uniName, uniLogo]);

    const handleWebsitePress = () => {
        if (data?.website && (data.website.startsWith('http://') || data.website.startsWith('https://'))) {
            Linking.openURL(data.website).catch(err => console.error('Failed to open URL:', err));
        } else if (data?.website) {
            Linking.openURL(`https://${data.website}`).catch(err => console.error('Failed to open URL:', err));
        }
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
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>University Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* University Logo Banner */}
                <View style={styles.banner}>
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

                {/* University Name */}
                <View style={styles.nameContainer}>
                    <Text style={styles.universityName}>{data.name}</Text>
                </View>

                {/* Info Cards */}
                <View style={styles.infoGrid}>
                    {/* Website - Clickable */}
                    <TouchableOpacity
                        style={styles.infoCard}
                        onPress={handleWebsitePress}
                        activeOpacity={0.7}
                    >
                        <View style={styles.infoIconContainer}>
                            <Feather name="globe" size={18} color={COLORS.primary} />
                        </View>
                        <Text style={styles.infoLabel}>Website</Text>
                        <View style={styles.websiteContainer}>
                            <Text style={styles.websiteText} numberOfLines={1}>
                                {data.website.replace(/^https?:\/\//, '')}
                            </Text>
                            <Feather name="external-link" size={12} color={COLORS.primary} style={styles.linkIcon} />
                        </View>
                    </TouchableOpacity>

                    {/* Country */}
                    <View style={styles.infoCard}>
                        <View style={styles.infoIconContainer}>
                            <Feather name="map-pin" size={18} color={COLORS.primary} />
                        </View>
                        <Text style={styles.infoLabel}>Country</Text>
                        <Text style={styles.infoValue}>{data.country}</Text>
                    </View>
                </View>

                {/* About Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Feather name="info" size={20} color={COLORS.primary} />
                        <Text style={styles.sectionTitle}>About</Text>
                    </View>
                    <View style={styles.sectionContent}>
                        <Text style={styles.paragraph}>{data.about}</Text>
                    </View>
                </View>

                {/* Mission Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Feather name="target" size={20} color={COLORS.primary} />
                        <Text style={styles.sectionTitle}>Mission</Text>
                    </View>
                    <View style={styles.sectionContent}>
                        <Text style={styles.paragraph}>{data.mission}</Text>
                    </View>
                </View>

                {/* Courses Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Feather name="book-open" size={20} color={COLORS.primary} />
                        <Text style={styles.sectionTitle}>Available Courses</Text>
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
                                            backgroundColor: index % 3 === 0 ? '#FF6B6B' :
                                                index % 3 === 1 ? COLORS.primary : '#4ECDC4'
                                        }
                                    ]}
                                    activeOpacity={0.8}
                                >
                                    <Feather name="book" size={18} color="rgba(255,255,255,0.9)" style={styles.courseIcon} />
                                    <Text style={styles.courseCardText}>{item.title || "Course"}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    ) : (
                        <View style={styles.noCourses}>
                            <Feather name="book" size={24} color="#CBD5E1" />
                            <Text style={styles.noCoursesText}>No courses available</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Apply Button */}
            <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.applyButton} activeOpacity={0.8}>
                    <Text style={styles.applyButtonText}>Apply Now</Text>
                    <Feather name="arrow-right" size={18} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.bg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.bg,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.primary,
        flex: 1,
        textAlign: 'center',
        marginLeft: -40,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    banner: {
        height: 180,
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
        backgroundColor: 'rgba(118, 159, 205, 0.9)',
    },
    universityLogo: {
        width: '80%',
        height: '60%',
        position: 'relative',
        zIndex: 1,
    },
    logoPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        zIndex: 1,
    },
    logoPlaceholderText: {
        fontSize: 32,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    nameContainer: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        alignItems: 'center',
    },
    universityName: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.text,
        textAlign: 'center',
        lineHeight: 30,
    },
    infoGrid: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 24,
    },
    infoCard: {
        flex: 1,
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    infoIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(118, 159, 205, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    infoLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: '600',
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    websiteContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    websiteText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.primary,
        flex: 1,
    },
    linkIcon: {
        marginTop: 2,
    },
    section: {
        marginBottom: 24,
        paddingHorizontal: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    sectionContent: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    paragraph: {
        fontSize: 15,
        color: COLORS.text,
        lineHeight: 24,
    },
    coursesList: {
        paddingRight: 20,
    },
    courseCard: {
        width: 140,
        height: 100,
        borderRadius: 12,
        padding: 14,
        marginRight: 12,
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    courseIcon: {
        marginBottom: 8,
    },
    courseCardText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
        lineHeight: 18,
    },
    noCourses: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    noCoursesText: {
        fontSize: 14,
        color: COLORS.textMuted,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.bg,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    applyButton: {
        backgroundColor: COLORS.buttonBg,
        borderRadius: 12,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    applyButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});