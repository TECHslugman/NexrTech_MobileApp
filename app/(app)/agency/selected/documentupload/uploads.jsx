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

export default function DocumentUpload({ stage, onStageChange, onRefresh }) {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { userToken } = useAuth();

    const [documents, setDocuments] = useState([]);
    const [coeDocument, setCoeDocument] = useState(null);
    const [agentDocuments, setAgentDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(true);
    const [uploadingDocId, setUploadingDocId] = useState(null);

    // Fetch documents based on stage
    const fetchDocuments = useCallback(async () => {
        console.log(`📡 Fetching documents for stage: ${stage}`);
        setRefreshing(true);

        try {
            if (stage === 'coe') {
                // COE stage - fetch ALL documents and filter for COE
                const res = await fetch(
                    `${Config.API_BASE_URL}/students/documents`,
                    {
                        headers: { 'Authorization': `Bearer ${userToken}` }
                    }
                );

                const json = await res.json();
                console.log(`📥 [COE] All Documents Response:`, JSON.stringify(json, null, 2));

                if (res.ok && json.data && json.data.length > 0) {
                    // Find COE document by documentCategory
                    const coeDoc = json.data.find(doc =>
                        doc.documentCategory?.toLowerCase() === 'coe' ||
                        doc.type?.toLowerCase() === 'coe'
                    );

                    console.log('🔍 Found COE Document:', coeDoc);

                    if (coeDoc) {
                        setCoeDocument({
                            id: coeDoc._id,
                            requiredDocumentId: coeDoc.requiredDocumentId,
                            name: coeDoc.requiredDocument?.name || 'Confirmation of Enrollment',
                            description: coeDoc.requiredDocument?.description || 'COE Letter from University',
                            fileUrl: coeDoc.fileURL,
                            uploadedAt: coeDoc.createdAt || coeDoc.uploadedAt,
                            fileName: coeDoc.fileName,
                            fileSize: coeDoc.fileSize,
                            uploadedBy: coeDoc.uploaderModel || coeDoc.uploadedBy,
                            type: coeDoc.type,
                            status: coeDoc.status
                        });
                        console.log('✅ COE Document Set Successfully');
                    } else {
                        console.log('⚠️ No COE document found in response');
                        setCoeDocument(null);
                    }
                    
                    // Also store all agent-uploaded documents for display
                    const agentUploads = json.data.filter(doc => 
                        doc.uploaderModel === 'Agent' || 
                        doc.uploaderModel === 'Agency' ||
                        doc.uploadedBy === 'Agent'
                    );
                    
                    setAgentDocuments(agentUploads.map(doc => ({
                        id: doc._id,
                        name: doc.requiredDocument?.name || doc.documentName || 'Document',
                        description: doc.requiredDocument?.description || 'Uploaded by agent',
                        fileUrl: doc.fileURL,
                        uploadedAt: doc.createdAt,
                        fileName: doc.fileName,
                        fileSize: doc.fileSize,
                        type: doc.documentCategory || doc.type,
                        uploadedBy: doc.uploaderModel || 'Agent'
                    })));
                    
                } else {
                    console.log('⚠️ No documents in response');
                    setCoeDocument(null);
                    setAgentDocuments([]);
                }
            } else {
                // Admission or Visa stage - document checklist
                const res = await fetch(
                    `${Config.API_BASE_URL}/students/documents/status?stage=${stage}`,
                    {
                        headers: { 'Authorization': `Bearer ${userToken}` }
                    }
                );

                const json = await res.json();
                console.log(' API Response status:', JSON.stringify(json, null, 2)); 
                

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
                        fileSize: item.uploadedDocument?.fileSize,
                        rejectionReason: item.rejectionReason,
                        uploadedAt: item.uploadedAt || item.createdAt,
                        id: item.uploadedDocument?._id || item.requiredDocument?._id || item._id
                    }));

                    setDocuments(formattedDocs);
                    console.log(`✅ Formatted ${formattedDocs.length} documents for ${stage}`);
                } else {
                    setDocuments([]);
                }
                
                // Also fetch agent documents for admission/visa stage
                const agentRes = await fetch(
                    `${Config.API_BASE_URL}/students/documents`,
                    { headers: { 'Authorization': `Bearer ${userToken}` } }
                );
                const agentJson = await agentRes.json();
                console.log(' Response documents:', JSON.stringify(agentJson, null, 2)); 
                
                if (agentRes.ok && agentJson.data) {
                    const agentUploads = agentJson.data.filter(doc => 
                        doc.uploaderModel === 'Agent' || 
                        doc.uploaderModel === 'Agency' ||
                        doc.uploadedBy === 'Agent'
                    );
                    
                    setAgentDocuments(agentUploads.map(doc => ({
                        id: doc._id,
                        name: doc.requiredDocument?.name || doc.documentName || 'Document',
                        description: doc.requiredDocument?.description || 'Uploaded by agent',
                        fileUrl: doc.fileURL,
                        uploadedAt: doc.createdAt,
                        fileName: doc.fileName,
                        fileSize: doc.fileSize,
                        type: doc.documentCategory || doc.type,
                        uploadedBy: doc.uploaderModel || 'Agent'
                    })));
                }
            }
        } catch (error) {
            console.error(`❌ Fetch error [${stage}]:`, error);
            Toast.show({
                type: 'error',
                text1: 'Failed to load documents',
                text2: error.message || 'Please try again'
            });
            if (stage === 'coe') {
                setCoeDocument(null);
                setAgentDocuments([]);
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

    // Handle document upload
    const handleUpload = async (document) => {
        try {
            console.log('📤 Starting upload for:', {
                documentName: document.name,
                requiredDocumentId: document.requiredDocumentId,
                checklistId: document.checklistId,
                type: document.type
            });

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

    // Check if all documents are approved
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

    // ========================================
    // RENDER AGENT DOCUMENTS SECTION
    // ========================================
    const renderAgentDocuments = () => {
        if (agentDocuments.length === 0) return null;

        return (
            <View style={styles.agentSection}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="briefcase-outline" size={18} color={COLORS.textSecondary} />
                    <Text style={styles.sectionTitle}>Documents from Agent</Text>
                </View>
                
                {agentDocuments.map((doc) => (
                    <TouchableOpacity
                        key={doc.id}
                        style={styles.agentDocumentCard}
                        onPress={() => doc.fileUrl && Linking.openURL(doc.fileUrl)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.agentDocIcon}>
                            <MaterialCommunityIcons name="file-document-outline" size={20} color={COLORS.primary} />
                        </View>
                        <View style={styles.agentDocContent}>
                            <Text style={styles.agentDocName}>{doc.name}</Text>
                            <Text style={styles.agentDocMeta}>
                                {doc.uploadedBy} • {new Date(doc.uploadedAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    // ========================================
    // RENDER ADMISSION/VISA STAGE
    // ========================================
    const renderDocumentStage = () => {
        if (!hasDocuments && !refreshing && agentDocuments.length === 0) {
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
                                : 'Waiting for visa officer to be assigned and upload visa document checklist'
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
                {/* Agent Documents Section */}
                {renderAgentDocuments()}

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

                {/* Continue Button - Updated with applyButton style */}
                {allApproved && (
                    <TouchableOpacity
                        style={styles.applyButton}
                        onPress={() => {
                            if (stage === 'admission') {
                                onStageChange('coe');
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
                            {stage === 'admission' ? 'Proceed to COE Stage' : 'Complete Visa Stage'}
                        </Text>
                        <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
                    </TouchableOpacity>
                )}
            </ScrollView>
        );
    };

    // ========================================
    // RENDER COE STAGE
    // ========================================
    const renderCOEStage = () => {
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
                {coeDocument ? (
                    // COE is available
                    <View style={styles.coeAvailableCard}>
                        <View style={styles.coeIconSuccess}>
                            <Ionicons
                                name="mail-open-outline"
                                size={48}
                                color={COLORS.primary}
                            />
                        </View>

                        <Text style={styles.coeTitle}>COE Letter Received</Text>
                        <Text style={styles.coeDescription}>
                            Your Confirmation of Enrollment has been uploaded by your admission officer.
                        </Text>

                        <View style={styles.coeDocumentBox}>
                            <View style={styles.coeDocHeader}>
                                <View style={styles.coeDocIcon}>
                                    <MaterialCommunityIcons name="file-pdf-box" size={24} color={COLORS.primary} />
                                </View>
                                <View style={styles.coeDocHeaderText}>
                                    <Text style={styles.coeDocName}>{coeDocument.name}</Text>
                                    {coeDocument.fileName && (
                                        <Text style={styles.coeFileName}>{coeDocument.fileName}</Text>
                                    )}
                                </View>
                            </View>
                            <Text style={styles.coeDocDescription}>{coeDocument.description}</Text>

                            <View style={styles.coeMetaRow}>
                                {coeDocument.uploadedAt && (
                                    <View style={styles.coeMetaItem}>
                                        <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
                                        <Text style={styles.coeMetaText}>
                                            {new Date(coeDocument.uploadedAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </Text>
                                    </View>
                                )}
                                {coeDocument.fileSize && (
                                    <View style={styles.coeMetaItem}>
                                        <Ionicons name="document-outline" size={14} color={COLORS.textSecondary} />
                                        <Text style={styles.coeMetaText}>
                                            {(coeDocument.fileSize / 1024).toFixed(1)} KB
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {coeDocument.uploadedBy && (
                                <View style={styles.uploadedByBadge}>
                                    <Ionicons name="person-outline" size={12} color={COLORS.primary} />
                                    <Text style={styles.uploadedByText}>
                                        Uploaded by {coeDocument.uploadedBy}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <TouchableOpacity
                            style={styles.viewCoeButton}
                            onPress={() => {
                                if (coeDocument.fileUrl) {
                                    Linking.openURL(coeDocument.fileUrl);
                                } else {
                                    Alert.alert('Error', 'Document URL not available');
                                }
                            }}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="eye-outline" size={20} color={COLORS.white} />
                            <Text style={styles.viewCoeButtonText}>View COE Document</Text>
                        </TouchableOpacity>

                        {/* Proceed to Visa - Using applyButton style */}
                        <TouchableOpacity
                            style={styles.applyButton}
                            onPress={() => onStageChange('visa')}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.applyButtonText}>Proceed to Visa Stage</Text>
                            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
                        </TouchableOpacity>
                    </View>
                ) : (
                    // Waiting for COE
                    <View style={styles.coeWaitingCard}>
                        <View style={styles.coeIconWaiting}>
                            <Ionicons
                                name="mail-outline"
                                size={48}
                                color={COLORS.primary}
                            />
                        </View>

                        <Text style={styles.coeTitle}>Awaiting COE</Text>
                        <Text style={styles.coeDescription}>
                            We are waiting for the university to issue your Confirmation of Enrollment letter.
                            Your admission officer will upload it once received.
                        </Text>

                        {/* Info Cards */}
                        <View style={styles.infoCardsContainer}>
                            <View style={styles.infoCard}>
                                <Ionicons name="time-outline" size={24} color={COLORS.primary} />
                                <Text style={styles.infoCardLabel}>Typical Timeline</Text>
                                <Text style={styles.infoCardValue}>3-5 business days</Text>
                            </View>

                            <View style={styles.infoCard}>
                                <Ionicons name="notifications-outline" size={24} color={COLORS.primary} />
                                <Text style={styles.infoCardLabel}>Notification</Text>
                                <Text style={styles.infoCardValue}>Via email & app</Text>
                            </View>
                        </View>

                        {/* Timeline */}
                        <View style={styles.timelineContainer}>
                            <Text style={styles.timelineTitle}>What's Next</Text>
                            {[
                                'University reviews your application',
                                'COE letter is generated',
                                'Officer uploads COE to your account',
                                'Proceed to visa application'
                            ].map((step, index) => (
                                <View key={index} style={styles.timelineStep}>
                                    <View style={styles.timelineDot}>
                                        <Text style={styles.timelineDotText}>{index + 1}</Text>
                                    </View>
                                    <Text style={styles.timelineStepText}>{step}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Proceed to Visa - Using applyButton style */}
                        <TouchableOpacity
                            style={styles.applyButton}
                            onPress={() => onStageChange('visa')}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.applyButtonText}>Proceed to Visa Stage</Text>
                            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
                        </TouchableOpacity>

                        <Text style={styles.proceedNote}>
                            You can proceed while waiting for COE
                        </Text>
                    </View>
                )}
            </ScrollView>
        );
    };

    // ========================================
    // MAIN RENDER
    // ========================================
    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Consistent Blue Header - Matching Settings Page */}
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
                        {stage === 'coe' && 'COE Confirmation'}
                        {stage === 'visa' && 'Visa Documents'}
                    </Text>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            {/* Content */}
            {stage === 'coe' ? renderCOEStage() : renderDocumentStage()}
        </View>
    );
}

// ========================================
// STYLES - Consistent with Settings Page
// ========================================
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    // Consistent Blue Header - Matches Settings
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

    // Agent Documents Section
    agentSection: {
        marginBottom: 24,
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    agentDocumentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    agentDocIcon: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    agentDocContent: {
        flex: 1,
    },
    agentDocName: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    agentDocMeta: {
        fontSize: 12,
        color: COLORS.textSecondary,
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

    // Apply Button - Matching your style
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
    // COE STAGE STYLES
    // ========================================
    coeAvailableCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        maxWidth: 500,
        width: '100%',
        alignSelf: 'center',
    },
    coeIconSuccess: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 20,
    },
    coeTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: 8,
    },
    coeDescription: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    coeDocumentBox: {
        backgroundColor: COLORS.background,
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    coeDocHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    coeDocIcon: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    coeDocHeaderText: {
        flex: 1,
    },
    coeDocName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    coeFileName: {
        fontSize: 12,
        color: COLORS.textTertiary,
    },
    coeDocDescription: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginBottom: 12,
    },
    coeMetaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 12,
    },
    coeMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    coeMetaText: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    uploadedByBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    uploadedByText: {
        fontSize: 12,
        fontWeight: '500',
        color: COLORS.primary,
        marginLeft: 4,
    },
    viewCoeButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    viewCoeButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.white,
        marginLeft: 8,
    },

    // COE Waiting Card
    coeWaitingCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        maxWidth: 500,
        width: '100%',
        alignSelf: 'center',
    },
    coeIconWaiting: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 20,
    },
    infoCardsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    infoCard: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
    },
    infoCardLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 8,
        marginBottom: 4,
        textAlign: 'center',
    },
    infoCardValue: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textPrimary,
        textAlign: 'center',
    },
    timelineContainer: {
        backgroundColor: COLORS.background,
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    timelineTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 16,
    },
    timelineStep: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    timelineDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    timelineDotText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.primary,
    },
    timelineStepText: {
        flex: 1,
        fontSize: 13,
        color: COLORS.textSecondary,
        lineHeight: 18,
    },
    proceedNote: {
        fontSize: 12,
        color: COLORS.textTertiary,
        textAlign: 'center',
        marginTop: 12,
    },
});