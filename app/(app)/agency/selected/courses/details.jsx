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
    Linking
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';

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
    const params = useLocalSearchParams();
    
    // DEBUG: Log all parameters
    console.log('=== COURSE DETAILS DEBUG ===');
    console.log('All params:', params);
    console.log('Course ID:', params.courseId);
    console.log('Agency ID:', params.agencyId);
    console.log('Course Name:', params.courseName);
    console.log('============================');
    
    // Destructure after logging
    const { courseId, agencyId, courseName } = params;
    
    const { userToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [courseData, setCourseData] = useState(null);

    useEffect(() => {
        const fetchCourseDetails = async () => {
            try {
                setLoading(true);
                
                // Fetch course details from API
                const courseResponse = await fetch(
                    `https://edu-agent-backend-nine.vercel.app/api/v1/agency/courses/${courseId}`,
                    {
                        headers: { 
                            'Authorization': `Bearer ${userToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                console.log('Course API Status:', courseResponse.status);
                
                if (courseResponse.ok) {
                    const courseJson = await courseResponse.json();
                    console.log('Course API Response:', courseJson);
                    
                    if (courseJson.course) {
                        setCourseData(courseJson.course);
                    } else {
                        console.log('No course data in response');
                        setCourseData(getFallbackData());
                    }
                } else {
                    console.log('Course API failed with status:', courseResponse.status);
                    const errorText = await courseResponse.text();
                    console.log('Error response:', errorText);
                    setCourseData(getFallbackData());
                }
            } catch (error) {
                console.log("Error fetching course details:", error);
                setCourseData(getFallbackData());
            } finally {
                setLoading(false);
            }
        };

        fetchCourseDetails();
    }, [courseId, userToken]);

    const getFallbackData = () => {
        return {
            title: courseName || "No data",
            about: "no data",
            description: "No data",
            level: "No data",
            duration: "No data",
            tuitionFee: {
                totalfee: "No data",
                currency: "null"
            },
            entryRequirements: [
                "No data",
                
            ],
            status: "null",
            intakes: null,
            providedBy: {
                _id: "695e06c57a990e549f30053f",
                logo: DEFAULT_UNI_LOGO
            }
        };
    };

    // Format tuition fee
    const formatTuitionFee = () => {
        if (!courseData?.tuitionFee?.totalfee) return "Contact for details";
        
        const { totalfee, currency } = courseData.tuitionFee;
        try {
            const feeNumber = parseInt(totalfee);
            if (isNaN(feeNumber)) return `${currency} ${totalfee}`;
            
            if (currency === 'AUD') {
                return `AUD $${feeNumber.toLocaleString()} per year`;
            }
            return `${currency} ${feeNumber.toLocaleString()}`;
        } catch (error) {
            return `${currency} ${totalfee}`;
        }
    };

    // Format intakes
    const formatIntakes = () => {
        if (!courseData?.intakes) return "Limited seats";
        return `${courseData.intakes} seats available`;
    };

    // Handle website visit
    const handleVisitWebsite = () => {
        // You might want to add a website URL to your course data
        Alert.alert("Website", "University website URL not available");
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primaryBlue} />
                <Text style={styles.loadingText}>Loading course details...</Text>
            </View>
        );
    }

    if (!courseData) {
        return (
            <View style={styles.center}>
                <Feather name="alert-circle" size={50} color={COLORS.textSecondary} />
                <Text style={styles.errorText}>Course details not found</Text>
                <TouchableOpacity 
                    style={styles.retryButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.retryButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safe} edges={['bottom']}>
            <StatusBar barStyle="light-content" />
            
            {/* Header with dynamic color based on course level */}
            <View style={[
                styles.header, 
                { backgroundColor: courseData.level === 'graduate' ? '#4ECDC4' : '#FF6B6B' }
            ]}>
                <TouchableOpacity 
                    style={styles.backBtn} 
                    onPress={() => router.back()}
                >
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
                        <Text style={styles.cardText}>{courseData.about || 'No description available'}</Text>
                    </View>
                </View>

                {/* What You'll Learn Section */}
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

                {/* Tuition Fees */}
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
                                <Text style={styles.currencyText}>
                                    Currency: {courseData.tuitionFee.currency}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Entry Requirements */}
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
                                source={courseData.providedBy.logo ? 
                                    { uri: courseData.providedBy.logo } : 
                                    DEFAULT_UNI_LOGO
                                } 
                                style={styles.universityLogo} 
                                resizeMode="contain" 
                                onError={() => console.log('Failed to load university logo')}
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

                {/* Additional Info */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Feather name="file-text" size={20} color={COLORS.primaryBlue} />
                        <Text style={styles.sectionTitle}>Course Information</Text>
                    </View>
                    <View style={styles.infoGrid}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Course Level</Text>
                            <Text style={styles.infoValue}>
                                {courseData.level?.charAt(0).toUpperCase() + courseData.level?.slice(1) || 'Undergraduate'}
                            </Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Duration</Text>
                            <Text style={styles.infoValue}>{courseData.duration || 'N/A'}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Status</Text>
                            <View style={[
                                styles.statusBadge,
                                { backgroundColor: courseData.status === 'open' ? '#D4EDDA' : '#F8D7DA' }
                            ]}>
                                <Text style={[
                                    styles.statusText,
                                    { color: courseData.status === 'open' ? '#155724' : '#721C24' }
                                ]}>
                                    {courseData.status === 'open' ? 'Open' : 'Closed'}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Available Seats</Text>
                            <Text style={styles.infoValue}>
                                {courseData.intakes ? `${courseData.intakes} seats` : 'Limited'}
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Sticky Apply Button */}
            <View style={styles.bottomBar}>
                <TouchableOpacity 
                    style={[
                        styles.applyButton,
                        courseData.status !== 'open' && styles.applyButtonDisabled
                    ]}
                    disabled={courseData.status !== 'open'}
                >
                    <Text style={styles.applyText}>
                        {courseData.status === 'open' ? 'APPLY NOW' : 'APPLICATIONS CLOSED'}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
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
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    errorText: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginTop: 16,
        marginBottom: 8,
    },
    retryButton: {
        backgroundColor: COLORS.primaryBlue,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 20,
    },
    retryButtonText: {
        color: COLORS.white,
        fontWeight: '600',
        fontSize: 14,
    },
    // Header
    header: {
        height: 220,
        paddingTop: 40,
        paddingHorizontal: 20,
    },
    backBtn: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 10,
    },
    headerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    courseLevel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1,
        marginBottom: 8,
    },
    courseTitle: {
        color: '#FFF',
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        lineHeight: 34,
        marginBottom: 16,
    },
    courseMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 12,
        fontWeight: '500',
        marginLeft: 6,
    },
    metaDivider: {
        width: 1,
        height: 12,
        backgroundColor: 'rgba(255,255,255,0.3)',
        marginHorizontal: 12,
    },
    // Scroll Content
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    // Section
    section: {
        marginTop: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginLeft: 8,
    },
    // Card
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardText: {
        fontSize: 15,
        color: COLORS.textPrimary,
        lineHeight: 22,
    },
    // Fee Section
    feeContainer: {
        alignItems: 'center',
        marginBottom: 12,
    },
    feeAmount: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    feeNote: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    currencyInfo: {
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    currencyText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
    },
    // Requirements
    requirementItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    bulletPoint: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.primaryBlue,
        marginTop: 8,
        marginRight: 10,
    },
    requirementText: {
        flex: 1,
        fontSize: 14,
        color: COLORS.textPrimary,
        lineHeight: 20,
    },
    noRequirementsText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: 10,
    },
    // University Card
    universityCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
    },
    universityLogo: {
        width: 120,
        height: 60,
        marginBottom: 16,
    },
    universityInfo: {
        alignItems: 'center',
    },
    universityName: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 8,
        textAlign: 'center',
    },
    universityNote: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    // Info Grid
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    infoItem: {
        width: '48%',
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    infoLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    // Bottom Bar
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: COLORS.bg,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    applyButton: {
        backgroundColor: COLORS.primaryBlue,
        height: 55,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
    },
    applyButtonDisabled: {
        backgroundColor: COLORS.textSecondary,
    },
    applyText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
        letterSpacing: 1,
    },
});