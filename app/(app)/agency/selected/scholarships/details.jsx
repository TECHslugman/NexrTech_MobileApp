import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';
import { Config } from '../../../../config';

const COLORS = {
    bg: '#F8FAFD',
    white: '#FFFFFF',
    primaryBlue: '#769FCD',
    primaryLight: 'rgba(118, 159, 205, 0.08)',
    headerBlue: '#5B8CBE',
    textPrimary: '#2D3748',
    textSecondary: '#64748B',
    textLight: '#94A3B8',
    border: '#E9EDF2',
    success: '#2E7D5E',
    warning: '#B76E3C',
};

export default function ScholarshipDetail() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id, agencyId, scholarshipName } = useLocalSearchParams();
    const { userToken } = useAuth();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const formatDate = (dateString) => {
        if (!dateString) return "TBA";
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

    const formatCurrency = (amount) => {
        if (!amount) return "Amount TBD";
        if (typeof amount === 'number') {
            return `$${amount.toLocaleString()}`;
        }
        if (typeof amount === 'string') {
            if (amount.startsWith('$')) return amount;
            const num = parseFloat(amount);
            if (!isNaN(num)) return `$${num.toLocaleString()}`;
        }
        return amount;
    };

    const parseEligibility = (eligibility) => {
        if (!eligibility) return [];
        if (Array.isArray(eligibility)) return eligibility;
        if (typeof eligibility === 'string') {
            return eligibility.split(',').map(item => item.trim()).filter(item => item !== '');
        }
        return [];
    };

    const parseFieldOfStudy = (fieldOfStudy) => {
        if (!fieldOfStudy) return [];
        if (Array.isArray(fieldOfStudy)) return fieldOfStudy;
        if (typeof fieldOfStudy === 'string') {
            return fieldOfStudy.split(',').map(item => item.trim()).filter(item => item !== '');
        }
        return [];
    };

    const fetchDetail = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const targetId = agencyId || id;
            
            const response = await fetch(`${Config.API_BASE_URL}/agency/scholarships/agency/${targetId}`, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });

            const json = await response.json();

            if (response.ok) {
                const scholarshipList = json.scholarship || json.data || [];
                
                if (Array.isArray(scholarshipList) && scholarshipList.length > 0) {
                    const selected = scholarshipList.find(item => 
                        item._id === id || item.id === id
                    );

                    if (selected) {
                        setData({
                            title: selected.title || selected.name || scholarshipName || "Scholarship Program",
                            description: selected.about || selected.description || "",
                            howToApply: selected.howToApply || "",
                            amount: formatCurrency(selected.amount),
                            fieldOfStudy: parseFieldOfStudy(selected.fieldOfStudy),
                            deadline: formatDate(selected.applicationDateline || selected.deadline || selected.applicationDeadline),
                            status: selected.status || selected.Status || "Active",
                            eligibility: parseEligibility(selected.eligibility),
                            duration: selected.duration || "",
                            coverage: selected.coverage || "",
                            provider: selected.provider || selected.agencyName || "",
                        });
                    } else {
                        setError('Scholarship not found');
                    }
                } else {
                    setError('No scholarships available');
                }
            } else {
                setError('Failed to load scholarship details');
            }
        } catch (error) {
            console.error("Fetch error:", error);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetail();
    }, [id, agencyId, userToken]);

    if (loading) {
        return (
            <View style={[styles.center, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color={COLORS.primaryBlue} />
                <Text style={styles.loadingText}>Loading scholarship details...</Text>
            </View>
        );
    }

    if (error || !data) {
        return (
            <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
                <StatusBar barStyle="dark-content" />
                <View style={[styles.errorHeader, { paddingTop: insets.top + 10 }]}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={26} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                </View>
                <View style={styles.center}>
                    <View style={styles.errorCard}>
                        <View style={styles.errorIconContainer}>
                            <Ionicons name="alert-circle-outline" size={48} color={COLORS.primaryBlue} />
                        </View>
                        <Text style={styles.errorTitle}>Unable to Load</Text>
                        <Text style={styles.errorText}>{error || 'Scholarship details not found'}</Text>
                        <TouchableOpacity 
                            style={styles.retryButton}
                            onPress={fetchDetail}
                        >
                            <Text style={styles.retryButtonText}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={[
                styles.header,
                { paddingTop: insets.top + 10 }
            ]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={26} color="#FFF" />
                </TouchableOpacity>

                <View style={styles.headerContent}>
                    <Text style={styles.scholarshipTitle} numberOfLines={2}>
                        {data.title}
                    </Text>

                    <View style={styles.scholarshipMeta}>
                        {data.deadline && data.deadline !== "TBA" && (
                            <View style={styles.metaItem}>
                                <Feather name="calendar" size={14} color="rgba(255,255,255,0.9)" />
                                <Text style={styles.metaText}>{data.deadline}</Text>
                            </View>
                        )}
                        {data.amount && data.amount !== "Amount TBD" && (
                            <>
                                {data.deadline && data.deadline !== "TBA" && <View style={styles.metaDivider} />}
                                <View style={styles.metaItem}>
                                    <Feather name="award" size={14} color="rgba(255,255,255,0.9)" />
                                    <Text style={styles.metaText}>{data.amount}</Text>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.scrollContent}
            >
                {/* About Section */}
                {data.description && data.description !== "" && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Feather name="info" size={18} color={COLORS.primaryBlue} />
                            <Text style={styles.sectionTitle}>About this Scholarship</Text>
                        </View>
                        <View style={styles.card}>
                            <Text style={styles.cardText}>{data.description}</Text>
                        </View>
                    </View>
                )}

                {/* Field of Study */}
                {data.fieldOfStudy && data.fieldOfStudy.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Feather name="book-open" size={18} color={COLORS.primaryBlue} />
                            <Text style={styles.sectionTitle}>Field of Study</Text>
                        </View>
                        <View style={styles.card}>
                            <View style={styles.chipContainer}>
                                {data.fieldOfStudy.map((item, index) => (
                                    <View key={index} style={styles.chip}>
                                        <Text style={styles.chipText}>{item}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                )}

                {/* Eligibility Criteria */}
                {data.eligibility && data.eligibility.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Feather name="check-circle" size={18} color={COLORS.primaryBlue} />
                            <Text style={styles.sectionTitle}>Eligibility Criteria</Text>
                        </View>
                        <View style={styles.card}>
                            {data.eligibility.map((item, index) => (
                                <View key={index} style={styles.requirementItem}>
                                    <View style={styles.bulletPoint} />
                                    <Text style={styles.requirementText}>{item}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* How to Apply */}
                {data.howToApply && data.howToApply !== "" && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Feather name="send" size={18} color={COLORS.primaryBlue} />
                            <Text style={styles.sectionTitle}>How to Apply</Text>
                        </View>
                        <View style={styles.card}>
                            <Text style={styles.cardText}>{data.howToApply}</Text>
                        </View>
                    </View>
                )}

                {/* Provider Section */}
                {data.provider && data.provider !== "" && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <MaterialIcons name="business" size={18} color={COLORS.primaryBlue} />
                            <Text style={styles.sectionTitle}>Provided By</Text>
                        </View>
                        <View style={styles.providerCard}>
                            <View style={styles.providerIconContainer}>
                                <Text style={styles.providerInitial}>
                                    {data.provider.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <View style={styles.providerInfo}>
                                <Text style={styles.providerName}>{data.provider}</Text>
                                <Text style={styles.providerNote}>Scholarship Provider</Text>
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Footer note */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
                <View style={styles.infoFooter}>
                    <Feather name="info" size={14} color={COLORS.textLight} />
                    <Text style={styles.footerText}>
                        Contact the provider for application details
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
    // Header Styles
    header: {
        height: 180,
        backgroundColor: COLORS.primaryBlue,
        paddingHorizontal: 20,
       
    },
    backBtn: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 10,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 20,
    },
    scholarshipTitle: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: 32,
        marginBottom: 16,
        paddingHorizontal: 40,
    },
    scholarshipMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        color: 'rgba(255,255,255,0.95)',
        fontSize: 13,
        fontWeight: '500',
    },
    metaDivider: {
        width: 1,
        height: 14,
        backgroundColor: 'rgba(255,255,255,0.3)',
        marginHorizontal: 12,
    },
    // Error Styles
    errorHeader: {
        paddingHorizontal: 20,
        paddingBottom: 10,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    errorCard: {
        backgroundColor: COLORS.white,
        padding: 32,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        width: '100%',
    },
    errorIconContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 8,
    },
    errorText: {
        fontSize: 15,
        color: COLORS.textSecondary,
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 22,
    },
    retryButton: {
        backgroundColor: COLORS.primaryBlue,
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: '600',
    },
    // Content Styles
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 20,
    },
    section: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginLeft: 8,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardText: {
        fontSize: 15,
        color: COLORS.textSecondary,
        lineHeight: 22,
    },
    // Chip Styles
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(118, 159, 205, 0.2)',
    },
    chipText: {
        fontSize: 14,
        color: COLORS.primaryBlue,
        fontWeight: '500',
    },
    // Requirement Styles
    requirementItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    bulletPoint: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: COLORS.primaryBlue,
        marginTop: 8,
        marginRight: 10,
    },
    requirementText: {
        flex: 1,
        fontSize: 15,
        color: COLORS.textSecondary,
        lineHeight: 22,
    },
    // Provider Styles
    providerCard: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
    },
    providerIconContainer: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    providerInitial: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.primaryBlue,
    },
    providerInfo: {
        flex: 1,
    },
    providerName: {
        fontSize: 17,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    providerNote: {
        fontSize: 13,
        color: COLORS.textLight,
    },
    // Footer
    bottomBar: {
        padding: 16,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    infoFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    footerText: {
        fontSize: 13,
        color: COLORS.textLight,
        fontWeight: '500',
    },
});