import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, ActivityIndicator,
    RefreshControl, TouchableOpacity, Modal, Dimensions, Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../context/AuthContext';
import { Config } from '../../../config';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLORS = {
    primary: '#769FCD',
    textMain: '#4A4A4A',
    textLight: '#BFC7D1',
    background: '#F8FAFD',
    white: '#FFFFFF',
    line: '#EEF2F7',
    success: '#4ADE80',
    error: '#F87171',
    warning: '#FBBF24'
};

export default function UpdatesScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { userToken } = useAuth();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [applicationSteps, setApplicationSteps] = useState([]);
    const [docStatuses, setDocStatuses] = useState([]);
    const [isModalVisible, setModalVisible] = useState(false);

    const fetchData = async () => {
        try {
            const [appRes, docRes] = await Promise.all([
                fetch(`${Config.API_BASE_URL}/students/application/status`, {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                }),
                fetch(`${Config.API_BASE_URL}/students/documents/status`, {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                })
            ]);

            const appJson = await appRes.json();
            const docJson = await docRes.json();

            const appData = appJson.data;
            const docData = docJson.data || [];
            setDocStatuses(docData);

            // Mapping API results to the Journey UI
            const journey = [
                {
                    id: 1,
                    title: 'Application Submitted',
                    desc: 'Your request has been received.',
                    status: 'completed',
                    icon: 'send-sharp'
                },
                {
                    id: 2,
                    title: 'Agent Assignment',
                    desc: appData?.agentId
                        ? `Agent ${appData.agentId.name || 'assigned'} is handling your case.`
                        : 'Waiting for agency to assign an agent.',
                    status: appData?.agentId ? 'completed' : 'in_progress',
                    icon: 'person-headset-outline'
                },
                {
                    id: 3,
                    title: 'Document Verification',
                    desc: docData.length > 0
                        ? `${docData.filter(d => d.reviewStatus === 'approved').length} of ${docData.length} docs approved.`
                        : appData?.agentId ? 'Waiting for agent to list requirements.' : 'Requirements will appear once agent is assigned.',
                    status: (docData.length > 0 && docData.every(d => d.reviewStatus === 'approved'))
                        ? 'completed'
                        : (appData?.agentId ? 'in_progress' : 'pending'),
                    icon: 'document-attach-outline',
                    isClickable: docData.length > 0
                }
            ];

            setApplicationSteps(journey);
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleResubmit = (docType) => {
        setModalVisible(false);
        router.push({
            pathname: '/student/upload-docs',
            params: { agencyId: id, initialDocType: docType }
        });
    };

    const renderStatusMarker = (status) => {
        if (status === 'completed') return <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />;
        if (status === 'in_progress') return <ActivityIndicator size="small" color={COLORS.primary} />;
        return <View style={styles.pendingDot} />;
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.textMain} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Application Journey</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={[styles.scrollBody, { paddingBottom: insets.bottom + 20 }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
            >
                {loading && !refreshing ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
                ) : (
                    <View style={styles.timelineCard}>
                        {applicationSteps.map((step, index) => (
                            <TouchableOpacity
                                key={step.id}
                                style={styles.stepContainer}
                                disabled={!step.isClickable}
                                onPress={() => step.id === 3 && setModalVisible(true)}
                            >
                                <View style={styles.leftCol}>
                                    <View style={[styles.iconCircle, step.status === 'completed' && styles.iconActive]}>
                                        <Ionicons
                                            name={step.icon}
                                            size={18}
                                            color={step.status === 'completed' ? COLORS.white : COLORS.textLight}
                                        />
                                    </View>
                                    {index !== applicationSteps.length - 1 && <View style={styles.verticalLine} />}
                                </View>

                                <View style={styles.rightCol}>
                                    <View style={styles.titleRow}>
                                        <Text style={[styles.stepTitle, step.status === 'pending' && { color: COLORS.textLight }]}>
                                            {step.title}
                                        </Text>
                                        {renderStatusMarker(step.status)}
                                    </View>
                                    <Text style={styles.stepDesc}>{step.desc}</Text>
                                    {step.isClickable && <Text style={styles.tapInfor}>Tap to view details</Text>}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* Document Status Modal */}
            <Modal
                visible={isModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Required Documents</Text>
                                <Text style={styles.modalSub}>Verify your application files</Text>
                            </View>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={20} color={COLORS.textMain} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {docStatuses.map((doc) => (
                                <View key={doc._id} style={styles.docDetailCard}>
                                    <View style={styles.docInfo}>
                                        <MaterialCommunityIcons
                                            name={doc.reviewStatus === 'approved' ? "check-decagram" : "clock-outline"}
                                            size={26}
                                            // UI CHANGE: Primary Blue for approved, Warning Gold for others
                                            color={doc.reviewStatus === 'approved' ? COLORS.primary : COLORS.warning}
                                        />
                                        <View style={{ marginLeft: 12, flex: 1 }}>
                                            {/* DYNAMIC NAME: Uses the specific name assigned by the agent */}
                                            <Text style={styles.docNameText}>
                                                {doc.documentType || "Untitled Document"}
                                            </Text>
                                            <Text style={[
                                                styles.docStatusLabel,
                                                { color: doc.reviewStatus === 'approved' ? COLORS.primary : COLORS.warning }
                                            ]}>
                                                {doc.reviewStatus === 'approved' ? 'VERIFIED' : doc.reviewStatus.toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>

                                    {doc.reviewStatus !== 'approved' && (
                                        <TouchableOpacity
                                            style={styles.resubmitBtn}
                                            onPress={() => handleResubmit(doc.documentType)}
                                        >
                                            <Text style={styles.resubmitText}>Upload</Text>
                                            <Ionicons name="arrow-up-outline" size={12} color={COLORS.white} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 60 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textMain },
    backBtn: { width: 40, height: 40, backgroundColor: COLORS.white, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
    scrollBody: { padding: 20 },
    timelineCard: { backgroundColor: COLORS.white, borderRadius: 28, padding: 25, elevation: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 20 },
    stepContainer: { flexDirection: 'row', minHeight: 110 },
    leftCol: { alignItems: 'center', marginRight: 20 },
    iconCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#F0F4F8', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
    iconActive: { backgroundColor: COLORS.primary },
    verticalLine: { width: 2, flex: 1, backgroundColor: COLORS.line, marginVertical: -5 },
    rightCol: { flex: 1, paddingBottom: 40, paddingTop: 5 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    stepTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textMain },
    stepDesc: { fontSize: 13, color: COLORS.textLight, marginTop: 4, lineHeight: 18 },
    tapInfor: { fontSize: 11, color: COLORS.primary, fontWeight: '700', marginTop: 8 },
    pendingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.line, marginRight: 5 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, height: SCREEN_HEIGHT * 0.7 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 },
    modalTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textMain },
    modalSub: { fontSize: 13, color: COLORS.textLight },
    closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
    docDetailCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, backgroundColor: COLORS.background, borderRadius: 20, marginBottom: 15 },
    docInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    docNameText: { fontSize: 15, fontWeight: '700', color: COLORS.textMain },
    docStatusLabel: { fontSize: 10, fontWeight: '900', marginTop: 3, letterSpacing: 0.5 },
    resubmitBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 5 },
    resubmitText: { color: COLORS.white, fontSize: 12, fontWeight: '800' }
});