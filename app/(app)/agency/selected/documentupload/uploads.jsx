import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Alert, Image, Dimensions, StatusBar, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
    warning: '#FBBF24'
};

export default function SwipeableDocumentUpload() {
    const { courseId, agencyId } = useLocalSearchParams();
    const router = useRouter();
    const { userToken } = useAuth();
    const flatListRef = useRef(null);

    const [documentSteps, setDocumentSteps] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [fetchingSteps, setFetchingSteps] = useState(true);
    const [userData, setUserData] = useState(null);
    const [uploadedDocs, setUploadedDocs] = useState({}); // Stores status: { docId: { status: 'uploaded', uri: '...' } }

    useEffect(() => {
        const initialize = async () => {
            await fetchProfile();
            await fetchRequiredDocuments();
        };
        initialize();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await fetch(`${Config.API_BASE_URL}/students/profile`, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });
            const json = await res.json();
            if (res.ok) setUserData(json.profile);
        } catch (e) { console.error(e); }
    };

    const fetchRequiredDocuments = async () => {
        try {
            setFetchingSteps(true);
            const res = await fetch(`${Config.API_BASE_URL}/students/documents/${agencyId}`, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });
            const json = await res.json();
            
            // Assuming your backend also returns the student's current uploads in this call or a separate one
            // If separate, you'd fetch `${Config.API_BASE_URL}/students/my-uploads/${agencyId}`
            const docsArray = json.documents || json.data || json;
            const existingUploads = json.existingUploads || {}; // Logic to map already uploaded files

            if (res.ok && Array.isArray(docsArray)) {
                const formatted = docsArray.map((doc) => ({
                    id: doc._id || doc.name,
                    label: doc.name || 'Document',
                    sub: doc.description || `Upload your ${doc.name}`,
                    type: doc.type || doc.name.toLowerCase().replace(/\s+/g, '_'),
                    required: true 
                }));
                setDocumentSteps(formatted);
                setUploadedDocs(existingUploads); 
            }
        } catch (e) {
            Alert.alert("Error", "Failed to load requirements.");
        } finally {
            setFetchingSteps(false);
        }
    };

    const handleUpload = async (asset, docItem) => {
        const studentId = userData?._id;
        const activeAgencyId = agencyId || userData?.registeredAgency;

        try {
            setLoading(true);
            const mimeType = asset.mimeType || asset.type || 'application/pdf';
            const fileSize = asset.fileSize || asset.size || 0;

            const sasRes = await fetch(`${Config.API_BASE_URL}/students/uploads/sas`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ mimeType, size: fileSize, agencyId: activeAgencyId, studentId, documentType: docItem.type })
            });

            const { sasUrl, blobName } = await sasRes.json();
            const blobRes = await fetch(asset.uri);
            const blob = await blobRes.blob();

            await fetch(sasUrl, {
                method: 'PUT',
                body: blob,
                headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': mimeType }
            });

            const confirmRes = await fetch(`${Config.API_BASE_URL}/students/uploads/confirm`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ blobName, studentId, agencyId: activeAgencyId, courseId: courseId || null, mimeType, size: fileSize, documentType: docItem.type })
            });

            if (confirmRes.ok) {
                setUploadedDocs(prev => ({ 
                    ...prev, 
                    [docItem.id]: { uri: asset.uri, type: mimeType, status: 'pending_validation' } 
                }));
                Alert.alert("Success", "Document sent for validation.");
            }
        } catch (err) {
            Alert.alert("Upload Error", "Upload failed. Please retry.");
        } finally {
            setLoading(false);
        }
    };

    const handleFinish = () => {
        const missingDocs = documentSteps.filter(doc => !uploadedDocs[doc.id]);
        
        if (missingDocs.length > 0) {
            Alert.alert(
                "Incomplete Uploads", 
                `You still have ${missingDocs.length} document(s) left to upload. Please complete all of them before finishing.`,
                [{ text: "Continue Uploading" }]
            );
        } else {
            Alert.alert("All Done!", "Your documents are submitted for review.", [
                { text: "Go to Home", onPress: () => router.back() }
            ]);
        }
    };

    const renderDocCard = ({ item, index }) => {
        const currentDoc = uploadedDocs[item.id];
        const isUploaded = !!currentDoc;

        return (
            <View style={styles.cardContainer}>
                <View style={styles.instructionBox}>
                    <Text style={styles.docTitle}>{item.label}</Text>
                    <Text style={styles.docSub}>{item.sub}</Text>
                    {isUploaded && (
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>PENDING VALIDATION</Text>
                        </View>
                    )}
                </View>

                <TouchableOpacity 
                    style={[
                        styles.uploadCard, 
                        isUploaded && styles.successCard,
                        loading && currentIndex === index && { opacity: 0.5 }
                    ]} 
                    onPress={() => !isUploaded && pickDocument(item)}
                    disabled={isUploaded || (loading && currentIndex === index)}
                >
                    {loading && currentIndex === index ? (
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    ) : isUploaded ? (
                        <View style={styles.previewBox}>
                            <MaterialCommunityIcons 
                                name={currentDoc.type?.includes('pdf') ? "file-pdf-box" : "image"} 
                                size={80} 
                                color={COLORS.success} 
                            />
                            <Text style={{color: COLORS.success, fontWeight: '700'}}>File Secured</Text>
                            <View style={styles.overlay}>
                                <Ionicons name="lock-closed" size={40} color={COLORS.success} />
                            </View>
                        </View>
                    ) : (
                        <View style={styles.placeholderBox}>
                            <MaterialCommunityIcons name="cloud-upload-outline" size={80} color={COLORS.primary} />
                            <Text style={styles.uploadMainText}>Tap to Upload</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <View style={styles.actionRow}>
                    {!isUploaded ? (
                        <>
                            <TouchableOpacity style={styles.actionBtn} onPress={() => pickImage(item, true)}>
                                <Feather name="camera" size={20} color={COLORS.primary} />
                                <Text style={styles.actionText}>Camera</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtn} onPress={() => pickDocument(item)}>
                                <Feather name="file-text" size={20} color={COLORS.primary} />
                                <Text style={styles.actionText}>PDF</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity 
                            style={[styles.actionBtn, { borderColor: COLORS.warning }]} 
                            onPress={() => {
                                // Logic to clear state and allow re-upload
                                setUploadedDocs(prev => {
                                    const next = {...prev};
                                    delete next[item.id];
                                    return next;
                                });
                            }}
                        >
                            <Feather name="refresh-cw" size={20} color={COLORS.warning} />
                            <Text style={[styles.actionText, { color: COLORS.warning }]}>Retry / Change</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    // Helper functions for picker
    const pickDocument = async (item) => {
        const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
        if (!result.canceled) handleUpload(result.assets[0], item);
    };

    const pickImage = async (item, useCamera = false) => {
        const options = { mediaTypes: ['images'], allowsEditing: true, quality: 0.7 };
        const result = useCamera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
        if (!result.canceled) handleUpload(result.assets[0], item);
    };

    const onScroll = (event) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / width);
        setCurrentIndex(index);
    };

    if (fetchingSteps) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="close" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <View style={styles.progressContainer}>
                    <Text style={styles.progressText}>{currentIndex + 1} of {documentSteps.length}</Text>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${((currentIndex + 1) / documentSteps.length) * 100}%` }]} />
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
                onScroll={onScroll}
                keyExtractor={(item) => item.id}
                scrollEnabled={!loading}
            />

            <View style={styles.footer}>
                {currentIndex === documentSteps.length - 1 ? (
                    <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
                        <Text style={styles.finishText}>FINISH SUBMISSION</Text>
                    </TouchableOpacity>
                ) : (
                    <Text style={styles.swipeText}>Swipe right to continue →</Text>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
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
    statusBadge: { marginTop: 10, backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
    statusText: { fontSize: 10, fontWeight: '800', color: COLORS.warning },
    uploadCard: { height: 300, backgroundColor: COLORS.white, borderRadius: 24, borderWidth: 2, borderColor: COLORS.primary, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', elevation: 4 },
    successCard: { borderStyle: 'solid', borderColor: COLORS.success, backgroundColor: '#F0FDF4' },
    placeholderBox: { alignItems: 'center' },
    uploadMainText: { fontSize: 16, fontWeight: '700', color: COLORS.primary, marginTop: 10 },
    previewBox: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.4)' },
    actionRow: { flexDirection: 'row', justifyContent: 'center', gap: 15, marginTop: 20 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 25, paddingVertical: 12, backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
    actionText: { color: COLORS.primary, fontWeight: '600' },
    footer: { padding: 20, alignItems: 'center', height: 100, justifyContent: 'center' },
    swipeText: { color: COLORS.gray, fontSize: 12 },
    finishBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 40, paddingVertical: 15, borderRadius: 16, width: '100%', alignItems: 'center' },
    finishText: { color: COLORS.white, fontWeight: '800', fontSize: 16 }
});