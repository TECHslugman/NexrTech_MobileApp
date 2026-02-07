import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
    Dimensions, StatusBar, FlatList, RefreshControl, Linking
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../../../context/AuthContext';
import { Config } from '../../../../config';

const { width } = Dimensions.get('window');
const COLORS = { bg: '#F8FBFF', primary: '#769FCD', secondary: '#8E9AAF', white: '#FFFFFF', border: '#E0EBFF', success: '#4ADE80', textDark: '#2D3748' };

export default function SwipeableDocumentUpload({ stage, onStageChange }) {
    const insets = useSafeAreaInsets();
    const { userToken } = useAuth();
    const [documentSteps, setDocumentSteps] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(true);

    const fetchData = useCallback(async () => {
        console.log(`--- 📥 Fetching Stage: [${stage.toUpperCase()}] ---`);
        setRefreshing(true);
        try {
            const res = await fetch(`${Config.API_BASE_URL}/students/documents/status?stage=${stage}`, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });
            const json = await res.json();
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
        } catch (e) { console.error(e); } 
        finally { setRefreshing(false); }
    }, [userToken, stage]);

    useEffect(() => { fetchData(); }, [fetchData]);

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
            await fetch(sasJson.sasUrl, { method: 'PUT', body: blob, headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': mimeType } });
            await fetch(`${Config.API_BASE_URL}/students/uploads/confirm`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ blobName: sasJson.blobName, documentType: docItem.type, stage })
            });
            Toast.show({ type: 'success', text1: 'Uploaded successfully' });
            fetchData();
        } catch (err) { Toast.show({ type: 'error', text1: 'Upload failed' }); } 
        finally { setLoading(false); }
    };

    // LOGIC: Check if all documents in the current list are approved
    const allApproved = documentSteps.length > 0 && documentSteps.every(doc => doc.status === 'approved');

    const renderDocCard = ({ item, index }) => {
        const isApproved = item.status === 'approved';
        const isUnderReview = item.status === 'under_review';
        const hasFile = !!item.fileUrl;

        return (
            <View style={styles.cardContainer}>
                <View style={styles.instructionBox}>
                    <Text style={styles.docTitle}>{item.label}</Text>
                    <View style={[styles.statusBadge, isApproved && { backgroundColor: '#DCFCE7' }, isUnderReview && { backgroundColor: '#E0EBFF' }]}>
                        <Text style={[styles.statusText, isApproved && { color: COLORS.success }, isUnderReview && { color: COLORS.primary }]}>
                            {item.status?.replace('_', ' ').toUpperCase() || 'PENDING'}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.uploadCard, isApproved && styles.approvedCard]}
                    onPress={() => {
                        if (hasFile && item.status !== 'reupload') Linking.openURL(item.fileUrl);
                        else DocumentPicker.getDocumentAsync({ type: 'application/pdf' }).then(r => !r.canceled && handleUpload(r.assets[0], item));
                    }}
                >
                    {loading && currentIndex === index ? <ActivityIndicator size="large" /> :
                        (hasFile && item.status !== 'reupload') ? (
                            <View style={styles.statusContent}>
                                <MaterialCommunityIcons name={isApproved ? "check-circle" : "file-eye"} size={80} color={isApproved ? COLORS.success : COLORS.primary} />
                                <Text style={styles.statusMainText}>{isApproved ? "Verified" : "Under Review"}</Text>
                            </View>
                        ) : (
                            <View style={styles.placeholderBox}>
                                <MaterialCommunityIcons name="cloud-upload-outline" size={80} color={COLORS.primary} />
                                <Text style={styles.uploadMainText}>Tap to Upload PDF</Text>
                            </View>
                        )}
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{stage.toUpperCase()} SECTION</Text>
            </View>

            {documentSteps.length === 0 && !refreshing ? (
                <View style={styles.center}><Text>Waiting for agent to assign {stage} docs...</Text></View>
            ) : (
                <FlatList
                    data={documentSteps}
                    renderItem={renderDocCard}
                    horizontal pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={(e) => setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
                    keyExtractor={(item) => item.id}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} />}
                />
            )}

            {/* PROGRESSIVE NAVIGATION BUTTON */}
            {allApproved && (
                <TouchableOpacity 
                    style={styles.nextButton} 
                    onPress={() => onStageChange(stage === 'admission' ? 'coe' : 'visa')}
                >
                    <Text style={styles.nextButtonText}>
                        {stage === 'admission' ? "Request COE Letter" : "Proceed to Visa Stage"}
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="white" />
                </TouchableOpacity>
            )}

            <View style={styles.footer}>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${((currentIndex + 1) / (documentSteps.length || 1)) * 100}%` }]} />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: { padding: 20, alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textDark },
    cardContainer: { width: width, paddingHorizontal: 20, justifyContent: 'center' },
    instructionBox: { alignItems: 'center', marginBottom: 20 },
    docTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textDark },
    statusBadge: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    statusText: { fontSize: 10, fontWeight: 'bold' },
    uploadCard: { height: 320, backgroundColor: COLORS.white, borderRadius: 24, borderWidth: 2, borderColor: COLORS.primary, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
    approvedCard: { borderStyle: 'solid', borderColor: COLORS.success },
    statusContent: { alignItems: 'center' },
    statusMainText: { fontSize: 16, fontWeight: '700', marginTop: 10 },
    placeholderBox: { alignItems: 'center' },
    uploadMainText: { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginTop: 10 },
    footer: { height: 40, paddingHorizontal: 60, justifyContent: 'center' },
    progressBar: { height: 4, backgroundColor: COLORS.border, borderRadius: 2 },
    progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    nextButton: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        marginHorizontal: 40,
        borderRadius: 12,
        elevation: 4,
        position: 'absolute',
        bottom: 80,
        left: 0,
        right: 0
    },
    nextButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginRight: 8 }
});