import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
    Dimensions, ScrollView, RefreshControl, Linking, Animated
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../../../context/AuthContext';
import { Config } from '../../../../config';

const { width, height } = Dimensions.get('window');

// Professional Color Palette
const COLORS = {
    primary: '#769FCD',        // Deep professional blue
    secondary: '#475569',      // Slate gray
    success: '#059669',        // Professional green
    warning: '#D97706',        // Amber
    error: '#DC2626',          // Red
    background: '#F8FAFC',     // Light gray background
    surface: '#FFFFFF',        // White surface
    border: '#E2E8F0',         // Light border
    textPrimary: '#0F172A',    // Almost black
    textSecondary: '#64748B',  // Medium gray
    accent: '#3B82F6',         // Bright blue accent
    progressBg: '#E0E7FF',     // Light blue for progress
    approved: '#ECFDF5',       // Success background
    pending: '#FEF3C7',        // Warning background
};

export default function ProfessionalDocumentUpload({ stage, onStageChange }) {
    const insets = useSafeAreaInsets();
    const { userToken } = useAuth();
    const [documentSteps, setDocumentSteps] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(true);

    // Animation refs
    const progressAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const fetchData = useCallback(async () => {
        console.log(`--- 🛰️ API CALL: Fetching for Stage [${stage.toUpperCase()}] ---`);
        setRefreshing(true);
        try {
            const res = await fetch(`${Config.API_BASE_URL}/students/documents/status?stage=${stage}`, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });
            const json = await res.json();

            console.log(`📥 [${stage}] Raw Data:`, JSON.stringify(json.data, null, 2));

            if (res.ok && json.data) {
                const formatted = json.data.map(item => ({
                    id: item._id,
                    label: item.requiredDocument?.name || 'Document',
                    sub: item.requiredDocument?.description || 'File required',
                    status: item.status || 'pending',
                    fileUrl: item.fileURL,
                    type: item.requiredDocument?.name
                }));
                setDocumentSteps(formatted);
            }
        } catch (e) {
            console.error(`❌ Fetch Error at ${stage}:`, e.message);
        } finally {
            setRefreshing(false);
        }
    }, [userToken, stage]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Animations
    useEffect(() => {
        if (documentSteps.length > 0) {
            const approvedCount = documentSteps.filter(doc => doc.status === 'approved').length;
            const progress = approvedCount / documentSteps.length;

            Animated.timing(progressAnim, {
                toValue: progress,
                duration: 800,
                useNativeDriver: false
            }).start();
        }

        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true
        }).start();
    }, [documentSteps]);

    const allApproved = documentSteps.length > 0 && documentSteps.every(doc => doc.status === 'approved');
    const isEmpty = documentSteps.length === 0;

    const handleUpload = async (asset, docItem) => {
        setLoading(true);
        try {
            const mimeType = asset.mimeType || 'application/pdf';
            const sasRes = await fetch(`${Config.API_BASE_URL}/students/uploads/sas`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ mimeType, size: asset.size, documentType: docItem.type, stage })
            });
            const sasJson = await sasRes.json();
            const blobRes = await fetch(asset.uri);
            const blob = await blobRes.blob();
            await fetch(sasJson.sasUrl, {
                method: 'PUT',
                body: blob,
                headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': mimeType }
            });
            await fetch(`${Config.API_BASE_URL}/students/uploads/confirm`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ blobName: sasJson.blobName, documentType: docItem.type, stage })
            });
            Toast.show({ type: 'success', text1: 'Document uploaded successfully' });
            fetchData();
        } catch (err) {
            Toast.show({ type: 'error', text1: 'Upload failed' });
        } finally {
            setLoading(false);
        }
    };

    // ===============================
    // ADMISSION STAGE - DOCUMENT UPLOAD & VERIFICATION
    // ===============================
    const renderAdmissionStage = () => {
        const approvedCount = documentSteps.filter(d => d.status === 'approved').length;
        const totalCount = documentSteps.length;
        const progressPercent = Math.round((approvedCount / totalCount) * 100);

        return (
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.contentContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={fetchData} tintColor={COLORS.primary} />
                }
            >
                <Animated.View style={{ opacity: fadeAnim }}>
                    {/* Professional Progress Header */}
                    <View style={styles.progressCard}>
                        <View style={styles.progressHeader}>
                            <View style={styles.progressIconContainer}>
                                <View style={styles.progressCircle}>
                                    <Animated.View
                                        style={[
                                            styles.progressCircleFill,
                                            {
                                                width: progressAnim.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: ['0%', '100%']
                                                }),
                                            }
                                        ]}
                                    />
                                    <View style={styles.progressCircleContent}>
                                        <MaterialCommunityIcons
                                            name="file-check-outline"
                                            size={24}
                                            color={COLORS.primary}
                                        />
                                        <Text style={styles.progressPercentage}>{progressPercent}%</Text>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.progressInfo}>
                                <Text style={styles.progressTitle}>Document Verification Progress</Text>
                                <Text style={styles.progressSubtitle}>
                                    {approvedCount} of {totalCount} documents verified
                                </Text>
                                <View style={styles.progressBarWrapper}>
                                    <View style={styles.progressBar}>
                                        <Animated.View
                                            style={[
                                                styles.progressBarFill,
                                                {
                                                    width: progressAnim.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: ['0%', '100%']
                                                    })
                                                }
                                            ]}
                                        />
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Milestone Indicators */}
                        <View style={styles.milestoneContainer}>
                            {[25, 50, 75, 100].map((milestone) => {
                                const achieved = progressPercent >= milestone;
                                return (
                                    <View key={milestone} style={styles.milestone}>
                                        <View style={[
                                            styles.milestoneIcon,
                                            achieved && styles.milestoneIconAchieved
                                        ]}>
                                            {achieved ? (
                                                <Ionicons name="checkmark" size={12} color={COLORS.surface} />
                                            ) : (
                                                <View style={styles.milestoneDot} />
                                            )}
                                        </View>
                                        <Text style={[
                                            styles.milestoneLabel,
                                            achieved && styles.milestoneLabelAchieved
                                        ]}>
                                            {milestone}%
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    {/* Document List */}
                    <View style={styles.documentList}>
                        <Text style={styles.sectionTitle}>Required Documents</Text>

                        {documentSteps.map((doc, index) => {
                            const isApproved = doc.status === 'approved';
                            const isPending = doc.status === 'pending';
                            const isReview = !isApproved && !isPending;

                            return (
                                <TouchableOpacity
                                    key={doc.id}
                                    style={[
                                        styles.documentCard,
                                        isApproved && styles.documentCardApproved
                                    ]}
                                    onPress={() => {
                                        if (doc.fileUrl) {
                                            Linking.openURL(doc.fileUrl);
                                        } else {
                                            DocumentPicker.getDocumentAsync({ type: 'application/pdf' })
                                                .then(r => !r.canceled && handleUpload(r.assets[0], doc));
                                        }
                                    }}
                                    activeOpacity={0.7}
                                >
                                    {/* Document Number Badge */}
                                    <View style={styles.documentBadge}>
                                        <Text style={styles.documentBadgeText}>{index + 1}</Text>
                                    </View>

                                    <View style={styles.documentContent}>
                                        <View style={styles.documentHeader}>
                                            <View style={styles.documentTitleRow}>
                                                <MaterialCommunityIcons
                                                    name="file-document-outline"
                                                    size={24}
                                                    color={isApproved ? COLORS.success : COLORS.primary}
                                                />
                                                <View style={styles.documentTitleContainer}>
                                                    <Text style={styles.documentTitle}>{doc.label}</Text>
                                                    <Text style={styles.documentDescription}>{doc.sub}</Text>
                                                </View>
                                            </View>

                                            {/* Status Badge */}
                                            <View style={[
                                                styles.statusBadge,
                                                isApproved && styles.statusBadgeApproved,
                                                isReview && styles.statusBadgeReview
                                            ]}>
                                                <Ionicons
                                                    name={isApproved ? "checkmark-circle" : isPending ? "cloud-upload-outline" : "time-outline"}
                                                    size={16}
                                                    color={isApproved ? COLORS.success : isPending ? COLORS.primary : COLORS.warning}
                                                />
                                                <Text style={[
                                                    styles.statusText,
                                                    isApproved && styles.statusTextApproved,
                                                    isReview && styles.statusTextReview
                                                ]}>
                                                    {isApproved ? 'Verified' : isPending ? 'Required' : 'In Review'}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Action Area */}
                                        {loading && currentIndex === index ? (
                                            <View style={styles.loadingState}>
                                                <ActivityIndicator size="small" color={COLORS.primary} />
                                                <Text style={styles.loadingText}>Processing upload...</Text>
                                            </View>
                                        ) : doc.fileUrl ? (
                                            <View style={styles.documentAction}>
                                                <View style={styles.fileInfo}>
                                                    <MaterialCommunityIcons
                                                        name="file-pdf-box"
                                                        size={20}
                                                        color={isApproved ? COLORS.success : COLORS.accent}
                                                    />
                                                    <Text style={styles.fileInfoText}>
                                                        {isApproved ? 'Document verified and approved' : 'Document uploaded, awaiting review'}
                                                    </Text>
                                                </View>
                                                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                                            </View>
                                        ) : (
                                            <View style={styles.uploadPrompt}>
                                                <MaterialCommunityIcons
                                                    name="cloud-upload-outline"
                                                    size={20}
                                                    color={COLORS.primary}
                                                />
                                                <Text style={styles.uploadPromptText}>Tap to upload PDF document</Text>
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Animated.View>
            </ScrollView>
        );
    };

    // ===============================
    // COE STAGE -  WAITING STATE
    // ===============================
    const renderCOEStage = () => {
        return (
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.centerContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={fetchData} tintColor={COLORS.primary} />
                }
            >
                <View style={styles.coeCard}>
                    <View style={styles.coeIconContainer}>
                        <View style={styles.coeIconCircle}>
                            <MaterialCommunityIcons name="email-check-outline" size={64} color={COLORS.primary} />
                        </View>
                    </View>

                    <Text style={styles.coeTitle}>Awaiting COE Confirmation</Text>
                    <Text style={styles.coeDescription}>
                        We are currently waiting for your Confirmation of Enrollment (COE) letter from the university.
                        This process typically takes 3-5 business days.
                    </Text>

                    <View style={styles.coeInfoSection}>
                        <View style={styles.coeInfoItem}>
                            <View style={styles.coeInfoIconWrapper}>
                                <Ionicons name="time-outline" size={24} color={COLORS.warning} />
                            </View>
                            <View style={styles.coeInfoContent}>
                                <Text style={styles.coeInfoTitle}>Processing Time</Text>
                                <Text style={styles.coeInfoText}>3-5 business days on average</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.coeInfoItem}>
                            <View style={styles.coeInfoIconWrapper}>
                                <Ionicons name="notifications-outline" size={24} color={COLORS.primary} />
                            </View>
                            <View style={styles.coeInfoContent}>
                                <Text style={styles.coeInfoTitle}>Notification</Text>
                                <Text style={styles.coeInfoText}>You will be notified via email when ready</Text>
                            </View>
                        </View>
                    </View>

                    {/* Process Timeline */}
                    <View style={styles.timelineCard}>
                        <Text style={styles.timelineTitle}>Next Steps</Text>
                        {[
                            { step: 'University reviews your application', icon: 'school-outline' },
                            { step: 'COE letter is generated and issued', icon: 'document-text-outline' },
                            { step: 'Proceed to visa application stage', icon: 'airplane-outline' }
                        ].map((item, index) => (
                            <View key={index} style={styles.timelineItem}>
                                <View style={styles.timelineIndicator}>
                                    <View style={styles.timelineNumber}>
                                        <Text style={styles.timelineNumberText}>{index + 1}</Text>
                                    </View>
                                    {index < 2 && <View style={styles.timelineLine} />}
                                </View>
                                <View style={styles.timelineContent}>
                                    <Ionicons name={item.icon} size={20} color={COLORS.textSecondary} />
                                    <Text style={styles.timelineText}>{item.step}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        );
    };

    // ===============================
    // VISA STAGE - CARD NAVIGATOR
    // ===============================
    const renderVisaStage = () => {
        if (isEmpty && !refreshing) {
            return (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.centerContainer}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={fetchData} tintColor={COLORS.primary} />
                    }
                >
                    <View style={styles.emptyStateCard}>
                        <View style={styles.emptyIconContainer}>
                            <MaterialCommunityIcons name="passport" size={80} color={COLORS.primary} />
                        </View>
                        <Text style={styles.emptyTitle}>Visa Documents Pending</Text>
                        <Text style={styles.emptyDescription}>
                            Your visa documentation is being prepared. You will be notified once your visa officer
                            has been assigned and documents are ready for submission.
                        </Text>
                        <View style={styles.emptyBadge}>
                            <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                            <Text style={styles.emptyBadgeText}>Please check back later</Text>
                        </View>
                    </View>
                </ScrollView>
            );
        }

        const currentDoc = documentSteps[currentIndex];
        if (!currentDoc) return null;

        const isApproved = currentDoc.status === 'approved';
        const hasFile = !!currentDoc.fileUrl;
        const isPending = currentDoc.status === 'pending';
        const approvedCount = documentSteps.filter(d => d.status === 'approved').length;
        const totalCount = documentSteps.length;
        const progressPercent = Math.round((approvedCount / totalCount) * 100);

        return (
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.visaContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={fetchData} tintColor={COLORS.primary} />
                }
            >
                {/* Progress Indicator */}
                <View style={styles.visaProgressCard}>
                    <View style={styles.visaProgressHeader}>
                        <Text style={styles.visaProgressTitle}>Verification Progress</Text>
                        <Text style={styles.visaProgressValue}>{progressPercent}%</Text>
                    </View>
                    <View style={styles.visaProgressBarContainer}>
                        <Animated.View
                            style={[
                                styles.visaProgressBarFill,
                                {
                                    width: progressAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0%', '100%']
                                    })
                                }
                            ]}
                        />
                    </View>
                    <Text style={styles.visaProgressText}>
                        {approvedCount} of {totalCount} documents verified
                    </Text>
                </View>

                {/* Main Document Card */}
                <Animated.View style={[styles.visaDocumentCard, { opacity: fadeAnim }]}>
                    <View style={styles.visaCardHeader}>
                        <View style={styles.visaCardIndex}>
                            <Text style={styles.visaCardIndexText}>
                                Document {currentIndex + 1} of {documentSteps.length}
                            </Text>
                        </View>
                        {isApproved && (
                            <View style={styles.verifiedBadge}>
                                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                                <Text style={styles.verifiedText}>Verified</Text>
                            </View>
                        )}
                    </View>

                    <Text style={styles.visaDocTitle}>{currentDoc.label}</Text>
                    <Text style={styles.visaDocDescription}>{currentDoc.sub}</Text>

                    {/* Status Section */}
                    <View style={[
                        styles.visaStatusSection,
                        isApproved && styles.visaStatusSectionApproved,
                        !isPending && !isApproved && styles.visaStatusSectionReview
                    ]}>
                        <MaterialCommunityIcons
                            name={isApproved ? "shield-check" : isPending ? "cloud-upload-outline" : "clock-outline"}
                            size={48}
                            color={isApproved ? COLORS.success : isPending ? COLORS.primary : COLORS.warning}
                        />
                        <Text style={styles.visaStatusTitle}>
                            {isApproved ? 'Document Verified' : isPending ? 'Upload Required' : 'Under Review'}
                        </Text>
                        <Text style={styles.visaStatusDescription}>
                            {isApproved
                                ? 'This document has been verified and approved'
                                : isPending
                                    ? 'Please upload your document for verification'
                                    : 'Your document is being reviewed by our team'}
                        </Text>
                    </View>

                    {/* Action Button */}
                    <TouchableOpacity
                        style={[
                            styles.visaActionButton,
                            isApproved && styles.visaActionButtonApproved
                        ]}
                        onPress={() => {
                            if (hasFile) {
                                Linking.openURL(currentDoc.fileUrl);
                            } else {
                                DocumentPicker.getDocumentAsync({ type: 'application/pdf' })
                                    .then(r => !r.canceled && handleUpload(r.assets[0], currentDoc));
                            }
                        }}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color={COLORS.surface} />
                        ) : (
                            <>
                                <MaterialCommunityIcons
                                    name={hasFile ? "file-eye" : "cloud-upload"}
                                    size={20}
                                    color={COLORS.surface}
                                />
                                <Text style={styles.visaActionText}>
                                    {hasFile ? 'View Document' : 'Upload Document'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </Animated.View>

                {/* Navigation */}
                <View style={styles.visaNavigation}>
                    <TouchableOpacity
                        style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
                        onPress={() => currentIndex > 0 && setCurrentIndex(currentIndex - 1)}
                        disabled={currentIndex === 0}
                    >
                        <Ionicons
                            name="chevron-back"
                            size={24}
                            color={currentIndex === 0 ? COLORS.border : COLORS.primary}
                        />
                        <Text style={[
                            styles.navButtonText,
                            currentIndex === 0 && styles.navButtonTextDisabled
                        ]}>
                            Previous
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.paginationDots}>
                        {documentSteps.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.paginationDot,
                                    index === currentIndex && styles.paginationDotActive,
                                    documentSteps[index].status === 'approved' && styles.paginationDotApproved
                                ]}
                            />
                        ))}
                    </View>

                    <TouchableOpacity
                        style={[styles.navButton, currentIndex === documentSteps.length - 1 && styles.navButtonDisabled]}
                        onPress={() => currentIndex < documentSteps.length - 1 && setCurrentIndex(currentIndex + 1)}
                        disabled={currentIndex === documentSteps.length - 1}
                    >
                        <Text style={[
                            styles.navButtonText,
                            currentIndex === documentSteps.length - 1 && styles.navButtonTextDisabled
                        ]}>
                            Next
                        </Text>
                        <Ionicons
                            name="chevron-forward"
                            size={24}
                            color={currentIndex === documentSteps.length - 1 ? COLORS.border : COLORS.primary}
                        />
                    </TouchableOpacity>
                </View>
            </ScrollView>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <View style={[
                        styles.headerIcon,
                        stage === 'admission' && { backgroundColor: COLORS.primary },
                        stage === 'coe' && { backgroundColor: COLORS.warning },
                        stage === 'visa' && { backgroundColor: COLORS.success }
                    ]}>
                        <MaterialCommunityIcons
                            name={stage === 'admission' ? 'school' : stage === 'coe' ? 'email-check' : 'passport'}
                            size={24}
                            color={COLORS.surface}
                        />
                    </View>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>{stage.charAt(0).toUpperCase() + stage.slice(1)} Stage</Text>
                        <Text style={styles.headerSubtitle}>
                            {stage === 'admission' && 'Document submission and verification'}
                            {stage === 'coe' && 'Awaiting enrollment confirmation'}
                            {stage === 'visa' && 'Visa application documents'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Content */}
            {stage === 'admission' && !isEmpty && !refreshing && renderAdmissionStage()}
            {stage === 'coe' && renderCOEStage()}
            {stage === 'visa' && renderVisaStage()}

            {/* Empty state for admission */}
            {stage === 'admission' && isEmpty && !refreshing && (
                <View style={styles.centerContainer}>
                    <View style={styles.emptyStateCard}>
                        <MaterialCommunityIcons name="file-document-outline" size={80} color={COLORS.textSecondary} />
                        <Text style={styles.emptyTitle}>No Documents Assigned</Text>
                        <Text style={styles.emptyDescription}>
                            No admission documents have been assigned to your account yet.
                        </Text>
                    </View>
                </View>
            )}

            {/* Continue Button */}
            {(allApproved || stage === 'coe' || (stage === 'visa' && isEmpty)) && (
                <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16 }]}>
                    <TouchableOpacity
                        style={styles.continueButton}
                        onPress={() => onStageChange(stage === 'admission' ? 'coe' : 'visa')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.continueButtonText}>
                            {stage === 'admission' ? 'Proceed to COE Stage' : 'Proceed to Visa Stage'}
                        </Text>
                        <Ionicons name="arrow-forward" size={20} color={COLORS.surface} />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
    },
    centerContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },

    // ========== HEADER ==========
    header: {
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerTextContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    headerSubtitle: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },

    // ========== ADMISSION STAGE ==========
    progressCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    progressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    progressIconContainer: {
        width: 80,
        height: 80,
        marginRight: 16,
        position: 'relative',
    },
    progressCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.progressBg,
        overflow: 'hidden',
        position: 'relative',
    },
    progressCircleFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: COLORS.success,
        opacity: 0.3,
    },
    progressCircleContent: {
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressPercentage: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.primary,
    },
    progressInfo: {
        flex: 1,
    },
    progressTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    progressSubtitle: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginBottom: 10,
    },
    progressBarWrapper: {
        width: '100%',
    },
    progressBar: {
        height: 6,
        backgroundColor: COLORS.progressBg,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: COLORS.success,
        borderRadius: 3,
    },
    milestoneContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    milestone: {
        alignItems: 'center',
    },
    milestoneIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    milestoneIconAchieved: {
        backgroundColor: COLORS.success,
    },
    milestoneDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.textSecondary,
    },
    milestoneLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    milestoneLabelAchieved: {
        color: COLORS.success,
    },

    // Document List
    documentList: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    documentCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
        flexDirection: 'row',
    },
    documentCardApproved: {
        backgroundColor: COLORS.approved,
        borderColor: COLORS.success,
    },
    documentBadge: {
        width: 40,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    documentBadgeText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.surface,
    },
    documentContent: {
        flex: 1,
        padding: 16,
    },
    documentHeader: {
        marginBottom: 12,
    },
    documentTitleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    documentTitleContainer: {
        flex: 1,
        marginLeft: 12,
    },
    documentTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    documentDescription: {
        fontSize: 13,
        color: COLORS.textSecondary,
        lineHeight: 18,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: COLORS.progressBg,
        alignSelf: 'flex-start',
        marginTop: 8,
    },
    statusBadgeApproved: {
        backgroundColor: COLORS.approved,
    },
    statusBadgeReview: {
        backgroundColor: COLORS.pending,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.primary,
        marginLeft: 4,
    },
    statusTextApproved: {
        color: COLORS.success,
    },
    statusTextReview: {
        color: COLORS.warning,
    },
    loadingState: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    loadingText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginLeft: 10,
    },
    documentAction: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    fileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    fileInfoText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginLeft: 8,
        flex: 1,
    },
    uploadPrompt: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    uploadPromptText: {
        fontSize: 13,
        color: COLORS.primary,
        fontWeight: '500',
        marginLeft: 8,
    },

    // ========== COE STAGE ==========
    coeCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 32,
        maxWidth: 480,
        width: '100%',
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    coeIconContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    coeIconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: COLORS.progressBg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    coeTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: 12,
    },
    coeDescription: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    coeInfoSection: {
        marginBottom: 24,
    },
    coeInfoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    coeInfoIconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    coeInfoContent: {
        flex: 1,
    },
    coeInfoTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    coeInfoText: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 8,
    },
    timelineCard: {
        backgroundColor: COLORS.background,
        borderRadius: 12,
        padding: 16,
    },
    timelineTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 16,
    },
    timelineItem: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    timelineIndicator: {
        alignItems: 'center',
        marginRight: 16,
    },
    timelineNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    timelineNumberText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.surface,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: COLORS.border,
        marginTop: 4,
    },
    timelineContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingTop: 4,
    },
    timelineText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginLeft: 10,
        flex: 1,
        lineHeight: 20,
    },

    // ========== VISA STAGE ==========
    visaContainer: {
        flexGrow: 1,
        padding: 20,
        justifyContent: 'center',
    },
    visaProgressCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    visaProgressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    visaProgressTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    visaProgressValue: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.success,
    },
    visaProgressBarContainer: {
        height: 8,
        backgroundColor: COLORS.progressBg,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    visaProgressBarFill: {
        height: '100%',
        backgroundColor: COLORS.success,
        borderRadius: 4,
    },
    visaProgressText: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    visaDocumentCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 24,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    visaCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    visaCardIndex: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: COLORS.background,
        borderRadius: 6,
    },
    visaCardIndexText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: COLORS.approved,
        borderRadius: 6,
    },
    verifiedText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.success,
        marginLeft: 4,
    },
    visaDocTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 8,
    },
    visaDocDescription: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 20,
        marginBottom: 20,
    },
    visaStatusSection: {
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 20,
        backgroundColor: COLORS.background,
        borderRadius: 12,
        marginBottom: 20,
    },
    visaStatusSectionApproved: {
        backgroundColor: COLORS.approved,
    },
    visaStatusSectionReview: {
        backgroundColor: COLORS.pending,
    },
    visaStatusTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginTop: 12,
        marginBottom: 6,
    },
    visaStatusDescription: {
        fontSize: 13,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    visaActionButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        borderRadius: 10,
    },
    visaActionButtonApproved: {
        backgroundColor: COLORS.success,
    },
    visaActionText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.surface,
        marginLeft: 8,
    },
    visaNavigation: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    navButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: COLORS.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    navButtonDisabled: {
        opacity: 0.4,
    },
    navButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
        marginHorizontal: 6,
    },
    navButtonTextDisabled: {
        color: COLORS.textSecondary,
    },
    paginationDots: {
        flexDirection: 'row',
        gap: 6,
    },
    paginationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.border,
    },
    paginationDotActive: {
        width: 24,
        backgroundColor: COLORS.primary,
    },
    paginationDotApproved: {
        backgroundColor: COLORS.success,
    },

    // ========== EMPTY STATES ==========
    emptyStateCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 40,
        alignItems: 'center',
        maxWidth: 400,
        width: '100%',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    emptyIconContainer: {
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyDescription: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
    },
    emptyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: COLORS.progressBg,
        borderRadius: 8,
    },
    emptyBadgeText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.primary,
        marginLeft: 6,
    },

    // ========== BOTTOM BUTTON ==========
    bottomContainer: {
        paddingHorizontal: 20,
        paddingTop: 12,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    continueButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 10,
    },
    continueButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.surface,
        marginRight: 8,
    },
});