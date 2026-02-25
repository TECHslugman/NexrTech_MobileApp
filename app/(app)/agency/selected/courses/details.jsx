import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router'; // Remove useFocusEffect
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';
import { Config } from '../../../../config';

const DEFAULT_UNI_LOGO = require('../../../../../assets/images/agencies/default.png');

const COLORS = {
    bg: '#F8FAFD',
    white: '#FFFFFF',
    textBlue: '#87A1C5',
    primaryBlue: '#769FCD',
    headerRed: '#FF6B6B',
    textPrimary: '#2D3748',
    textSecondary: '#718096',
    border: '#EEF2F7',
};

export default function CourseDetail() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const { courseId, agencyId, courseName } = params;

    const { userToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [courseData, setCourseData] = useState(null);
    const [isAlreadySelected, setIsAlreadySelected] = useState(false); // Start with false instead of null

    // Use useEffect like the mentor example - FIXED: changed 'id' to 'courseId'
    useEffect(() => {
        if (courseId) {
            fetchAllData();
        }
    }, [courseId]); // Only re-run if courseId changes

    const fetchAllData = async () => {
        try {
            setLoading(true);
            
            // 1. Fetch Course Details
            const courseRes = await fetch(`${Config.API_BASE_URL}/agency/courses/${courseId}`, {
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            // 2. Fetch Student Profile
            const profileRes = await fetch(`${Config.API_BASE_URL}/students/profile`, {
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json',
                },
            });

            // Handle course data
            if (courseRes.ok) {
                const courseJson = await courseRes.json();
                setCourseData(courseJson.course || getFallbackData());
            } else {
                setCourseData(getFallbackData());
            }
           
            // Handle profile data - exactly like mentor example logic
            if (profileRes.ok) {
                const profileJson = await profileRes.json();
                // Get selected course - adjust based on your API response structure
                const selectedCourseId = profileJson.selectedCourse || 
                                        profileJson.data?.selectedCourse ||
                                        profileJson.profile?.selectedCourse;
                
                // Logic: Block if student has any selected course
                if (selectedCourseId) {
                    if (String(selectedCourseId) === String(courseId)) {
                        // This specific course is selected
                        setIsAlreadySelected(true);
                    } else {
                        // Another course is selected
                        setIsAlreadySelected(true); // Still true because they have SOME course selected
                    }
                } else {
                    // No course selected at all
                    setIsAlreadySelected(false);
                }
            } else {
                // Profile fetch failed, assume not selected
                setIsAlreadySelected(false);
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            setCourseData(getFallbackData());
            setIsAlreadySelected(false);
        } finally {
            setLoading(false);
        }
    };

    const handleApplyNow = async () => {
        // Don't allow if already has a selected course
        if (isAlreadySelected) return;

        try {
            setSubmitting(true);
            const response = await fetch(
                `${Config.API_BASE_URL}/students/courses/select/${courseId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${userToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (response.ok) {
                setIsAlreadySelected(true);

                Toast.show({
                    type: 'success',
                    text1: 'Selection Successful',
                    text2: 'Course selected! Waiting for agent assignment.',
                    visibilityTime: 2000,
                });

                setTimeout(() => {
                    router.back();
                }, 2100);
            } else {
                const errorData = await response.json();
                if (response.status === 400 || errorData.message?.includes('already')) {
                    setIsAlreadySelected(true);
                }
                Toast.show({
                    type: 'error',
                    text1: 'Selection Failed',
                    text2: errorData.message || 'Something went wrong.',
                });
            }
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Network Error',
                text2: 'Could not connect to the server.',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const getFallbackData = () => ({
        title: courseName || 'No data',
        about: 'No data',
        description: 'No data',
        level: 'No data',
        duration: 'No data',
        tuitionFees: { totalfee: 'No data', currency: 'null' },
        entryRequirements: ['No data'],
        status: 'null',
        intakes: null,
        providedBy: { _id: '695e06c57a990e549f30053f', logo: DEFAULT_UNI_LOGO },
    });

    const formatTuitionFees = () => {
        if (!courseData?.tuitionFees?.totalfee) return 'Contact for details';
        const { totalfee, currency } = courseData.tuitionFees;
        try {
            const feeNumber = parseInt(totalfee);
            if (isNaN(feeNumber)) return `${currency} ${totalfee}`;
            return currency === 'AUD'
                ? `AUD $${feeNumber.toLocaleString()} per year`
                : `${currency} ${feeNumber.toLocaleString()}`;
        } catch (error) {
            return `${currency} ${totalfee}`;
        }
    };

    const formatIntakes = () => {
        if (!courseData?.intakes) return 'Limited seats';
        return `${courseData.intakes} seats available`;
    };

    // Helper function to determine button state - like getButtonConfig in mentor example
    const getButtonConfig = () => {
        if (courseData?.status !== 'open') {
            return { 
                text: 'APPLICATIONS CLOSED', 
                disabled: true,
                color: COLORS.textSecondary 
            };
        }
        
        if (isAlreadySelected) {
            return { 
                text: 'APPLICATION IN PROGRESS', 
                disabled: true,
                color: COLORS.textSecondary 
            };
        }
        
        return { 
            text: 'APPLY NOW', 
            disabled: false,
            color: COLORS.primaryBlue 
        };
    };

    if (loading) {
        return (
            <View style={[styles.center, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color={COLORS.primaryBlue} />
                <Text style={styles.loadingText}>Loading course details...</Text>
            </View>
        );
    }

    const buttonConfig = getButtonConfig();

    return (
        <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View
                style={[
                    styles.header,
                    {
                        backgroundColor:
                            courseData.level === 'graduate' ? '#4ECDC4' : '#FF6B6B',
                        paddingTop: insets.top + 10,
                    },
                ]}
            >
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={26} color="#FFF" />
                </TouchableOpacity>

                <View style={styles.headerContent}>
                    <Text style={styles.courseLevel}>
                        {courseData.level?.toUpperCase() || 'UNDERGRADUATE'}
                    </Text>
                    <Text style={styles.courseTitle} numberOfLines={2}>
                        {courseData.title}
                    </Text>

                    <View style={styles.courseMeta}>
                        <View style={styles.metaItem}>
                            <Feather name="clock" size={16} color="rgba(255,255,255,0.8)" />
                            <Text style={styles.metaText}>{courseData.duration}</Text>
                        </View>
                        <View style={styles.metaDivider} />
                        <View style={styles.metaItem}>
                            <Feather name="users" size={16} color="rgba(255,255,255,0.8)" />
                            <Text style={styles.metaText}>{formatIntakes()}</Text>
                        </View>
                        <View style={styles.metaDivider} />
                        <View style={styles.metaItem}>
                            <Feather name="check-circle" size={16} color="rgba(255,255,255,0.8)" />
                            <Text style={styles.metaText}>
                                {courseData.status === 'open' ? 'Open' : 'Closed'}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* About Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Feather name="info" size={20} color={COLORS.primaryBlue} />
                        <Text style={styles.sectionTitle}>About this Course</Text>
                    </View>
                    <View style={styles.card}>
                        <Text style={styles.cardText}>
                            {courseData.about || 'No description available'}
                        </Text>
                    </View>
                </View>

                {/* Description Section */}
                {courseData.description && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Feather name="target" size={20} color={COLORS.primaryBlue} />
                            <Text style={styles.sectionTitle}>What You'll Learn</Text>
                        </View>
                        <View style={styles.card}>
                            <Text style={styles.cardText}>{courseData.description}</Text>
                        </View>
                    </View>
                )}

                {/* Fees Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Feather name="dollar-sign" size={20} color={COLORS.primaryBlue} />
                        <Text style={styles.sectionTitle}>Tuition Fees</Text>
                    </View>
                    <View style={styles.card}>
                        <View style={styles.feeContainer}>
                            <Text style={styles.feeAmount}>{formatTuitionFees()}</Text>
                            <Text style={styles.feeNote}>Tuition fee per year</Text>
                        </View>
                    </View>
                </View>

                {/* Requirements Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Feather name="list" size={20} color={COLORS.primaryBlue} />
                        <Text style={styles.sectionTitle}>Entry Requirements</Text>
                    </View>
                    <View style={styles.card}>
                        {courseData.entryRequirements &&
                        courseData.entryRequirements.length > 0 ? (
                            courseData.entryRequirements.map((requirement, index) => (
                                <View key={index} style={styles.requirementItem}>
                                    <View style={styles.bulletPoint} />
                                    <Text style={styles.requirementText}>{requirement}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.noRequirementsText}>
                                No specific requirements listed
                            </Text>
                        )}
                    </View>
                </View>

                {/* Provided By Section */}
                {courseData.providedBy && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <MaterialIcons name="school" size={20} color={COLORS.primaryBlue} />
                            <Text style={styles.sectionTitle}>Provided By</Text>
                        </View>
                        <View style={styles.universityCard}>
                            <Image
                                source={
                                    courseData.providedBy.logo
                                        ? { uri: courseData.providedBy.logo }
                                        : DEFAULT_UNI_LOGO
                                }
                                style={styles.universityLogo}
                                resizeMode="contain"
                            />
                            <View style={styles.universityInfo}>
                                <Text style={styles.universityName}>
                                    {courseData.providedBy.name || 'University Partner'}
                                </Text>
                                <Text style={styles.universityNote}>
                                    This course is offered through our partner institution
                                </Text>
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Bottom Action Bar */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
                <TouchableOpacity
                    style={[
                        styles.applyButton,
                        { backgroundColor: buttonConfig.color },
                        buttonConfig.disabled && styles.applyButtonDisabled,
                    ]}
                    disabled={buttonConfig.disabled || submitting}
                    onPress={handleApplyNow}
                >
                    {submitting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.applyText}>
                            {buttonConfig.text}
                        </Text>
                    )}
                </TouchableOpacity>
                
                {/* Show message if another course is selected - like blockedText in mentor example */}
                {isAlreadySelected && courseData?.status === 'open' && (
                    <Text style={styles.blockedText}>
                        You already have an active course application.
                    </Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
    loadingText: { marginTop: 16, fontSize: 16, color: COLORS.textSecondary },
    header: { height: 240, paddingHorizontal: 20 },
    backBtn: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
    headerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    courseLevel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
    courseTitle: { color: '#FFF', fontSize: 26, fontWeight: 'bold', textAlign: 'center', lineHeight: 32, marginBottom: 16 },
    courseMeta: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
    metaItem: { flexDirection: 'row', alignItems: 'center' },
    metaText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '500', marginLeft: 6 },
    metaDivider: { width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 12 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
    section: { marginTop: 24 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginLeft: 8 },
    card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: COLORS.border },
    cardText: { fontSize: 15, color: COLORS.textPrimary, lineHeight: 22 },
    feeContainer: { alignItems: 'center' },
    feeAmount: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
    feeNote: { fontSize: 14, color: COLORS.textSecondary },
    requirementItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    bulletPoint: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primaryBlue, marginTop: 8, marginRight: 10 },
    requirementText: { flex: 1, fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 },
    universityCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
    universityLogo: { width: 120, height: 60, marginBottom: 16 },
    universityInfo: { alignItems: 'center' },
    universityName: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8, textAlign: 'center' },
    universityNote: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
    bottomBar: { padding: 20, backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.border },
    applyButton: { height: 55, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
    applyButtonDisabled: { opacity: 0.7 },
    applyText: { color: '#FFF', fontWeight: 'bold', fontSize: 15, letterSpacing: 1 },
    blockedText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 10, fontSize: 12 },
});