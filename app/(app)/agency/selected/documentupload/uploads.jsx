import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
    ScrollView, RefreshControl, Linking, Alert
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../../../context/AuthContext';
import { Config } from '../../../../config';
import { useRouter } from 'expo-router';

// ========================================
// CONSISTENT COLOR PALETTE
// ========================================
const COLORS = {
    // Primary - Your brand blue (#769FCD)
    primary: '#769FCD',
    primaryLight: 'rgba(118, 159, 205, 0.1)',
    primaryExtraLight: 'rgba(118, 159, 205, 0.05)',
    
    // Neutrals - Warm Gray
    background: '#F8FAFD',
    surface: '#FFFFFF',
    border: '#EEF2F7',
    divider: '#F0F2F5',
    
    // Text
    textPrimary: '#2D3748',
    textSecondary: '#718096',
    textTertiary: '#A0AEC0',
    white: '#FFFFFF',
    
    // Status - Using primary with opacity
    pending: {
        bg: 'rgba(118, 159, 205, 0.1)',
        text: '#769FCD',
    },
    under_review: {
        bg: 'rgba(118, 159, 205, 0.08)',
        text: '#5C7C9A',
    },
    reupload: {
        bg: 'rgba(246, 173, 85, 0.1)',
        text: '#B38F5C',
    },
    rejected: {
        bg: 'rgba(255, 107, 107, 0.1)',
        text: '#FF6B6B',
    },
    approved: {
        bg: 'rgba(72, 187, 120, 0.1)',
        text: '#48BB78',
    },
    
    // Accents
    success: '#48BB78',
    warning: '#F6AD55',
    error: '#FF6B6B',
    info: '#5C7C9A',
    
    // Progress
    progressTrack: '#EDF2F7',
    progressFill: '#769FCD',
};

// ========================================
// STATUS CONFIGURATION
// ========================================
const STATUS_CONFIG = {
    pending: {
        label: 'Pending',
        icon: 'cloud-upload-outline',
        bgColor: COLORS.pending.bg,
        textColor: COLORS.pending.text,
    },
    under_review: {
        label: 'Under Review',
        icon: 'time-outline',
        bgColor: COLORS.under_review.bg,
        textColor: COLORS.under_review.text,
    },
    reupload: {
        label: 'Reupload Required',
        icon: 'refresh-outline',
        bgColor: COLORS.reupload.bg,
        textColor: COLORS.reupload.text,
    },
    rejected: {
        label: 'Rejected',
        icon: 'close-circle-outline',
        bgColor: COLORS.rejected.bg,
        textColor: COLORS.rejected.text,
    },
    approved: {
        label: 'Approved',
        icon: 'checkmark-circle-outline',
        bgColor: COLORS.approved.bg,
        textColor: COLORS.approved.text,
    },
};

// ========================================
// DOCUMENT CATEGORY CONFIGURATION
// ========================================
const DOCUMENT_CATEGORIES = {
    COE: {
        key: 'COE',
        label: 'Confirmation of Enrollment',
        icon: 'school-outline',
        color: COLORS.primary,
    },
    offer_letter: {
        key: 'offer_letter',
        label: 'Offer Letter',
        icon: 'mail-outline',
        color: '#48BB78',
    },
    other: {
        key: 'other',
        label: 'Other Documents',
        icon: 'document-text-outline',
        color: '#F6AD55',
    },
};

