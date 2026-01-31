import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Dimensions, StatusBar, FlatList,
    Platform, RefreshControl, Linking
} from 'react-native';
import Toast from 'react-native-toast-message'; 
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../../../context/AuthContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Config } from '../../../../config';

const { width } = Dimensions.get('window');

const COLORS = {
    bg: '#F8FBFF',
    primary: '#769FCD',
    secondary: '#8E9AAF',
    white: '#FFFFFF',
    border: '#E0EBFF',
    success: '#4ADE80',
    gray: '#94A3B8',
    textDark: '#2D3748',
    warning: '#FBBF24',
    danger: '#EF4444'
};

export default function SwipeableDocumentUpload() {
    const insets = useSafeAreaInsets();
    const { agencyId } = useLocalSearchParams();
    const router = useRouter();
    const { userToken } = useAuth();
    const flatListRef = useRef(null);

    const [documentSteps, setDocumentSteps] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [fetchingSteps, setFetchingSteps] = useState(true);
    const [userData, setUserData] = useState(null);
    const [docStatuses, setDocStatuses] = useState({});
    const [uploadedDocs, setUploadedDocs] = useState({});
    const [isRejected, setIsRejected] = useState(false);

    useEffect(() => {
        initialize();
    }, []);

    const initialize = async () => {
        setFetchingSteps(true);
        await Promise.all([fetchProfile(), fetchRequiredDocuments()]);
        await Promise.all([fetchDocumentStatuses(), fetchUploadedFiles()]);
        setFetchingSteps(false);
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([
            fetchDocumentStatuses(),
            fetchUploadedFiles()
        ]);
        setRefreshing(false);
    }, [documentSteps]);

    const fetchUploadedFiles = async () => {
        try {
            const res = await fetch(`${Config.API_BASE_URL}/students/documents`, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });
            const json = await res.json();
            if (res.ok && json.data) {
                const docMap = {};
                json.data.forEach(item => {
                    const url = item.fileURL || item.fileUrl;
                    const step = documentSteps.find(s => s.id === item.requiredDocument);
                    const key = step ? step.type : item.documentType;
                    if (key && url) {
                        docMap[key] = url;
                    }
                });
                setUploadedDocs(docMap);
            }
        } catch (e) { console.error("❌ Fetch Files Error:", e); }
    };

    const fetchDocumentStatuses = async () => {
        try {
            const res = await fetch(`${Config.API_BASE_URL}/students/documents/status`, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });
            const json = await res.json();
            if (res.ok && json.data) {
                const statusMap = {};
                json.data.forEach(item => {
                    if (item.requiredDocument?.name) {
                        statusMap[item.requiredDocument.name] = item.reviewStatus;
                    }
                });
                if (json.applicationStatus === 'rejected') setIsRejected(true);
                setDocStatuses(statusMap);
            }
        } catch (e) { console.error("❌ Status Error:", e); }
    };

    const fetchProfile = async () => {
        try {
            const res = await fetch(`${Config.API_BASE_URL}/students/profile`, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });
            const json = await res.json();
            if (res.ok) setUserData(json.profile);
        } catch (e) { console.error("❌ Profile Error:", e); }
    };

    const fetchRequiredDocuments = async () => {
        try {
            const res = await fetch(`${Config.API_BASE_URL}/students/document-list`, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });
            const json = await res.json();
            const docsArray = json.documents || json.data || json;
            if (res.ok && Array.isArray(docsArray)) {
                const formatted = docsArray.map((doc) => ({
                    id: doc._id || doc.name,
                    label: doc.name || 'Document',
                    sub: doc.description || `Upload your ${doc.name}`,
                    type: doc.name,
                }));
                setDocumentSteps(formatted);
            }
        } catch (e) { console.error("❌ List Error:", e); }
    };

    // FIX: Re-added missing pickDocument function
    const pickDocument = (item) => {
        DocumentPicker.getDocumentAsync({ type: 'application/pdf' }).then(result => {
            if (!result.canceled) handleUpload(result.assets[0], item);
        });
    };

    const handleUpload = async (asset, docItem) => {
        const studentId = userData?._id;
        const activeAgencyId = agencyId || userData?.registeredAgency;

        try {
            setLoading(true);
            const mimeType = asset.mimeType || asset.type || 'application/pdf';

            // 1. Get SAS URL
            const sasRes = await fetch(`${Config.API_BASE_URL}/students/uploads/sas`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ mimeType, size: asset.size || 0, agencyId: activeAgencyId, documentType: docItem.type })
            });

            const sasJson = await sasRes.json();

            // 2. Convert asset to blob and upload to Azure
            const response = await fetch(asset.uri);
            const blob = await response.blob();

            await fetch(sasJson.sasUrl, {
                method: 'PUT',
                body: blob,
                headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': mimeType }
            });

            // 3. Confirm upload with your backend
            await fetch(`${Config.API_BASE_URL}/students/uploads/confirm`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    blobName: sasJson.blobName,
                    agencyId: activeAgencyId,
                    studentId,
                    mimeType,
                    size: asset.size || 0,
                    documentType: docItem.type
                })
            });

            // REPLACED Alert with Toast
            Toast.show({
                type: 'success',
                text1: 'Upload Complete',
                text2: `${docItem.label || 'Document'} has been saved.`
            });

            await fetchDocumentStatuses();
            await fetchUploadedFiles();

        } catch (err) {
            // REPLACED Alert with Toast
            Toast.show({
                type: 'error',
                text1: 'Upload Failed',
                text2: err.message || 'Check your connection and try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleReview = (type) => {
        const url = uploadedDocs[type];
        if (url) {
            Linking.openURL(url).catch(() => {
                // REPLACED Alert with Toast
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Could not open the file viewer.'
                });
            });
        } else {
            // REPLACED Alert with Toast
            Toast.show({
                type: 'info',
                text1: 'File Not Ready',
                text2: 'Please pull down to refresh the list.'
            });
        }
    };

    const renderDocCard = ({ item, index }) => {
        const status = docStatuses[item.type] || 'empty';
        const fileUrl = uploadedDocs[item.type];
        const hasFile = !!fileUrl;

        const isUnderReview = status === 'under_review';
        const isApproved = status === 'approved';
        const isReupload = status === 'reupload';

        // LOGIC: Disable interaction if approved or under review
        const canUpload = (status === 'empty' || isReupload) && !loading;

        return (
            <View style={styles.cardContainer}>
                <View style={styles.instructionBox}>
                    <Text style={styles.docTitle}>{item.label}</Text>
                    <Text style={styles.docSub}>{item.sub}</Text>

                    <View style={[
                        styles.statusBadge,
                        isApproved && { backgroundColor: '#DCFCE7' },
                        isReupload && { backgroundColor: '#FEF3C7' },
                        isUnderReview && { backgroundColor: '#E0EBFF' },
                    ]}>
                        <Text style={[
                            styles.statusText,
                            isApproved && { color: COLORS.success },
                            isReupload && { color: COLORS.warning },
                            isUnderReview && { color: COLORS.primary }
                        ]}>
                            {status === 'empty' ? 'READY TO UPLOAD' : status.replace('_', ' ').toUpperCase()}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[
                        styles.uploadCard,
                        isApproved && styles.approvedCard,
                        (isUnderReview || hasFile) && styles.pendingCard,
                        isReupload && { borderStyle: 'dashed', borderColor: COLORS.warning }
                    ]}
                    // Card behavior changes based on status
                    onPress={() => {
                        if (isApproved || isUnderReview || (hasFile && !isReupload)) {
                            handleReview(item.type);
                        } else {
                            pickDocument(item);
                        }
                    }}
                    disabled={loading}
                >
                    {loading && currentIndex === index ? (
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    ) : (isUnderReview || isApproved || (hasFile && !isReupload)) ? (
                        <View style={styles.statusContent}>
                            <MaterialCommunityIcons
                                name={isApproved ? "check-circle" : "file-eye"}
                                size={80}
                                color={isApproved ? COLORS.success : COLORS.primary}
                            />
                            <Text style={styles.statusMainText}>
                                {isApproved ? "Verified" : "Under Review"}
                            </Text>
                            <Text style={styles.reviewHint}>Tap card to review</Text>
                        </View>
                    ) : (
                        <View style={styles.placeholderBox}>
                            <MaterialCommunityIcons
                                name={isReupload ? "refresh" : "cloud-upload-outline"}
                                size={80}
                                color={isReupload ? COLORS.warning : COLORS.primary}
                            />
                            <Text style={[styles.uploadMainText, isReupload && { color: COLORS.warning }]}>
                                {isReupload ? "Tap to Re-upload" : "Tap to Upload"}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>

                <View style={styles.actionRow}>
                    {canUpload ? (
                        <TouchableOpacity style={styles.actionBtn} onPress={() => pickDocument(item)}>
                            <Feather name="file-text" size={20} color={COLORS.primary} />
                            <Text style={styles.actionText}>{isReupload ? "Replace PDF" : "Select PDF"}</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={[styles.actionBtn, { borderColor: COLORS.primary }]} onPress={() => handleReview(item.type)}>
                            <Feather name="eye" size={20} color={COLORS.primary} />
                            <Text style={styles.actionText}>Review Upload</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    if (fetchingSteps) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

    // REJECTION SCREEN: No re-uploads allowed here
    if (isRejected) return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: COLORS.bg }]}>
            <View style={styles.rejectedContainer}>
                <MaterialCommunityIcons name="alert-decagram" size={100} color={COLORS.danger} />
                <Text style={styles.rejectedTitle}>Application Rejected</Text>
                <Text style={styles.rejectedSub}>
                    Your application has been fully rejected. No further uploads or re-submissions are allowed at this time. Please contact the agency for more information.
                </Text>
                <TouchableOpacity style={styles.backHomeBtn} onPress={() => router.back()}>
                    <Text style={styles.backHomeText}>Return to Home</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: COLORS.bg }]}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <View style={styles.progressContainer}>
                    <Text style={styles.progressText}>{currentIndex + 1} of {documentSteps.length}</Text>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${((currentIndex + 1) / (documentSteps.length || 1)) * 100}%` }]} />
                    </View>
                </View>
            </View>

            <FlatList
                ref={flatListRef}
                data={documentSteps}
                renderItem={renderDocCard}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={(e) => setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
                keyExtractor={(item) => item.id}
                scrollEnabled={!loading}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
            />
            <View style={styles.footer}><Text style={styles.swipeText}>Pull down to refresh statuses</Text></View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    backButton: { width: 45, height: 45, backgroundColor: COLORS.white, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 2 },
    progressContainer: { flex: 1, marginLeft: 15 },
    progressText: { fontSize: 12, fontWeight: '700', color: COLORS.secondary, marginBottom: 5 },
    progressBar: { height: 6, backgroundColor: COLORS.border, borderRadius: 3 },
    progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
    cardContainer: { width: width, paddingHorizontal: 20, justifyContent: 'center' },
    instructionBox: { alignItems: 'center', marginBottom: 20 },
    docTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textDark, textAlign: 'center' },
    docSub: { fontSize: 14, color: COLORS.secondary, textAlign: 'center', marginTop: 5 },
    statusBadge: { marginTop: 12, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    statusText: { fontSize: 11, fontWeight: '900' },
    uploadCard: { height: 320, backgroundColor: COLORS.white, borderRadius: 24, borderWidth: 2, borderColor: COLORS.primary, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', elevation: 4 },
    approvedCard: { borderStyle: 'solid', borderColor: COLORS.success, backgroundColor: '#F0FFF4' },
    pendingCard: { borderStyle: 'solid', borderColor: COLORS.primary, backgroundColor: '#F0F7FF' },
    statusContent: { alignItems: 'center' },
    statusMainText: { fontSize: 18, fontWeight: '700', color: COLORS.textDark, marginTop: 10 },
    reviewHint: { fontSize: 12, color: COLORS.primary, marginTop: 8, fontWeight: 'bold' },
    placeholderBox: { alignItems: 'center' },
    uploadMainText: { fontSize: 16, fontWeight: '700', color: COLORS.primary, marginTop: 10 },
    actionRow: { flexDirection: 'row', justifyContent: 'center', gap: 15, marginTop: 25, height: 50 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 25, paddingVertical: 12, backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
    actionText: { color: COLORS.primary, fontWeight: '600' },
    footer: { padding: 20, alignItems: 'center', height: 80 },
    swipeText: { color: COLORS.gray, fontSize: 12 },
    rejectedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
    rejectedTitle: { fontSize: 26, fontWeight: '800', color: COLORS.danger, marginTop: 20 },
    rejectedSub: { fontSize: 15, color: COLORS.secondary, textAlign: 'center', marginTop: 15, lineHeight: 22 },
    backHomeBtn: { marginTop: 40, backgroundColor: COLORS.primary, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 12 },
    backHomeText: { color: COLORS.white, fontWeight: '700' }
});