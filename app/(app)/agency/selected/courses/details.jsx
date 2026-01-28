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
    Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
    const [isAlreadySelected, setIsAlreadySelected] = useState(false);

    useEffect(() => {
        const fetchCourseAndStatus = async () => {
            try {
                setLoading(true);
                const [courseRes, statusRes] = await Promise.all([
                    fetch(`${Config.API_BASE_URL}/agency/courses/${courseId}`, {
                        headers: {
                            'Authorization': `Bearer ${userToken}`,
                            'Content-Type': 'application/json'
                        }
                    }),
                    fetch(`${Config.API_BASE_URL}/students/application/status`, {
                        headers: {
                            'Authorization': `Bearer ${userToken}`,
                            'Content-Type': 'application/json'
                        }
                    })
                ]);

                if (courseRes.ok) {
                    const courseJson = await courseRes.json();
                    setCourseData(courseJson.course || getFallbackData());
                }

                if (statusRes.ok) {
                    const statusJson = await statusRes.json();
                    if (statusJson.data !== null) {
                        setIsAlreadySelected(true);
                    }
                }
            } catch (error) {
                setCourseData(getFallbackData());
            } finally {
                setLoading(false);
            }
        };

        fetchCourseAndStatus();
    }, [courseId, userToken]);

    const handleApplyNow = async () => {
        try {
            setSubmitting(true);
            const response = await fetch(
                `${Config.API_BASE_URL}/students/courses/select/${courseId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${userToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                Alert.alert(
                    "Selection Successful",
                    "The course has been selected. We are currently waiting for an agent to be assigned.",
                    [{ text: "OK", onPress: () => router.back() }]
                );
            } else {
                const errorData = await response.json();
                Alert.alert("Selection Failed", errorData.message || "Something went wrong.");
            }
        } catch (error) {
            Alert.alert("Error", "Could not connect to the server.");
        } finally {
            setSubmitting(false);
        }
    };

    const getFallbackData = () => ({
        title: courseName || "No data",
        about: "no data",
        description: "No data",
        level: "No data",
        duration: "No data",
        tuitionFee: { totalfee: "No data", currency: "null" },
        entryRequirements: ["No data"],
        status: "null",
        intakes: null,
        providedBy: { _id: "695e06c57a990e549f30053f", logo: DEFAULT_UNI_LOGO }
    });

    const formatTuitionFee = () => {
        if (!courseData?.tuitionFee?.totalfee) return "Contact for details";
        const { totalfee, currency } = courseData.tuitionFee;
        try {
            const feeNumber = parseInt(totalfee);
            if (isNaN(feeNumber)) return `${currency} ${totalfee}`;
            return currency === 'AUD' ? `AUD $${feeNumber.toLocaleString()} per year` : `${currency} ${feeNumber.toLocaleString()}`;
        } catch (error) {
            return `${currency} ${totalfee}`;
        }
    };

    const formatIntakes = () => {
        if (!courseData?.intakes) return "Limited seats";
        return `${courseData.intakes} seats available`;
    };

    if (loading) {
        return (
            <View style={[styles.center, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color={COLORS.primaryBlue} />
                <Text style={styles.loadingText}>Loading course details...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={[
                styles.header,
                { 
                    backgroundColor: courseData.level === 'graduate' ? '#4ECDC4' : '#FF6B6B',
                    paddingTop: insets.top + 10 
                }
            ]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={26} color="#FFF" />
                </TouchableOpacity>

                <View style={styles.headerContent}>
                    <Text style={styles.courseLevel}>{courseData.level?.toUpperCase() || 'UNDERGRADUATE'}</Text>
                    <Text style={styles.courseTitle} numberOfLines={2}>{courseData.title}</Text>
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
                            <Text style={styles.metaText}>{courseData.status === 'open' ? 'Open' : 'Closed'}</Text>
                        </View>
                    </View>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Feather name="info" size={20} color={COLORS.primaryBlue} />
                        <Text style={styles.sectionTitle}>About this Course</Text>
                    </View>
                    <View style={styles.card}>
                        <Text style={styles.cardText}>{courseData.about || 'No description available'}</Text>
                    </View>
                </View>

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

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Feather name="dollar-sign" size={20} color={COLORS.primaryBlue} />
                        <Text style={styles.sectionTitle}>Tuition Fees</Text>
                    </View>
                    <View style={styles.card}>
                        <View style={styles.feeContainer}>
                            <Text style={styles.feeAmount}>{formatTuitionFee()}</Text>
                            <Text style={styles.feeNote}>Tuition fee per year</Text>
                        </View>
                        {courseData.tuitionFee?.currency && (
                            <View style={styles.currencyInfo}>
                                <Text style={styles.currencyText}>Currency: {courseData.tuitionFee.currency}</Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Feather name="list" size={20} color={COLORS.primaryBlue} />
                        <Text style={styles.sectionTitle}>Entry Requirements</Text>
                    </View>
                    <View style={styles.card}>
                        {courseData.entryRequirements && courseData.entryRequirements.length > 0 ? (
                            courseData.entryRequirements.map((requirement, index) => (
                                <View key={index} style={styles.requirementItem}>
                                    <View style={styles.bulletPoint} />
                                    <Text style={styles.requirementText}>{requirement}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.noRequirementsText}>No specific requirements listed</Text>
                        )}
                    </View>
                </View>

                {courseData.providedBy && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <MaterialIcons name="school" size={20} color={COLORS.primaryBlue} />
                            <Text style={styles.sectionTitle}>Provided By</Text>
                        </View>
                        <View style={styles.universityCard}>
                            <Image
                                source={courseData.providedBy.logo ? { uri: courseData.providedBy.logo } : DEFAULT_UNI_LOGO}
                                style={styles.universityLogo}
                                resizeMode="contain"
                            />
                            <View style={styles.universityInfo}>
                                <Text style={styles.universityName}>{courseData.providedBy.name || 'University Partner'}</Text>
                                <Text style={styles.universityNote}>This course is offered through our partner institution</Text>
                            </View>
                        </View>
                    </View>
                )}

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Feather name="file-text" size={20} color={COLORS.primaryBlue} />
                        <Text style={styles.sectionTitle}>Course Information</Text>
                    </View>
                    <View style={styles.infoGrid}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Course Level</Text>
                            <Text style={styles.infoValue}>{courseData.level?.charAt(0).toUpperCase() + courseData.level?.slice(1) || 'Undergraduate'}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Duration</Text>
                            <Text style={styles.infoValue}>{courseData.duration || 'N/A'}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Status</Text>
                            <View style={[styles.statusBadge, { backgroundColor: courseData.status === 'open' ? '#D4EDDA' : '#F8D7DA' }]}>
                                <Text style={[styles.statusText, { color: courseData.status === 'open' ? '#155724' : '#721C24' }]}>
                                    {courseData.status === 'open' ? 'Open' : 'Closed'}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Available Seats</Text>
                            <Text style={styles.infoValue}>{courseData.intakes ? `${courseData.intakes} seats` : 'Limited'}</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Tracker Info Box - Appears above Bottom Bar if selected */}
            {isAlreadySelected && (
                <View style={styles.trackerLinkContainer}>
                    <TouchableOpacity 
                        style={styles.trackerBox}
                        onPress={() => router.push({
                            pathname: 'agency/selected/updates', 
                            params: { id: agencyId }
                        })}
                    >
                        <View style={styles.trackerLeft}>
                            <View style={styles.trackerIconCircle}>
                                <Ionicons name="time-outline" size={20} color={COLORS.primaryBlue} />
                            </View>
                            <View>
                                <Text style={styles.trackerTitle}>You have an ongoing application</Text>
                                <Text style={styles.trackerSub}>Click here to view status</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={COLORS.primaryBlue} />
                    </TouchableOpacity>
                </View>
            )}

            {/* Bottom Bar */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
                <TouchableOpacity
                    style={[
                        styles.applyButton,
                        (courseData.status !== 'open' || submitting || isAlreadySelected) && styles.applyButtonDisabled
                    ]}
                    disabled={courseData.status !== 'open' || submitting || isAlreadySelected}
                    onPress={handleApplyNow}
                >
                    {submitting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.applyText}>
                            {isAlreadySelected 
                                ? 'APPLICATION IN PROGRESS' 
                                : courseData.status === 'open' ? 'APPLY NOW' : 'APPLICATIONS CLOSED'}
                        </Text>
                    )}
                </TouchableOpacity>
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
    feeContainer: { alignItems: 'center', marginBottom: 12 },
    feeAmount: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
    feeNote: { fontSize: 14, color: COLORS.textSecondary },
    currencyInfo: { paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
    currencyText: { fontSize: 14, color: COLORS.textSecondary, fontStyle: 'italic' },
    requirementItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    bulletPoint: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primaryBlue, marginTop: 8, marginRight: 10 },
    requirementText: { flex: 1, fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 },
    universityCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
    universityLogo: { width: 120, height: 60, marginBottom: 16 },
    universityInfo: { alignItems: 'center' },
    universityName: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8, textAlign: 'center' },
    universityNote: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    infoItem: { width: '48%', backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
    infoLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
    infoValue: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
    statusText: { fontSize: 12, fontWeight: '600' },
    trackerLinkContainer: { paddingHorizontal: 20, marginBottom: 10 },
    trackerBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#EBF2FA', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#D0E1F5' },
    trackerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    trackerIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
    trackerTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
    trackerSub: { fontSize: 12, color: COLORS.primaryBlue, fontWeight: '500', marginTop: 2 },
    bottomBar: { padding: 20, backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.border },
    applyButton: { backgroundColor: COLORS.primaryBlue, height: 55, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
    applyButtonDisabled: { backgroundColor: COLORS.textSecondary },
    applyText: { color: '#FFF', fontWeight: 'bold', fontSize: 15, letterSpacing: 1 },
});