export default function DocumentUpload({ stage, onStageChange, onRefresh }) {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { userToken } = useAuth();

    // State for admission/visa stage documents (checklist)
    const [documents, setDocuments] = useState([]);
    
    // State for document waitlist stage (COE, offer_letter, other)
    const [agencyDocuments, setAgencyDocuments] = useState({
        COE: [],
        offer_letter: [],
        other: [],
    });
    
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(true);
    const [uploadingDocId, setUploadingDocId] = useState(null);

    // Fetch documents based on stage
    const fetchDocuments = useCallback(async () => {
        console.log(`📡 Fetching documents for stage: ${stage}`);
        setRefreshing(true);

        try {
            if (stage === 'document_waitlist') {
                // DOCUMENT WAITLIST STAGE - fetch agency documents categorized by type
                const res = await fetch(
                    `${Config.API_BASE_URL}/students/documents`,
                    {
                        headers: { 'Authorization': `Bearer ${userToken}` }
                    }
                );

                const json = await res.json();
                
                if (res.ok && json.data && json.data.length > 0) {
                    // Filter for agency-uploaded documents only
                    const agencyUploads = json.data.filter(doc => {
                        const uploaderModel = doc.uploaderModel?.toLowerCase();
                        return uploaderModel === 'agent' || 
                               uploaderModel === 'agency' ||
                               uploaderModel === 'admin';
                    });

                    // Categorize documents by type
                    const categorized = {
                        COE: [],
                        offer_letter: [],
                        other: [],
                    };

                    agencyUploads.forEach(doc => {
                        const category = doc.documentCategory || doc.type;
                        const normalizedCategory = category?.toLowerCase();
                        
                        const formattedDoc = {
                            id: doc._id,
                            name: doc.requiredDocument?.name || doc.documentName || 'Document',
                            uploadedAt: doc.createdAt,
                            fileUrl: doc.fileURL,
                            category: category,
                        };

                        if (normalizedCategory === 'coe') {
                            categorized.COE.push(formattedDoc);
                        } else if (normalizedCategory === 'offer_letter' || normalizedCategory === 'offerletter') {
                            categorized.offer_letter.push(formattedDoc);
                        } else if (normalizedCategory === 'other') {
                            categorized.other.push(formattedDoc);
                        }
                    });

                    setAgencyDocuments(categorized);
                } else {
                    setAgencyDocuments({
                        COE: [],
                        offer_letter: [],
                        other: [],
                    });
                }
            } else if (stage === 'admission' || stage === 'visa') {
                // ADMISSION/VISA STAGE - document checklist
                const res = await fetch(
                    `${Config.API_BASE_URL}/students/documents/status?stage=${stage}`,
                    {
                        headers: { 'Authorization': `Bearer ${userToken}` }
                    }
                );

                const json = await res.json();

                if (res.ok && json.data) {
                    const formattedDocs = json.data.map(item => ({
                        checklistId: item._id,
                        requiredDocumentId: item.requiredDocument?._id || item.requiredDocumentId,
                        name: item.requiredDocument?.name || 'Document',
                        description: item.requiredDocument?.description || 'Required document',
                        type: item.requiredDocument?.type || item.requiredDocument?.name,
                        uploadedDocumentId: item.uploadedDocument?._id,
                        status: item.status || 'pending',
                        fileUrl: item.uploadedDocument?.fileURL || item.fileURL,
                        fileName: item.uploadedDocument?.fileName,
                        rejectionReason: item.rejectionReason,
                        uploadedAt: item.uploadedAt || item.createdAt,
                        id: item.uploadedDocument?._id || item.requiredDocument?._id || item._id
                    }));

                    setDocuments(formattedDocs);
                } else {
                    setDocuments([]);
                }
            }
        } catch (error) {
            console.error(`❌ Fetch error [${stage}]:`, error);
            Toast.show({
                type: 'error',
                text1: 'Failed to load documents',
                text2: error.message || 'Please try again'
            });
            
            if (stage === 'document_waitlist') {
                setAgencyDocuments({
                    COE: [],
                    offer_letter: [],
                    other: [],
                });
            } else {
                setDocuments([]);
            }
        } finally {
            setRefreshing(false);
        }
    }, [stage, userToken]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    // Handle document upload for admission/visa stages
    const handleUpload = async (document) => {
        try {
            setUploadingDocId(document.checklistId || document.id);

            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true
            });

            if (result.canceled) {
                setUploadingDocId(null);
                return;
            }

            const asset = result.assets[0];

            // Step 1: Get SAS URL
            const sasPayload = {
                mimeType: asset.mimeType || 'application/pdf',
                size: asset.size,
                documentType: document.type || document.name,
                stage: stage,
                requiredDocumentId: document.requiredDocumentId
            };

            const sasRes = await fetch(`${Config.API_BASE_URL}/students/uploads/sas`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(sasPayload)
            });

            if (!sasRes.ok) {
                const errorData = await sasRes.json();
                throw new Error(errorData.message || 'Failed to get upload URL');
            }

            const sasJson = await sasRes.json();

            // Step 2: Upload to blob storage
            const blobRes = await fetch(asset.uri);
            const blob = await blobRes.blob();

            const uploadRes = await fetch(sasJson.sasUrl, {
                method: 'PUT',
                body: blob,
                headers: {
                    'x-ms-blob-type': 'BlockBlob',
                    'Content-Type': asset.mimeType || 'application/pdf'
                }
            });

            if (!uploadRes.ok) {
                throw new Error('Failed to upload file to storage');
            }

            // Step 3: Confirm upload
            const confirmPayload = {
                blobName: sasJson.blobName,
                mimeType: asset.mimeType || 'application/pdf',
                size: asset.size,
                fileName: asset.name,
                documentType: document.type || document.name,
                requiredDocumentId: document.requiredDocumentId,
                checklistId: document.checklistId,
                stage: stage
            };

            const confirmRes = await fetch(`${Config.API_BASE_URL}/students/uploads/confirm`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(confirmPayload)
            });

            if (!confirmRes.ok) {
                const errorData = await confirmRes.json();
                throw new Error(errorData.message || 'Failed to confirm upload');
            }

            Toast.show({
                type: 'success',
                text1: 'Upload Successful',
                text2: 'Document uploaded and under review'
            });

            await fetchDocuments();

        } catch (error) {
            console.error('❌ Upload error:', error);
            Toast.show({
                type: 'error',
                text1: 'Upload Failed',
                text2: error.message || 'Please try again'
            });
        } finally {
            setUploadingDocId(null);
        }
    };

    // Handle refresh
    const handleRefresh = () => {
        fetchDocuments();
        if (onRefresh) onRefresh();
    };

    // Check if all documents are approved (for admission/visa stages)
    const allApproved = documents.length > 0 && documents.every(doc => doc.status === 'approved');
    const hasDocuments = documents.length > 0;

    // Check if document can be uploaded
    const canUploadDocument = (doc) => {
        return doc.status === 'pending' ||
            doc.status === 'reupload' ||
            doc.status === 'rejected' ||
            !doc.fileUrl;
    };

    // Get the correct ID for upload tracking
    const getUploadingId = (doc) => {
        return doc.checklistId || doc.id;
    };

    // Calculate total documents in waitlist
    const getTotalWaitlistDocuments = () => {
        return agencyDocuments.COE.length + 
               agencyDocuments.offer_letter.length + 
               agencyDocuments.other.length;
    };

    // ========================================
    // RENDER DOCUMENT CATEGORY SECTION - CLEAN & PROFESSIONAL
    // ========================================
    const renderDocumentCategory = (categoryKey) => {
        const categoryConfig = DOCUMENT_CATEGORIES[categoryKey];
        const documents = agencyDocuments[categoryKey];
        const hasDocuments = documents && documents.length > 0;

        return (
            <View style={styles.categorySection} key={categoryKey}>
                <View style={styles.categoryHeader}>
                    <View style={[styles.categoryIcon, { backgroundColor: `${categoryConfig.color}10` }]}>
                        <Ionicons name={categoryConfig.icon} size={18} color={categoryConfig.color} />
                    </View>
                    <View style={styles.categoryHeaderText}>
                        <Text style={styles.categoryTitle}>{categoryConfig.label}</Text>
                        <Text style={styles.categoryBadge}>
                            {documents.length} {documents.length === 1 ? 'document' : 'documents'}
                        </Text>
                    </View>
                </View>

                {hasDocuments ? (
                    <View style={styles.categoryDocuments}>
                        {documents.map((doc) => (
                            <TouchableOpacity
                                key={doc.id}
                                style={styles.categoryDocumentCard}
                                onPress={() => doc.fileUrl && Linking.openURL(doc.fileUrl)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.categoryDocIcon}>
                                    <MaterialCommunityIcons 
                                        name="file-pdf-box" 
                                        size={20} 
                                        color={categoryConfig.color} 
                                    />
                                </View>
                                <View style={styles.categoryDocContent}>
                                    <Text style={styles.categoryDocName} numberOfLines={1}>
                                        {doc.name}
                                    </Text>
                                    <Text style={styles.categoryDocMeta}>
                                        {new Date(doc.uploadedAt).toLocaleDateString('en-US', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric'
                                        })}
                                    </Text>
                                </View>
                                <Ionicons name="open-outline" size={18} color={COLORS.textTertiary} />
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : (
                    <View style={styles.categoryEmptyState}>
                        <Text style={styles.categoryEmptyText}>No documents yet</Text>
                    </View>
                )}
            </View>
        );
    };

    // ========================================
    // RENDER ADMISSION/VISA STAGE
    // ========================================
    const renderDocumentStage = () => {
        if (!hasDocuments && !refreshing) {
            return (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.centerContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={COLORS.primary}
                        />
                    }
                >
                    <View style={styles.emptyStateContainer}>
                        <View style={styles.emptyStateIcon}>
                            <Ionicons
                                name={stage === 'admission' ? 'school-outline' : 'passport-outline'}
                                size={40}
                                color={COLORS.primary}
                            />
                        </View>
                        <Text style={styles.emptyStateTitle}>
                            {stage === 'admission' ? 'No Documents Yet' : 'No Visa Documents Yet'}
                        </Text>
                        <Text style={styles.emptyStateDescription}>
                            {stage === 'admission'
                                ? 'Waiting for admission officer to assign document checklist'
                                : 'Waiting for visa officer to assign visa document checklist'
                            }
                        </Text>
                        <View style={styles.emptyBadge}>
                            <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                            <Text style={styles.emptyBadgeText}>Check back later</Text>
                        </View>
                    </View>
                </ScrollView>
            );
        }

        const approvedCount = documents.filter(d => d.status === 'approved').length;
        const progressPercent = hasDocuments ? Math.round((approvedCount / documents.length) * 100) : 0;

        return (
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={COLORS.primary}
                    />
                }
            >
                {/* Progress Card */}
                {hasDocuments && (
                    <View style={styles.progressCard}>
                        <View style={styles.progressHeader}>
                            <Text style={styles.progressLabel}>Document Progress</Text>
                            <Text style={styles.progressCount}>{approvedCount}/{documents.length}</Text>
                        </View>
                        <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                        </View>
                    </View>
                )}

                {/* Document List */}
                {hasDocuments && (
                    <View style={styles.checklistSection}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="document-text-outline" size={18} color={COLORS.textSecondary} />
                            <Text style={styles.sectionTitle}>Required Documents</Text>
                        </View>

                        {documents.map((doc, index) => {
                            const statusInfo = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
                            const isUploading = uploadingDocId === getUploadingId(doc);
                            const canUpload = canUploadDocument(doc);

                            return (
                                <TouchableOpacity
                                    key={doc.checklistId || doc.id}
                                    style={styles.documentCard}
                                    onPress={() => {
                                        if (doc.fileUrl && !canUpload) {
                                            Linking.openURL(doc.fileUrl);
                                        } else if (canUpload && !isUploading) {
                                            handleUpload(doc);
                                        }
                                    }}
                                    activeOpacity={0.7}
                                    disabled={isUploading}
                                >
                                    {/* Left Accent */}
                                    <View style={[styles.documentAccent, { backgroundColor: statusInfo.bgColor }]} />
                                    
                                    <View style={styles.documentContent}>
                                        {/* Header Row */}
                                        <View style={styles.documentHeader}>
                                            <View style={styles.documentTitleContainer}>
                                                <Text style={styles.documentName}>{doc.name}</Text>
                                                <Text style={styles.documentDescription} numberOfLines={1}>
                                                    {doc.description}
                                                </Text>
                                            </View>
                                            
                                            {/* Status Badge */}
                                            <View style={[
                                                styles.statusBadge,
                                                { backgroundColor: statusInfo.bgColor }
                                            ]}>
                                                <Ionicons
                                                    name={statusInfo.icon}
                                                    size={12}
                                                    color={statusInfo.textColor}
                                                />
                                                <Text style={[
                                                    styles.statusText,
                                                    { color: statusInfo.textColor }
                                                ]}>
                                                    {statusInfo.label}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* File Info */}
                                        {doc.fileName && !canUpload && (
                                            <View style={styles.fileInfo}>
                                                <MaterialCommunityIcons
                                                    name="file-pdf-box"
                                                    size={14}
                                                    color={COLORS.primary}
                                                />
                                                <Text style={styles.fileName} numberOfLines={1}>
                                                    {doc.fileName}
                                                </Text>
                                            </View>
                                        )}

                                        {/* Rejection Reason */}
                                        {(doc.status === 'rejected' || doc.status === 'reupload') && doc.rejectionReason && (
                                            <View style={styles.rejectionContainer}>
                                                <Ionicons name="information-circle-outline" size={14} color={COLORS.error} />
                                                <Text style={styles.rejectionText}>{doc.rejectionReason}</Text>
                                            </View>
                                        )}

                                        {/* Action */}
                                        <View style={styles.actionContainer}>
                                            {isUploading ? (
                                                <View style={styles.uploadingContainer}>
                                                    <ActivityIndicator size="small" color={COLORS.primary} />
                                                    <Text style={styles.uploadingText}>Uploading...</Text>
                                                </View>
                                            ) : doc.fileUrl && !canUpload ? (
                                                <View style={styles.viewContainer}>
                                                    <Text style={styles.viewText}>
                                                        {doc.status === 'approved' ? 'View document' : 'Under review'}
                                                    </Text>
                                                    <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                                                </View>
                                            ) : (
                                                <View style={styles.uploadContainer}>
                                                    <MaterialCommunityIcons
                                                        name="cloud-upload-outline"
                                                        size={16}
                                                        color={COLORS.primary}
                                                    />
                                                    <Text style={styles.uploadText}>Upload document</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {/* Continue Button */}
                {allApproved && (
                    <TouchableOpacity
                        style={styles.applyButton}
                        onPress={() => {
                            if (stage === 'admission') {
                                onStageChange('document_waitlist');
                            } else if (stage === 'visa') {
                                onStageChange('complete');
                                Toast.show({
                                    type: 'success',
                                    text1: 'Visa Stage Complete',
                                    text2: 'All visa documents approved!'
                                });
                            }
                        }}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.applyButtonText}>
                            {stage === 'admission' ? 'Proceed to Document Waitlist' : 'Complete Visa Stage'}
                        </Text>
                        <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
                    </TouchableOpacity>
                )}
            </ScrollView>
        );
    };

    // ========================================
    // RENDER DOCUMENT WAITLIST STAGE - REDESIGNED
    // ========================================
    const renderDocumentWaitlist = () => {
        const totalDocuments = getTotalWaitlistDocuments();

        return (
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={COLORS.primary}
                    />
                }
            >
                {/* Simple Header */}
                <View style={styles.waitlistHeader}>
                    <Text style={styles.waitlistTitle}>Documents from Your Agency</Text>
                    <Text style={styles.waitlistDescription}>
                        Your agency will upload required documents here. You can view them once available.
                    </Text>
                </View>

                {/* Document Categories */}
                {renderDocumentCategory('COE')}
                {renderDocumentCategory('offer_letter')}
                {renderDocumentCategory('other')}

                {/* Proceed Button */}
                <TouchableOpacity
                    style={styles.proceedButton}
                    onPress={() => onStageChange('visa')}
                    activeOpacity={0.8}
                >
                    <Text style={styles.proceedButtonText}>Continue to Visa Stage</Text>
                    <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                </TouchableOpacity>
            </ScrollView>
        );
    };

    // ========================================
    // MAIN RENDER
    // ========================================
    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Consistent Blue Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="chevron-back" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        {stage === 'admission' && 'Admission Documents'}
                        {stage === 'document_waitlist' && 'Document Waitlist'}
                        {stage === 'visa' && 'Visa Documents'}
                    </Text>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            {/* Content */}
            {stage === 'document_waitlist' ? renderDocumentWaitlist() : renderDocumentStage()}
        </View>
    );
}

// ========================================
// STYLES
// ========================================
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    // Header
    header: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 20,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
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
    },

    // Scroll
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    centerContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },

    // Section Header
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginLeft: 8,
    },

    // Progress Card
    progressCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    progressLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    progressCount: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.primary,
    },
    progressTrack: {
        height: 6,
        backgroundColor: COLORS.progressTrack,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.progressFill,
        borderRadius: 3,
    },

    // Checklist Section
    checklistSection: {
        marginBottom: 20,
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },

    // Document Card
    documentCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        flexDirection: 'row',
        overflow: 'hidden',
    },
    documentAccent: {
        width: 4,
        height: '100%',
    },
    documentContent: {
        flex: 1,
        padding: 14,
    },
    documentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    documentTitleContainer: {
        flex: 1,
        marginRight: 12,
    },
    documentName: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    documentDescription: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },

    // Status Badge
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
        marginLeft: 4,
    },

    // File Info
    fileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        paddingVertical: 6,
        paddingHorizontal: 10,
        backgroundColor: COLORS.primaryLight,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    fileName: {
        fontSize: 12,
        color: COLORS.primary,
        marginLeft: 6,
        flexShrink: 1,
    },

    // Rejection
    rejectionContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: COLORS.rejected.bg,
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
    },
    rejectionText: {
        flex: 1,
        fontSize: 12,
        color: COLORS.error,
        marginLeft: 8,
        lineHeight: 16,
    },

    // Actions
    actionContainer: {
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    uploadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    uploadingText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginLeft: 8,
    },
    viewContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    viewText: {
        fontSize: 13,
        color: COLORS.primary,
        fontWeight: '500',
    },
    uploadContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    uploadText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.primary,
        marginLeft: 6,
    },

    // Apply Button
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
        marginTop: 8,
    },
    applyButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: COLORS.white,
    },

    // Empty States
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyStateIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyStateDescription: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 16,
    },
    emptyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: COLORS.primaryLight,
        borderRadius: 20,
    },
    emptyBadgeText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
        marginLeft: 6,
    },

    // ========================================
    // DOCUMENT WAITLIST STYLES - CLEAN & MINIMAL
    // ========================================
    waitlistHeader: {
        marginBottom: 24,
        paddingHorizontal: 4,
    },
    waitlistTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 8,
    },
    waitlistDescription: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 20,
    },

    // Category Section - Clean
    categorySection: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    categoryIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    categoryHeaderText: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    categoryTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    categoryBadge: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },

    // Document Cards - Minimal
    categoryDocuments: {
        gap: 8,
    },
    categoryDocumentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: COLORS.background,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    categoryDocIcon: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    categoryDocContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    categoryDocName: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.textPrimary,
        flex: 1,
        marginRight: 12,
    },
    categoryDocMeta: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },

    // Empty State - Minimal
    categoryEmptyState: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    categoryEmptyText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },

    // Proceed Button
    proceedButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 14,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 8,
    },
    proceedButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.white,
    },
});