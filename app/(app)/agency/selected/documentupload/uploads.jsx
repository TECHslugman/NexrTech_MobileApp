import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Alert, Dimensions, StatusBar, FlatList, 
    Platform, RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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
    const [refreshing, setRefreshing] = useState(false); // NEW: Pull to refresh state
    const [fetchingSteps, setFetchingSteps] = useState(true);
    const [userData, setUserData] = useState(null);
    const [docStatuses, setDocStatuses] = useState({}); 
    const [isRejected, setIsRejected] = useState(false);

    useEffect(() => {
        initialize();
    }, []);

    const initialize = async () => {
        setFetchingSteps(true);
        await Promise.all([
            fetchProfile(),
            fetchRequiredDocuments(),
            fetchDocumentStatuses()
        ]);
        setFetchingSteps(false);
    };

    // Pull to refresh handler
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchDocumentStatuses();
        setRefreshing(false);
    }, []);

    const fetchDocumentStatuses = async () => {
        try {
            console.log("🔍 [REFRESH] Updating document statuses...");
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
                console.log("📊 [STATUS UPDATE] Mapped:", statusMap);
            }
        } catch (e) { console.error("❌ Refresh Error:", e); }
    };

    const fetchProfile = async () => {
        try {
            const res = await fetch(`${Config.API_BASE_URL}/students/profile`, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });
            const json = await res.json();
            if (res.ok) setUserData(json.profile);
        } catch (e) { console.error("Profile Fetch Error:", e); }
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
        } catch (e) { console.error("Fetch Docs Error:", e); }
    };

    const handleUpload = async (asset, docItem) => {
        const studentId = userData?._id;
        const activeAgencyId = agencyId || userData?.registeredAgency;

        try {
            setLoading(true);
            const mimeType = asset.mimeType || asset.type || 'application/pdf';
            const fileSize = asset.fileSize || asset.size || 0;

            console.log("🚀 [UPLOAD START] Processing:", docItem.type);

            const sasRes = await fetch(`${Config.API_BASE_URL}/students/uploads/sas`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ mimeType, size: fileSize, agencyId: activeAgencyId, documentType: docItem.type })
            });
            
            const sasJson = await sasRes.json();
            if (!sasRes.ok) throw new Error(sasJson.error || "SAS Failed");
            const { sasUrl, blobName } = sasJson;

            console.log("☁️ [AZURE] Uploading to blob storage...");
            const blobRes = await fetch(asset.uri);
            const blob = await blobRes.blob();
            await fetch(sasUrl, { method: 'PUT', body: blob, headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': mimeType } });

            console.log("💾 [DB] Confirming upload...");
            const confirmRes = await fetch(`${Config.API_BASE_URL}/students/uploads/confirm`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ blobName, agencyId: activeAgencyId, studentId, mimeType, size: fileSize, documentType: docItem.type })
            });

            if (confirmRes.ok) {
                Alert.alert("Success", "Document sent for review.");
                await fetchDocumentStatuses(); 
            }
        } catch (err) {
            Alert.alert("Upload Error", err.message);
        } finally { setLoading(false); }
    };

    const pickDocument = (item) => {
        DocumentPicker.getDocumentAsync({ type: 'application/pdf' }).then(result => {
            if (!result.canceled) handleUpload(result.assets[0], item);
        });
    };

    const pickImage = (item, useCamera = false) => {
        const options = { mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7 };
        const pickerMethod = useCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
        pickerMethod(options).then(result => {
            if (!result.canceled) handleUpload(result.assets[0], item);
        });
    };

    const renderDocCard = ({ item, index }) => {
        const status = docStatuses[item.type] || 'empty'; 
        const isUnderReview = status === 'under_review';
        const isApproved = status === 'approved';
        const isReupload = status === 'reupload';
        const isRejectedDoc = status === 'rejected';
        const isLocked = isUnderReview || isApproved;

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
                        isRejectedDoc && { backgroundColor: '#FEE2E2' }
                    ]}>
                        <Text style={[
                            styles.statusText,
                            isApproved && { color: COLORS.success },
                            isReupload && { color: COLORS.warning },
                            isUnderReview && { color: COLORS.primary },
                            isRejectedDoc && { color: COLORS.danger }
                        ]}>
                            {status === 'empty' ? 'READY TO UPLOAD' : status.replace('_', ' ').toUpperCase()}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity 
                    style={[
                        styles.uploadCard, 
                        isApproved && styles.approvedCard,
                        isReupload && styles.reuploadCard,
                        isUnderReview && styles.pendingCard,
                        isRejectedDoc && styles.rejectedCard
                    ]} 
                    onPress={() => !isLocked && pickDocument(item)}
                    disabled={isLocked || loading}
                >
                    {loading && currentIndex === index ? (
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    ) : isApproved ? (
                        <View style={styles.statusContent}>
                            <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
                            <Text style={styles.statusMainText}>Document Verified</Text>
                        </View>
                    ) : isUnderReview ? (
                        <View style={styles.statusContent}>
                            <MaterialCommunityIcons name="clock-check-outline" size={80} color={COLORS.primary} />
                            <Text style={styles.statusMainText}>Under Review</Text>
                            <Text style={styles.statusSubText}>Locked for evaluation</Text>
                        </View>
                    ) : (
                        <View style={styles.placeholderBox}>
                            <MaterialCommunityIcons 
                                name={isReupload || isRejectedDoc ? "alert-circle-outline" : "cloud-upload-outline"} 
                                size={80} 
                                color={isReupload || isRejectedDoc ? COLORS.warning : COLORS.primary} 
                            />
                            <Text style={[styles.uploadMainText, (isReupload || isRejectedDoc) && { color: COLORS.warning }]}>
                                {isReupload ? "Tap to Re-upload" : isRejectedDoc ? "Document Rejected - Reupload" : "Tap to Upload"}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>

                <View style={styles.actionRow}>
                    {!isLocked ? (
                        <>
                            <TouchableOpacity style={styles.actionBtn} onPress={() => pickImage(item, true)}>
                                <Feather name="camera" size={20} color={isReupload ? COLORS.warning : COLORS.primary} />
                                <Text style={[styles.actionText, isReupload && { color: COLORS.warning }]}>Camera</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtn} onPress={() => pickDocument(item)}>
                                <Feather name="file-text" size={20} color={isReupload ? COLORS.warning : COLORS.primary} />
                                <Text style={[styles.actionText, isReupload && { color: COLORS.warning }]}>PDF</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <View style={styles.lockedNotice}>
                            <Ionicons name="lock-closed-outline" size={16} color={COLORS.gray} />
                            <Text style={styles.lockedText}>Locked for Review</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    if (fetchingSteps) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

    if (isRejected) return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: COLORS.bg }]}>
            <View style={styles.rejectedContainer}>
                <MaterialCommunityIcons name="emoticon-sad-outline" size={100} color={COLORS.danger} />
                <Text style={styles.rejectedTitle}>Application Rejected</Text>
                <Text style={styles.rejectedSub}>Your application has been rejected by the agency. Please contact them for more info.</Text>
                <TouchableOpacity style={styles.backHomeBtn} onPress={() => router.back()}><Text style={styles.backHomeText}>Return to Home</Text></TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: COLORS.bg }]}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color={COLORS.primary} /></TouchableOpacity>
                <View style={styles.progressContainer}>
                    <Text style={styles.progressText}>{currentIndex + 1} of {documentSteps.length}</Text>
                    <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${((currentIndex + 1) / (documentSteps.length || 1)) * 100}%` }]} /></View>
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
                // Pull to refresh configuration
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[COLORS.primary]}
                        tintColor={COLORS.primary}
                    />
                }
            />
            <View style={styles.footer}>
                <Text style={styles.swipeText}>Swipe to continue or pull down to refresh</Text>
            </View>
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
    pendingCard: { borderStyle: 'solid', borderColor: COLORS.primary, backgroundColor: '#F0F7FF', opacity: 0.8 },
    reuploadCard: { borderStyle: 'dashed', borderColor: COLORS.warning, backgroundColor: '#FFFBEB' },
    rejectedCard: { borderStyle: 'dashed', borderColor: COLORS.danger, backgroundColor: '#FEF2F2' },
    statusContent: { alignItems: 'center' },
    statusMainText: { fontSize: 18, fontWeight: '700', color: COLORS.textDark, marginTop: 10 },
    statusSubText: { fontSize: 12, color: COLORS.secondary, marginTop: 4 },
    placeholderBox: { alignItems: 'center' },
    uploadMainText: { fontSize: 16, fontWeight: '700', color: COLORS.primary, marginTop: 10 },
    actionRow: { flexDirection: 'row', justifyContent: 'center', gap: 15, marginTop: 25, height: 50 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 25, paddingVertical: 12, backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
    actionText: { color: COLORS.primary, fontWeight: '600' },
    lockedNotice: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    lockedText: { color: COLORS.gray, fontWeight: '600', fontSize: 14 },
    footer: { padding: 20, alignItems: 'center', height: 80 },
    swipeText: { color: COLORS.gray, fontSize: 12 },
    rejectedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    rejectedTitle: { fontSize: 26, fontWeight: '800', color: COLORS.danger, marginTop: 20 },
    rejectedSub: { fontSize: 16, color: COLORS.secondary, textAlign: 'center', marginTop: 15, lineHeight: 24 },
    backHomeBtn: { marginTop: 40, backgroundColor: COLORS.primary, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 12 },
    backHomeText: { color: COLORS.white, fontWeight: '700' }
});