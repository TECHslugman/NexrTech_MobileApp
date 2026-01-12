import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';

const COLORS = {
    bg: '#F8FAFD',
    primary: '#769FCD',
    primaryLight: 'rgba(118, 159, 205, 0.1)',
    white: '#FFFFFF',
    textPrimary: '#2D3748',
    textSecondary: '#718096',
    border: '#EEF2F7',
    success: '#4CAF50',
    cardBg: '#FFFFFF',
};

export default function ScholarshipDetail() {
    const router = useRouter();
    const { id, agencyId, scholarshipName } = useLocalSearchParams();
    const { userToken } = useAuth();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    const formatDate = (dateString) => {
        if (!dateString) return "Date TBA";
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            return date.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch {
            return dateString;
        }
    };

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const targetId = agencyId || id;
                const response = await fetch(`https://edu-agent-backend-nine.vercel.app/api/v1/agency/scholarships/agency/${targetId}`, {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                });

                const json = await response.json();

                if (response.ok) {
                    const list = json.scholarship || json.data || json;
                    const selected = Array.isArray(list) ? list.find(item => (item._id === id || item.id === id)) : null;

                    if (selected) {
                        setData({
                            title: selected.title || selected.name || scholarshipName,
                            about: selected.about || "No description available.",
                            howToApply: selected.howToApply || "Contact agency for details.",
                            amount: selected.amount || "Check with provider",
                            fieldOfStudy: Array.isArray(selected.fieldOfStudy)
                                ? selected.fieldOfStudy
                                : [selected.fieldOfStudy || "All Fields"],
                            deadline: formatDate(selected.applicationDateline || selected.deadline),
                            status: selected.Status || "Active",
                            eligibility: selected.eligibility || ["Academic Transcripts", "Proof of Enrollment"],
                            duration: selected.duration || "Full Program Duration",
                            coverage: selected.coverage || "Tuition & Living Expenses"
                        });
                    } else {
                        // Use fallback data if no match found
                        setData(getFallbackData());
                    }
                } else {
                    setData(getFallbackData());
                }
            } catch (error) {
                console.error("Fetch error:", error);
                setData(getFallbackData());
            } finally {
                setLoading(false);
            }
        };

        const getFallbackData = () => ({
            title: scholarshipName || "Scholarship Program",
            about: "This prestigious scholarship provides financial support to outstanding students who demonstrate academic excellence and leadership potential.",
            howToApply: "Submit your application through the agency portal along with required documents including academic transcripts, recommendation letters, and a personal statement.",
            amount: "$15,000/year",
            fieldOfStudy: ["Engineering", "Computer Science", "Business", "Medicine"],
            deadline: "March 31, 2024",
            status: "Active",
            eligibility: ["Minimum GPA 3.5", "IELTS 6.5+", "2 Recommendation Letters"],
            duration: "4 Years",
            coverage: "Tuition + Living Expenses"
        });

        fetchDetail();
    }, [id, agencyId, userToken, scholarshipName]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading scholarship details...</Text>
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
                    <Text style={styles.headerTitle}>Scholarship Details</Text>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.scrollContent}
            >
                {/* Main Scholarship Card */}
                <View style={styles.mainCard}>
                    <View style={styles.titleContainer}>
                        <View style={styles.trophyContainer}>
                            <MaterialCommunityIcons name="trophy" size={32} color={COLORS.primary} />
                        </View>
                        <Text style={styles.scholarshipTitle}>{data.title}</Text>
                        <View style={[
                            styles.statusBadge,
                            { backgroundColor: data.status === 'Active' ? 'rgba(76, 175, 80, 0.1)' : COLORS.primaryLight }
                        ]}>
                            <Text style={[
                                styles.statusText,
                                { color: data.status === 'Active' ? COLORS.success : COLORS.primary }
                            ]}>
                                {data.status}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Key Information Cards */}
                <View style={styles.infoGrid}>
                    <View style={styles.infoCard}>
                        <View style={[styles.infoIcon, { backgroundColor: COLORS.primaryLight }]}>
                            <MaterialCommunityIcons name="calendar-clock" size={20} color={COLORS.primary} />
                        </View>
                        <Text style={styles.infoLabel}>Application Deadline</Text>
                        <Text style={styles.infoValue}>{data.deadline}</Text>
                    </View>
                    
                    <View style={styles.infoCard}>
                        <View style={[styles.infoIcon, { backgroundColor: COLORS.primaryLight }]}>
                            <MaterialCommunityIcons name="cash" size={20} color={COLORS.primary} />
                        </View>
                        <Text style={styles.infoLabel}>Scholarship Value</Text>
                        <Text style={styles.infoValue}>{data.amount}</Text>
                    </View>
                </View>

                {/* Field of Study */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="book-open-variant" size={22} color={COLORS.primary} />
                        <Text style={styles.sectionTitle}>Field of Study</Text>
                    </View>
                    <View style={styles.fieldContainer}>
                        {data.fieldOfStudy.map((item, index) => (
                            <View key={index} style={styles.fieldChip}>
                                <Text style={styles.fieldText}>{item}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Eligibility Criteria */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Feather name="check-circle" size={22} color={COLORS.primary} />
                        <Text style={styles.sectionTitle}>Eligibility Criteria</Text>
                    </View>
                    <View style={styles.bulletContainer}>
                        {data.eligibility.map((item, index) => (
                            <View key={index} style={styles.bulletItem}>
                                <View style={styles.bulletDot} />
                                <Text style={styles.bulletText}>{item}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* About Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Feather name="info" size={22} color={COLORS.primary} />
                        <Text style={styles.sectionTitle}>About This Scholarship</Text>
                    </View>
                    <Text style={styles.paragraph}>{data.about}</Text>
                </View>

                {/* How to Apply */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Feather name="send" size={22} color={COLORS.primary} />
                        <Text style={styles.sectionTitle}>How to Apply</Text>
                    </View>
                    <Text style={styles.paragraph}>{data.howToApply}</Text>
                </View>

                {/* Additional Details Card */}
                <View style={styles.detailsCard}>
                    <View style={styles.detailsHeader}>
                        <Feather name="clipboard" size={20} color={COLORS.white} />
                        <Text style={styles.detailsTitle}>Additional Details</Text>
                    </View>
                    <View style={styles.detailsGrid}>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Program Duration</Text>
                            <Text style={styles.detailValue}>{data.duration}</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Coverage</Text>
                            <Text style={styles.detailValue}>{data.coverage}</Text>
                        </View>
                    </View>
                </View>
                
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Fixed Apply Button */}
            <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.applyButton} activeOpacity={0.85}>
                    <Text style={styles.applyButtonText}>Apply Now</Text>
                    <Feather name="arrow-right" size={20} color={COLORS.white} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

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
    // Main Scholarship Card
    mainCard: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 24,
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    titleContainer: {
        alignItems: 'center',
    },
    trophyContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    scholarshipTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 30,
    },
    statusBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    // Info Grid
    infoGrid: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 15,
        marginBottom: 24,
    },
    infoCard: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    infoIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    infoLabel: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginBottom: 4,
        textAlign: 'center',
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary,
        textAlign: 'center',
    },
    // Sections
    section: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 20,
        marginHorizontal: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
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
    fieldContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    fieldChip: {
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 8,
    },
    fieldText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
    },
    bulletContainer: {
        marginTop: 4,
    },
    bulletItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    bulletDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.primary,
        marginTop: 8,
        marginRight: 12,
    },
    bulletText: {
        flex: 1,
        fontSize: 15,
        color: COLORS.textSecondary,
        lineHeight: 22,
    },
    paragraph: {
        fontSize: 15,
        color: COLORS.textSecondary,
        lineHeight: 24,
    },
    // Details Card
    detailsCard: {
        backgroundColor: COLORS.primary,
        borderRadius: 20,
        marginHorizontal: 20,
        marginTop: 10,
        marginBottom: 20,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    detailsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    detailsTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.white,
        marginLeft: 10,
    },
    detailsGrid: {
        padding: 20,
    },
    detailItem: {
        marginBottom: 16,
    },
    detailLabel: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 16,
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