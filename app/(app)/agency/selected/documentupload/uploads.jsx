import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
    ScrollView, RefreshControl, Linking, Alert, Modal
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../../../context/AuthContext';
import { Config } from '../../../../config';
import { useRouter } from 'expo-router';

// ========================================
// ORIGINAL COLOR PALETTE - Only status colors made lighter
// ========================================
const COLORS = {
    primary: '#769FCD',
    primaryLight: 'rgba(118, 159, 205, 0.1)',
    primaryMedium: 'rgba(118, 159, 205, 0.2)',
    background: '#F8FAFD',
    surface: '#FFFFFF',
    border: '#EEF2F7',
    textPrimary: '#2D3748',
    textSecondary: '#718096',
    textTertiary: '#A0AEC0',
    white: '#FFFFFF',
    
    // Lighter status colors only
    success: '#9FC9AF', // Lighter version of #48BB78
    successLight: 'rgba(159, 201, 175, 0.1)',
    warning: '#FAD3A8', // Lighter version of #F6AD55
    warningLight: 'rgba(250, 211, 168, 0.1)',
    error: '#FFB5B5', // Lighter version of #FF6B6B
    errorLight: 'rgba(255, 181, 181, 0.1)',
    info: '#769FCD',
    infoLight: 'rgba(118, 159, 205, 0.1)',
    purple: '#9F7AEA',
    purpleLight: 'rgba(159, 122, 234, 0.1)',
};

// ========================================
// STATUS CONFIGURATION
// ========================================
const STATUS_CONFIG = {
    pending: {
        label: 'Not Uploaded',
        bgColor: COLORS.infoLight,
        textColor: COLORS.info,
        borderColor: COLORS.info,
        iconName: 'cloud-outline',
        showActions: { upload: true, view: false, reupload: false }
    },
    under_review: {
        label: 'Under Review',
        bgColor: COLORS.purpleLight,
        textColor: COLORS.purple,
        borderColor: COLORS.purple,
        iconName: 'time-outline',
        showActions: { upload: false, view: true, reupload: false }
    },
    reupload: {
        label: 'Reupload Required',
        bgColor: COLORS.warningLight,
        textColor: COLORS.warning,
        borderColor: COLORS.warning,
        iconName: 'refresh-outline',
        showActions: { upload: false, view: true, reupload: true }
    },
    rejected: {
        label: 'Rejected',
        bgColor: COLORS.errorLight,
        textColor: COLORS.error,
        borderColor: COLORS.error,
        iconName: 'close-circle-outline',
        showActions: { upload: false, view: true, reupload: true }
    },
    approved: {
        label: 'Approved',
        bgColor: COLORS.successLight,
        textColor: COLORS.success,
        borderColor: COLORS.success,
        iconName: 'checkmark-circle-outline',
        showActions: { upload: false, view: true, reupload: false }
    },
};

// ========================================
// STAGE CONFIGURATION
// ========================================
const STAGES = [
    { key: 'admission', label: 'Admission', icon: 'school-outline' },
    { key: 'document_waitlist', label: 'Waitlist', icon: 'people-outline' },
    { key: 'visa', label: 'Visa', icon: 'document-text-outline' },
];

