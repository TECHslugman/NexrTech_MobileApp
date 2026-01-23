import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Alert, Image, ScrollView, Dimensions, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker'; // Added this
import { useAuth } from '../../../../context/AuthContext';
import { useRouter, useLocalSearchParams } from 'expo-router';

const { width } = Dimensions.get('window');

const COLORS = {
    bg: '#F8FBFF',
    primary: '#769FCD',
    secondary: '#8E9AAF',
    white: '#FFFFFF',
    border: '#E0EBFF',
    success: '#4ADE80',
    gray: '#94A3B8',
    textDark: '#2D3748'
};

const BASE_URL = 'https://edu-agent-backend-nine.vercel.app/api/v1/students';

const DOCUMENT_STEPS = [
    { id: 'passport', label: 'Passport', sub: 'Applicant & dependents (12mo validity)', type: 'passport', required: true },
    { id: 'academics', label: 'Academic Documents', sub: 'Year 10, 12, Diploma, Degree Transcripts', type: 'academic_results', required: true },
    { id: 'change_course', label: 'Latest Transcript', sub: 'If changing course or institute', type: 'latest_transcript', required: false },
    { id: 'english', label: 'English Competency', sub: 'IELTS/PTE/TOEFL Certificate', type: 'english_test', required: true },
    { id: 'cv', label: 'CV / Resume', sub: 'Applicant and Spouse CVs', type: 'cv', required: true },
    { id: 'marriage', label: 'Marriage Certificate', sub: 'If applicable', type: 'marriage_cert', required: false },
    { id: 'sop', label: 'Statement of Purpose', sub: 'Your SOP document', type: 'sop', required: true },
    { id: 'employment', label: 'Employer Statements', sub: 'Previous employment/Promotion orders', type: 'employment_proof', required: false },
    { id: 'lor', label: 'Letter of Recommendation', sub: 'Recommendation from Employer', type: 'lor', required: false },
    { id: 'study_leave', label: 'Study Leave Letter', sub: 'Job security/Return offer letter', type: 'study_leave', required: false },
    { id: 'spouse_qual', label: 'Spouse Qualification', sub: 'Highest Qualification of Spouse', type: 'spouse_docs', required: false },
    { id: 'visa_history', label: 'Visa History', sub: 'Previous grants or refusals', type: 'visa_history', required: false },
    { id: 'financial', label: 'Financial Documents', sub: 'Bank statements, Sponsorship letters', type: 'bank_statement', required: true },
];

export default function DynamicDocumentUpload() {
    const { courseId, agencyId } = useLocalSearchParams();
    const router = useRouter();
    const { userToken } = useAuth();

    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [userData, setUserData] = useState(null);
    const [uploadedDocs, setUploadedDocs] = useState({});

    const activeDoc = DOCUMENT_STEPS[currentStep];

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await fetch(`${BASE_URL}/profile`, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });
            const json = await res.json();
            if (res.ok) setUserData(json.profile);
        } catch (e) {
            console.error("Profile Load Error", e);
        }
    };

    const handleUpload = async (asset) => {
        const studentId = userData?._id;
        const activeAgencyId = agencyId || userData?.registeredAgency;

        if (!studentId || !activeAgencyId) {
            Alert.alert("Initializing", "Please wait for your session to load...");
            fetchProfile();
            return;
        }

        try {
            setLoading(true);
            const mimeType = asset.mimeType || asset.type || 'application/pdf';
            const fileSize = asset.fileSize || asset.size || 0;
            const uri = asset.uri;

            const sasRes = await fetch(`${BASE_URL}/uploads/sas`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    mimeType,
                    size: fileSize,
                    agencyId: activeAgencyId,
                    studentId,
                    documentType: activeDoc.type
                })
            });

            if (!sasRes.ok) throw new Error("Failed to get upload link.");
            const { sasUrl, blobName } = await sasRes.json();

            const blobRes = await fetch(uri);
            const blob = await blobRes.blob();
            const azureRes = await fetch(sasUrl, {
                method: 'PUT',
                body: blob,
                headers: {
                    'x-ms-blob-type': 'BlockBlob',
                    'Content-Type': mimeType
                }
            });

            if (!azureRes.ok) throw new Error("Cloud storage upload failed.");

            const confirmRes = await fetch(`${BASE_URL}/uploads/confirm`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    blobName,
                    studentId,
                    agencyId: activeAgencyId,
                    courseId: courseId || null, 
                    mimeType,
                    size: fileSize,
                    documentType: activeDoc.type
                })
            });

            if (confirmRes.ok) {
                // We store both URI and type so the UI knows if it should show an image or a PDF icon
                setUploadedDocs(prev => ({ 
                    ...prev, 
                    [activeDoc.id]: { uri: uri, type: mimeType } 
                }));
                Alert.alert("Success", `${activeDoc.label} uploaded.`);
            } else {
                throw new Error("Failed to link document.");
            }
        } catch (err) {
            Alert.alert("Upload Error", err.message);
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async (useCamera = false) => {
        const options = {
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.7,
        };
        const result = useCamera
            ? await ImagePicker.launchCameraAsync(options)
            : await ImagePicker.launchImageLibraryAsync(options);

        if (!result.canceled && result.assets[0]) {
            handleUpload(result.assets[0]);
        }
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });
            if (!result.canceled && result.assets[0]) {
                handleUpload(result.assets[0]);
            }
        } catch (err) {
            Alert.alert("Error", "Could not access files.");
        }
    };

    const nextStep = () => {
        if (activeDoc.required && !uploadedDocs[activeDoc.id]) {
            Alert.alert("Required", `Please upload the ${activeDoc.label} to continue.`);
            return;
        }

        if (currentStep < DOCUMENT_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            Alert.alert("Done", "All documents submitted successfully!", [
                { text: "OK", onPress: () => router.back() } 
            ]);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => (currentStep > 0 ? setCurrentStep(currentStep - 1) : router.back())} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <View style={styles.progressContainer}>
                    <Text style={styles.progressText}>Step {currentStep + 1} of 13</Text>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${((currentStep + 1) / 13) * 100}%` }]} />
                    </View>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.instructionBox}>
                    <Text style={styles.docTitle}>{activeDoc.label}</Text>
                    <Text style={styles.docSub}>{activeDoc.sub}</Text>
                    <View style={[styles.badge, activeDoc.required ? styles.reqBadge : styles.optBadge]}>
                        <Text style={[styles.badgeText, { color: activeDoc.required ? '#EF4444' : COLORS.success }]}>
                            {activeDoc.required ? 'REQUIRED' : 'OPTIONAL'}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.uploadCard, uploadedDocs[activeDoc.id] && styles.successCard]}
                    onPress={pickDocument}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    ) : uploadedDocs[activeDoc.id] ? (
                        <View style={styles.previewBox}>
                            {uploadedDocs[activeDoc.id].type?.includes('pdf') ? (
                                <View style={styles.pdfIconContainer}>
                                    <MaterialCommunityIcons name="file-pdf-box" size={80} color="#EF4444" />
                                    <Text style={{color: COLORS.gray}}>PDF Selected</Text>
                                </View>
                            ) : (
                                <Image source={{ uri: uploadedDocs[activeDoc.id].uri }} style={styles.previewImage} />
                            )}
                            <View style={styles.overlay}>
                                <Ionicons name="checkmark-circle" size={60} color={COLORS.success} />
                            </View>
                        </View>
                    ) : (
                        <View style={styles.placeholderBox}>
                            <MaterialCommunityIcons name="cloud-upload-outline" size={80} color={COLORS.primary} />
                            <Text style={styles.uploadMainText}>Tap to Browse Files</Text>
                            <Text style={styles.uploadSubText}>Images or PDF (Max 5MB)</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => pickImage(true)}>
                        <Feather name="camera" size={20} color={COLORS.primary} />
                        <Text style={styles.actionText}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={pickDocument}>
                        <Feather name="file-text" size={20} color={COLORS.primary} />
                        <Text style={styles.actionText}>PDF Files</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Guidelines</Text>
                    <View style={styles.infoItem}>
                        <Feather name="check" size={14} color={COLORS.success} />
                        <Text style={styles.infoText}>Documents must be clear and legible</Text>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.nextButton, (!uploadedDocs[activeDoc.id] && activeDoc.required) && styles.disabledButton]}
                    onPress={nextStep}
                >
                    <Text style={styles.nextButtonText}>
                        {uploadedDocs[activeDoc.id] || !activeDoc.required ? 'CONTINUE' : 'UPLOAD TO PROCEED'}
                    </Text>
                    <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
    backButton: { width: 45, height: 45, backgroundColor: COLORS.white, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 2 },
    progressContainer: { flex: 1, marginLeft: 15 },
    progressText: { fontSize: 12, fontWeight: '700', color: COLORS.secondary, marginBottom: 5 },
    progressBar: { height: 6, backgroundColor: COLORS.border, borderRadius: 3 },
    progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 30 },
    instructionBox: { alignItems: 'center', marginVertical: 30 },
    docTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textDark, textAlign: 'center' },
    docSub: { fontSize: 14, color: COLORS.secondary, textAlign: 'center', marginTop: 8 },
    badge: { marginTop: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
    reqBadge: { backgroundColor: '#FEE2E2' },
    optBadge: { backgroundColor: '#F0FDF4' },
    badgeText: { fontSize: 10, fontWeight: '900' },
    uploadCard: {
        height: 280, backgroundColor: COLORS.white, borderRadius: 24, borderWidth: 2,
        borderColor: COLORS.primary, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', elevation: 4
    },
    successCard: { borderStyle: 'solid', borderColor: COLORS.success },
    placeholderBox: { alignItems: 'center' },
    uploadMainText: { fontSize: 18, fontWeight: '700', color: COLORS.primary, marginTop: 15 },
    uploadSubText: { fontSize: 12, color: COLORS.gray, marginTop: 5 },
    previewBox: { width: '100%', height: '100%' },
    pdfIconContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    previewImage: { width: '100%', height: '100%', opacity: 0.5 },
    overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    actionRow: { flexDirection: 'row', justifyContent: 'center', gap: 15, marginTop: 20 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
    actionText: { color: COLORS.primary, fontWeight: '600' },
    infoCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginTop: 30, borderWidth: 1, borderColor: COLORS.border },
    infoTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textDark, marginBottom: 12 },
    infoItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    infoText: { fontSize: 13, color: COLORS.secondary },
    footer: { padding: 20, backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.border },
    nextButton: { backgroundColor: COLORS.primary, height: 60, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    disabledButton: { backgroundColor: COLORS.gray },
    nextButtonText: { color: COLORS.white, fontWeight: '700', fontSize: 16 }
});