export default function DocumentUpload({ stage, onStageChange, onRefresh }) {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { userToken } = useAuth();

    const [checklistDocuments, setChecklistDocuments] = useState([]);
    const [agencyDocuments, setAgencyDocuments] = useState({
        COE: [],
        offer_letter: [],
        other: [],
    });
    
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [uploadingDocId, setUploadingDocId] = useState(null);
    const [showStageModal, setShowStageModal] = useState(false);
    const [allStagesStatus, setAllStagesStatus] = useState({
        admission: { total: 0, approved: 0, uploaded: 0 },
        document_waitlist: { total: 0, uploaded: 0 },
        visa: { total: 0, approved: 0, uploaded: 0 }
    });

    // Format date safely
    const formatDate = (dateString) => {
        if (!dateString) return 'Date not available';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Date not available';
            return date.toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        } catch (error) {
            return 'Date not available';
        }
    };

    // Fetch all stages status for overview
    const fetchAllStagesStatus = useCallback(async () => {
        try {
            // Fetch admission stage status
            const admissionRes = await fetch(
                `${Config.API_BASE_URL}/students/documents/status?stage=admission`,
                { headers: { 'Authorization': `Bearer ${userToken}` } }
            );
            const admissionData = await admissionRes.json();
            
            // Fetch visa stage status
            const visaRes = await fetch(
                `${Config.API_BASE_URL}/students/documents/status?stage=visa`,
                { headers: { 'Authorization': `Bearer ${userToken}` } }
            );
            const visaData = await visaRes.json();
            
            // Fetch agency documents
            const agencyRes = await fetch(
                `${Config.API_BASE_URL}/students/documents`,
                { headers: { 'Authorization': `Bearer ${userToken}` } }
            );
            const agencyData = await agencyRes.json();

            const agencyUploads = agencyData.data?.filter(doc => {
                const uploaderModel = doc.uploaderModel?.toLowerCase();
                return uploaderModel === 'agent' || uploaderModel === 'agency';
            }) || [];

            setAllStagesStatus({
                admission: {
                    total: admissionData.data?.length || 0,
                    approved: admissionData.data?.filter(d => d.status === 'approved').length || 0,
                    uploaded: admissionData.data?.filter(d => d.status !== 'pending').length || 0,
                },
                document_waitlist: {
                    total: agencyUploads.length,
                    uploaded: agencyUploads.length,
                },
                visa: {
                    total: visaData.data?.length || 0,
                    approved: visaData.data?.filter(d => d.status === 'approved').length || 0,
                    uploaded: visaData.data?.filter(d => d.status !== 'pending').length || 0,
                }
            });
        } catch (error) {
            console.error('Error fetching all stages status:', error);
        }
    }, [userToken]);

    // Fetch documents based on stage
    const fetchDocuments = useCallback(async (isPullRefresh = false) => {
        if (!stage) return;
        
        console.log(`📡 Fetching documents for stage: ${stage}`);
        
        if (isPullRefresh) {
            setRefreshing(true);
        }

        try {
            if (stage === 'document_waitlist') {
                const res = await fetch(
                    `${Config.API_BASE_URL}/students/documents`,
                    {
                        headers: { 'Authorization': `Bearer ${userToken}` }
                    }
                );

                const json = await res.json();
                
                if (res.ok && json.data) {
                    const agencyUploads = json.data.filter(doc => {
                        const uploaderModel = doc.uploaderModel?.toLowerCase();
                        return uploaderModel === 'agent' || uploaderModel === 'agency';
                    });

                    const categorized = {
                        COE: agencyUploads.filter(doc => doc.documentCategory === 'COE'),
                        offer_letter: agencyUploads.filter(doc => doc.documentCategory === 'offer_letter'),
                        other: agencyUploads.filter(doc => !doc.documentCategory || doc.documentCategory === 'other'),
                    };

                    setAgencyDocuments(categorized);
                }
            } else {
                const res = await fetch(
                    `${Config.API_BASE_URL}/students/documents/status?stage=${stage}`,
                    {
                        headers: { 'Authorization': `Bearer ${userToken}` }
                    }
                );

                const json = await res.json();

                if (res.ok && json.data) {
                    const formattedDocs = json.data.map(item => ({
                        id: item._id,
                        requiredDocumentId: item.requiredDocument?._id,
                        name: item.requiredDocument?.name || 'Document',
                        description: item.requiredDocument?.description || '',
                        status: item.status || 'pending',
                        rejectionReason: item.rejectionReason,
                        document: item.document ? {
                            id: item.document._id,
                            fileName: item.document.fileName,
                            fileURL: item.document.fileURL,
                            uploadedAt: item.document.createdAt || item.uploadedAt,
                        } : null,
                    }));

                    setChecklistDocuments(formattedDocs);
                }
            }
            
            // Also fetch all stages status for the overview modal
            await fetchAllStagesStatus();
            
        } catch (error) {
            console.error(`❌ Fetch error [${stage}]:`, error);
            Toast.show({
                type: 'error',
                text1: 'Failed to load documents',
                text2: error.message || 'Please try again'
            });
            
            if (stage === 'document_waitlist') {
                setAgencyDocuments({ COE: [], offer_letter: [], other: [] });
            } else {
                setChecklistDocuments([]);
            }
        } finally {
            setRefreshing(false);
            setIsInitialLoad(false);
        }
    }, [stage, userToken, fetchAllStagesStatus]);

    useEffect(() => {
        if (stage) {
            setIsInitialLoad(true);
            fetchDocuments(false);
        }
    }, [stage]);

    const handleUpload = async (document) => {
        try {
            setUploadingDocId(document.id);

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
                documentType: document.name,
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
                documentType: document.name,
                requiredDocumentId: document.requiredDocumentId,
                checklistId: document.id,
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
                text2: 'Your document has been uploaded and is under review'
            });

            await fetchDocuments(false);

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

    const handleRefresh = useCallback(() => {
        console.log(`🔄 Refreshing current stage: ${stage}`);
        fetchDocuments(true);
        if (onRefresh) onRefresh();
    }, [stage, fetchDocuments, onRefresh]);

    const handleViewDocument = (fileUrl) => {
        Linking.openURL(fileUrl).catch(() => {
            Toast.show({
                type: 'error',
                text1: 'Cannot Open Document',
                text2: 'Please try again later'
            });
        });
    };

    const getStageTitle = () => {
        switch(stage) {
            case 'admission':
                return 'Admission Documents';
            case 'visa':
                return 'Visa Documents';
            case 'document_waitlist':
                return 'Agency Documents';
            default:
                return 'Documents';
        }
    };

    const getStageIcon = () => {
        switch(stage) {
            case 'admission':
                return 'school-outline';
            case 'visa':
                return 'document-text-outline';
            case 'document_waitlist':
                return 'people-outline';
            default:
                return 'document-text-outline';
        }
    };

    const calculateProgress = () => {
        if (checklistDocuments.length === 0) return 0;
        const uploaded = checklistDocuments.filter(d => d.status !== 'pending').length;
        return Math.round((uploaded / checklistDocuments.length) * 100);
    };

    const getUploadedCount = () => checklistDocuments.filter(d => d.status !== 'pending').length;
    const getApprovedCount = () => checklistDocuments.filter(d => d.status === 'approved').length;
    const getRejectedCount = () => checklistDocuments.filter(d => d.status === 'rejected' || d.status === 'reupload').length;

    const getStageIndex = () => {
        return STAGES.findIndex(s => s.key === stage);
    };

    // ========================================
    // STAGE OVERVIEW MODAL
    // ========================================
    const renderStageOverviewModal = () => (
        <Modal
            visible={showStageModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowStageModal(false)}
        >
            <TouchableOpacity 
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowStageModal(false)}
            >
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Application Overview</Text>
                        <TouchableOpacity onPress={() => setShowStageModal(false)}>
                            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {STAGES.map((stageItem, index) => {
                        const status = allStagesStatus[stageItem.key];
                        const isCurrent = stageItem.key === stage;
                        const progress = stageItem.key === 'document_waitlist' 
                            ? (status.total > 0 ? 100 : 0)
                            : (status.total > 0 ? Math.round((status.uploaded / status.total) * 100) : 0);
                        
                        return (
                            <View key={stageItem.key} style={[styles.modalStageItem, isCurrent && styles.currentStageItem]}>
                                <View style={styles.modalStageHeader}>
                                    <View style={styles.modalStageTitleContainer}>
                                        <View style={[styles.modalStageIcon, isCurrent && { backgroundColor: COLORS.primaryLight }]}>
                                            <Ionicons 
                                                name={stageItem.icon} 
                                                size={20} 
                                                color={isCurrent ? COLORS.primary : COLORS.textSecondary} 
                                            />
                                        </View>
                                        <Text style={[styles.modalStageTitle, isCurrent && styles.currentStageText]}>
                                            {stageItem.label}
                                        </Text>
                                    </View>
                                    {isCurrent && (
                                        <View style={styles.currentBadge}>
                                            <Text style={styles.currentBadgeText}>Current</Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.modalStageStats}>
                                    {stageItem.key === 'document_waitlist' ? (
                                        <Text style={styles.modalStageStatText}>
                                            {status.uploaded} document{status.uploaded !== 1 ? 's' : ''} uploaded
                                        </Text>
                                    ) : (
                                        <Text style={styles.modalStageStatText}>
                                            {status.uploaded}/{status.total} uploaded • {status.approved} approved
                                        </Text>
                                    )}
                                </View>

                                <View style={styles.modalProgressTrack}>
                                    <View style={[styles.modalProgressFill, { width: `${progress}%` }]} />
                                </View>
                            </View>
                        );
                    })}
                </View>
            </TouchableOpacity>
        </Modal>
    );

    // ========================================
    // RENDER ADMISSION/VISA STAGE
    // ========================================
    const renderDocumentStage = () => {
        if (isInitialLoad) {
            return (
                <View style={styles.fullScreenLoader}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading {getStageTitle()}...</Text>
                </View>
            );
        }

        const progress = calculateProgress();
        const uploadedCount = getUploadedCount();
        const approvedCount = getApprovedCount();
        const rejectedCount = getRejectedCount();

        return (
            <View style={styles.flexOne}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={COLORS.primary}
                            colors={[COLORS.primary]}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    {/* Progress Overview Card */}
                    <TouchableOpacity 
                        style={styles.progressOverviewCard}
                        onPress={() => setShowStageModal(true)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.progressHeader}>
                            <View style={styles.progressTitleContainer}>
                                <View style={styles.iconCircle}>
                                    <Ionicons name={getStageIcon()} size={22} color={COLORS.primary} />
                                </View>
                                <View>
                                    <Text style={styles.progressTitle}>{getStageTitle()}</Text>
                                    <Text style={styles.progressSubtitle}>
                                        {checklistDocuments.length} Required Documents
                                    </Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
                        </View>

                        <View style={styles.statsGrid}>
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>{uploadedCount}</Text>
                                <Text style={styles.statLabel}>Uploaded</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statBox}>
                                <Text style={[styles.statNumber, { color: COLORS.success }]}>{approvedCount}</Text>
                                <Text style={styles.statLabel}>Approved</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statBox}>
                                <Text style={[styles.statNumber, { color: COLORS.warning }]}>{rejectedCount}</Text>
                                <Text style={styles.statLabel}>Needs Action</Text>
                            </View>
                        </View>

                        <View style={styles.progressSection}>
                            <View style={styles.progressHeaderRow}>
                                <Text style={styles.progressLabel}>Stage Progress</Text>
                                <Text style={styles.progressPercent}>{progress}%</Text>
                            </View>
                            <View style={styles.progressTrack}>
                                <View style={[styles.progressFill, { width: `${progress}%` }]} />
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* Documents List */}
                    <View style={styles.documentsSection}>
                        <Text style={styles.sectionTitle}>Document Checklist</Text>
                        
                        {checklistDocuments.length === 0 ? (
                            <View style={styles.emptyStateCard}>
                                <View style={styles.emptyStateIcon}>
                                    <Ionicons name="document-text-outline" size={40} color={COLORS.textTertiary} />
                                </View>
                                <Text style={styles.emptyStateTitle}>No Documents Required</Text>
                                <Text style={styles.emptyStateDescription}>
                                    There are no documents required for this stage yet.
                                </Text>
                            </View>
                        ) : (
                            checklistDocuments.map((doc) => {
                                const statusInfo = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
                                const isUploading = uploadingDocId === doc.id;
                                const hasDocument = !!doc.document;

                                return (
                                    <View
                                        key={doc.id}
                                        style={[
                                            styles.documentCard,
                                            { borderLeftColor: statusInfo.borderColor }
                                        ]}
                                    >
                                        {/* Document Header */}
                                        <View style={styles.documentHeader}>
                                            <View style={styles.documentTitleRow}>
                                                <View style={[styles.documentIconContainer, { backgroundColor: `${statusInfo.textColor}10` }]}>
                                                    <MaterialCommunityIcons 
                                                        name="file-document-outline" 
                                                        size={24} 
                                                        color={statusInfo.textColor} 
                                                    />
                                                </View>
                                                <View style={styles.documentInfo}>
                                                    <Text style={styles.documentName}>{doc.name}</Text>
                                                    {doc.description ? (
                                                        <Text style={styles.documentDescription} numberOfLines={1}>
                                                            {doc.description}
                                                        </Text>
                                                    ) : null}
                                                </View>
                                            </View>
                                            
                                            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
                                                <Ionicons name={statusInfo.iconName} size={12} color={statusInfo.textColor} />
                                                <Text style={[styles.statusText, { color: statusInfo.textColor }]}>
                                                    {statusInfo.label}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Uploaded Document Info */}
                                        {hasDocument && (
                                            <TouchableOpacity
                                                style={styles.uploadedFileCard}
                                                onPress={() => handleViewDocument(doc.document.fileURL)}
                                                activeOpacity={0.7}
                                            >
                                                <View style={[styles.fileIcon, { backgroundColor: `${statusInfo.textColor}10` }]}>
                                                    <MaterialCommunityIcons 
                                                        name="file-pdf-box" 
                                                        size={28} 
                                                        color={statusInfo.textColor} 
                                                    />
                                                </View>
                                                <View style={styles.fileInfo}>
                                                    <Text style={styles.fileName} numberOfLines={1}>
                                                        {doc.name}
                                                    </Text>
                                                    <View style={styles.fileMetaRow}>
                                                        <Ionicons name="calendar-outline" size={12} color={COLORS.textTertiary} />
                                                        <Text style={styles.fileMeta}>
                                                            {formatDate(doc.document.uploadedAt)}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <View style={styles.viewButtonIcon}>
                                                    <Ionicons name="eye-outline" size={20} color={statusInfo.textColor} />
                                                </View>
                                            </TouchableOpacity>
                                        )}

                                        {/* Rejection Reason */}
                                        {(doc.status === 'rejected' || doc.status === 'reupload') && doc.rejectionReason && (
                                            <View style={styles.rejectionContainer}>
                                                <View style={styles.rejectionHeader}>
                                                    <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                                                    <Text style={styles.rejectionTitle}>Reason:</Text>
                                                </View>
                                                <Text style={styles.rejectionText}>{doc.rejectionReason}</Text>
                                            </View>
                                        )}

                                        {/* Action Buttons */}
                                        {isUploading ? (
                                            <View style={styles.uploadingContainer}>
                                                <ActivityIndicator size="small" color={COLORS.primary} />
                                                <Text style={styles.uploadingText}>Uploading document...</Text>
                                            </View>
                                        ) : (
                                            <View style={styles.actionButtons}>
                                                {/* View Button */}
                                                {hasDocument && statusInfo.showActions.view && (
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.actionButton,
                                                            styles.viewButton,
                                                            { borderColor: statusInfo.textColor }
                                                        ]}
                                                        onPress={() => handleViewDocument(doc.document.fileURL)}
                                                    >
                                                        <Ionicons name="eye-outline" size={16} color={statusInfo.textColor} />
                                                        <Text style={[styles.viewButtonText, { color: statusInfo.textColor }]}>
                                                            View
                                                        </Text>
                                                    </TouchableOpacity>
                                                )}

                                                {/* Upload/Reupload Button */}
                                                {((!hasDocument && statusInfo.showActions.upload) || 
                                                  (hasDocument && statusInfo.showActions.reupload)) && (
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.actionButton,
                                                            styles.uploadButton,
                                                            { backgroundColor: statusInfo.textColor }
                                                        ]}
                                                        onPress={() => handleUpload(doc)}
                                                    >
                                                        <Ionicons 
                                                            name={hasDocument ? "refresh-outline" : "cloud-upload-outline"} 
                                                            size={16} 
                                                            color={COLORS.white} 
                                                        />
                                                        <Text style={styles.uploadButtonText}>
                                                            {hasDocument ? 'Re-upload' : 'Upload'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                );
                            })
                        )}
                    </View>
                    
                    {/* Extra space at bottom for sticky button */}
                    <View style={{ height: 80 }} />
                </ScrollView>

                {/* Sticky Continue Button */}
                {checklistDocuments.length > 0 && checklistDocuments.every(doc => doc.status === 'approved') && (
                    <View style={[styles.stickyButtonContainer, { paddingBottom: insets.bottom || 16 }]}>
                        <TouchableOpacity
                            style={styles.continueButton}
                            onPress={() => {
                                if (stage === 'admission') {
                                    onStageChange('document_waitlist');
                                } else if (stage === 'visa') {
                                    Alert.alert(
                                        'Congratulations!',
                                        'All your visa documents have been approved. Your application is now complete.',
                                        [{ text: 'OK' }]
                                    );
                                }
                            }}
                        >
                            <Text style={styles.continueButtonText}>
                                {stage === 'admission' ? 'Continue to Next Stage' : 'Complete Application'}
                            </Text>
                            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    // ========================================
    // RENDER DOCUMENT WAITLIST STAGE
    // ========================================
    const renderDocumentWaitlist = () => {
        const renderCategory = (title, icon, color, docs) => (
            <View style={styles.agencyCategory}>
                <View style={styles.agencyCategoryHeader}>
                    <View style={[styles.agencyCategoryIcon, { backgroundColor: `${color}15` }]}>
                        <Ionicons name={icon} size={20} color={color} />
                    </View>
                    <Text style={styles.agencyCategoryTitle}>{title}</Text>
                    <View style={[styles.agencyCategoryBadge, { backgroundColor: `${color}15` }]}>
                        <Text style={[styles.agencyCategoryBadgeText, { color }]}>{docs.length}</Text>
                    </View>
                </View>

                {docs.length === 0 ? (
                    <View style={styles.agencyEmptyState}>
                        <MaterialCommunityIcons name="file-document-outline" size={32} color={COLORS.textTertiary} />
                        <Text style={styles.agencyEmptyText}>No documents uploaded yet</Text>
                    </View>
                ) : (
                    docs.map((doc) => (
                        <TouchableOpacity
                            key={doc._id}
                            style={styles.agencyDocumentCard}
                            onPress={() => handleViewDocument(doc.fileURL)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.agencyDocIcon, { backgroundColor: `${color}10` }]}>
                                <MaterialCommunityIcons name="file-pdf-box" size={24} color={color} />
                            </View>
                            <View style={styles.agencyDocInfo}>
                                <Text style={styles.agencyDocName} numberOfLines={1}>
                                    {doc.documentCategory === 'COE' ? 'Confirmation of Enrollment' :
                                     doc.documentCategory === 'offer_letter' ? 'Offer Letter' : 
                                     'Other Document'}
                                </Text>
                                <Text style={styles.agencyDocDate}>
                                    {formatDate(doc.createdAt)}
                                </Text>
                            </View>
                            <View style={styles.viewButtonIcon}>
                                <Ionicons name="eye-outline" size={20} color={color} />
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </View>
        );

        return (
            <View style={styles.flexOne}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={COLORS.primary}
                            colors={[COLORS.primary]}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    <TouchableOpacity 
                        style={styles.waitlistHeader}
                        onPress={() => setShowStageModal(true)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.waitlistHeaderContent}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="people-outline" size={24} color={COLORS.primary} />
                            </View>
                            <View style={styles.waitlistHeaderText}>
                                <Text style={styles.waitlistTitle}>Agency Documents</Text>
                                <Text style={styles.waitlistSubtitle}>Documents uploaded by your agency</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
                        </View>
                        <Text style={styles.waitlistDescription}>
                            Your agency will upload important documents here. You can view them once they're available.
                        </Text>
                    </TouchableOpacity>

                    {renderCategory('Confirmation of Enrollment', 'school-outline', COLORS.primary, agencyDocuments.COE)}
                    {renderCategory('Offer Letter', 'mail-outline', COLORS.success, agencyDocuments.offer_letter)}
                    {renderCategory('Other Documents', 'document-text-outline', COLORS.warning, agencyDocuments.other)}
                    
                    {/* Extra space at bottom for sticky button */}
                    <View style={{ height: 80 }} />
                </ScrollView>

                {/* Sticky Proceed Button */}
                <View style={[styles.stickyButtonContainer, { paddingBottom: insets.bottom || 16 }]}>
                    <TouchableOpacity
                        style={styles.proceedButton}
                        onPress={() => onStageChange('visa')}
                    >
                        <Text style={styles.proceedButtonText}>Continue to Visa Stage</Text>
                        <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="chevron-back" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{getStageTitle()}</Text>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            {stage === 'document_waitlist' ? renderDocumentWaitlist() : renderDocumentStage()}
            {renderStageOverviewModal()}
        </View>
    );
}

// ========================================
// STYLES (Unchanged)
// ========================================
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    flexOne: {
        flex: 1,
    },
    fullScreenLoader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    header: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 20,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        elevation: 4,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
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
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.white,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 20,
    },

    // Progress Overview Card
    progressOverviewCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    progressTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    progressSubtitle: {
        fontSize: 12,
        color: COLORS.textTertiary,
    },
    statsGrid: {
        flexDirection: 'row',
        backgroundColor: COLORS.background,
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        backgroundColor: COLORS.border,
    },
    statNumber: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.primary,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 11,
        color: COLORS.textTertiary,
    },
    progressSection: {
        gap: 8,
    },
    progressHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressLabel: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    progressPercent: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
    },
    progressTrack: {
        height: 6,
        backgroundColor: COLORS.border,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 3,
    },

    // Documents Section
    documentsSection: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 12,
    },

    // Document Card
    documentCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderLeftWidth: 4,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
    },
    documentHeader: {
        marginBottom: 12,
    },
    documentTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    documentIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    documentInfo: {
        flex: 1,
    },
    documentName: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    documentDescription: {
        fontSize: 12,
        color: COLORS.textTertiary,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },

    // Uploaded File Card
    uploadedFileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    fileIcon: {
        width: 44,
        height: 44,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    fileInfo: {
        flex: 1,
    },
    fileName: {
        fontSize: 13,
        fontWeight: '500',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    fileMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    fileMeta: {
        fontSize: 10,
        color: COLORS.textTertiary,
    },
    viewButtonIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Rejection Container
    rejectionContainer: {
        backgroundColor: COLORS.errorLight,
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
    },
    rejectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    rejectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.error,
    },
    rejectionText: {
        fontSize: 12,
        color: COLORS.error,
        lineHeight: 16,
        paddingLeft: 22,
    },

    // Action Buttons
    uploadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        gap: 8,
        backgroundColor: COLORS.background,
        borderRadius: 10,
    },
    uploadingText: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        gap: 6,
    },
    viewButton: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
    },
    viewButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    uploadButton: {
        elevation: 1,
    },
    uploadButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.white,
    },

    // Sticky Button Container
    stickyButtonContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.background,
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 8,
    },

    // Continue Button
    continueButton: {
        backgroundColor: COLORS.success,
        borderRadius: 12,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        elevation: 2,
        shadowColor: COLORS.success,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    continueButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.white,
    },

    // Empty State
    emptyStateCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
    },
    emptyStateIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyStateTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyStateDescription: {
        fontSize: 13,
        color: COLORS.textTertiary,
        textAlign: 'center',
        lineHeight: 18,
    },

    // Document Waitlist Styles
    waitlistHeader: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    waitlistHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    waitlistHeaderText: {
        flex: 1,
    },
    waitlistTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    waitlistSubtitle: {
        fontSize: 12,
        color: COLORS.textTertiary,
    },
    waitlistDescription: {
        fontSize: 13,
        color: COLORS.textSecondary,
        lineHeight: 18,
        paddingLeft: 56,
    },
    agencyCategory: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    agencyCategoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    agencyCategoryIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    agencyCategoryTitle: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    agencyCategoryBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    agencyCategoryBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    agencyDocumentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    agencyDocIcon: {
        width: 44,
        height: 44,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    agencyDocInfo: {
        flex: 1,
    },
    agencyDocName: {
        fontSize: 13,
        fontWeight: '500',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    agencyDocDate: {
        fontSize: 11,
        color: COLORS.textTertiary,
    },
    agencyEmptyState: {
        alignItems: 'center',
        paddingVertical: 24,
        gap: 8,
    },
    agencyEmptyText: {
        fontSize: 13,
        color: COLORS.textTertiary,
    },
    proceedButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        elevation: 2,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    proceedButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.white,
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: 20,
        width: '90%',
        maxWidth: 400,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    modalStageItem: {
        marginBottom: 16,
        padding: 12,
        borderRadius: 12,
        backgroundColor: COLORS.background,
    },
    currentStageItem: {
        backgroundColor: COLORS.primaryExtraLight,
        borderWidth: 1,
        borderColor: COLORS.primaryLight,
    },
    modalStageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    modalStageTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    modalStageIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalStageTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    currentStageText: {
        color: COLORS.primary,
    },
    currentBadge: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    currentBadgeText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: '600',
    },
    modalStageStats: {
        marginBottom: 8,
    },
    modalStageStatText: {
        fontSize: 12,
        color: COLORS.textTertiary,
    },
    modalProgressTrack: {
        height: 4,
        backgroundColor: COLORS.border,
        borderRadius: 2,
        overflow: 'hidden',
    },
    modalProgressFill: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 2,
    },
});