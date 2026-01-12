import React, { useState, useEffect } from 'react';
import {
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    ActivityIndicator, 
    Alert, 
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../../context/AuthContext';
import { useRouter, useLocalSearchParams } from 'expo-router';

const COLORS = {
    bg: '#F8FBFF',
    primary: '#769FCD',
    secondary: '#8E9AAF',
    light: '#B9D7EA',
    white: '#FFFFFF',
    border: '#E0EBFF',
    gray: '#94A3B8',
    success: '#4ADE80',
    error: '#F87171',
};

const BASE_URL = 'https://edu-agent-backend-nine.vercel.app/api/v1/students';

export default function PassportUpload() {
    const params = useLocalSearchParams();
    const { courseId, agencyId } = params; 
    const router = useRouter();
    const { userToken } = useAuth();

    const [loading, setLoading] = useState(false);
    const [userData, setUserData] = useState(null);
    const [passportImage, setPassportImage] = useState(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await fetch(`${BASE_URL}/profile`, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });
            const json = await response.json();
            if (response.ok) setUserData(json.profile);
        } catch (error) {
            console.error("Profile Fetch Error:", error);
        }
    };

    const handleUpload = async (asset) => {
        const studentId = userData?._id;
        const activeAgencyId = agencyId || userData?.registeredAgency;

        if (!activeAgencyId || !studentId) {
            Alert.alert("Notice", "Preparing session details. Please try again in a moment.");
            fetchProfile();
            return;
        }

        try {
            setLoading(true);
            let mimeType = asset.mimeType || 'image/jpeg';

            const sasRes = await fetch(`${BASE_URL}/uploads/sas`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    mimeType,
                    size: asset.fileSize || 0,
                    agencyId: activeAgencyId,
                    studentId
                })
            });

            if (!sasRes.ok) throw new Error("Could not initialize upload server.");
            const { sasUrl, blobName } = await sasRes.json();

            const blobRes = await fetch(asset.uri);
            const blob = await blobRes.blob();

            const azureRes = await fetch(sasUrl, {
                method: 'PUT',
                body: blob,
                headers: {
                    'x-ms-blob-type': 'BlockBlob',
                    'Content-Type': mimeType
                }
            });

            if (!azureRes.ok) throw new Error("File transfer to storage failed.");

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
                    courseId: courseId, 
                    mimeType,
                    documentType: 'passport'
                })
            });

            if (confirmRes.ok) {
                setPassportImage(asset.uri);
                Alert.alert("Success", "Passport document secured successfully.");
            } else {
                throw new Error("Failed to save document reference.");
            }

        } catch (err) {
            Alert.alert("Upload Error", err.message);
        } finally {
            setLoading(false);
        }
    };

    const pickDocument = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
            aspect: [3.5, 4.5],
        });

        if (!result.canceled && result.assets[0]) {
            handleUpload(result.assets[0]);
        }
    };

    const handleCameraCapture = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        
        if (status !== 'granted') {
            Alert.alert("Permission Required", "Camera access is needed to take passport photos.");
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.8,
            aspect: [3.5, 4.5],
        });

        if (!result.canceled && result.assets[0]) {
            handleUpload(result.assets[0]);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header with Progress Indicator */}
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="chevron-back" size={28} color={COLORS.primary} />
                </TouchableOpacity>
                
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: '25%' }]} />
                    </View>
                    <Text style={styles.progressText}>Step 1 of 4</Text>
                </View>
            </View>

            {/* Main Content */}
            <View style={styles.content}>
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>Passport Upload</Text>
                    <Text style={styles.subtitle}>
                        Please upload your passport (front & back) and a passport-size photo.
                    </Text>
                </View>

                {/* Upload Card */}
                <View style={styles.uploadCard}>
                    <View style={styles.uploadIconContainer}>
                        {passportImage ? (
                            <View style={styles.previewContainer}>
                                <Image source={{ uri: passportImage }} style={styles.previewImage} />
                                <View style={styles.previewOverlay}>
                                    <Feather name="check-circle" size={32} color={COLORS.success} />
                                </View>
                            </View>
                        ) : (
                            <>
                                <View style={styles.iconCircle}>
                                    <Ionicons name="document-attach" size={48} color={COLORS.primary} />
                                </View>
                                <Text style={styles.uploadHint}>Supported: JPG, PNG, PDF</Text>
                                <Text style={styles.uploadSize}>Max size: 5MB</Text>
                            </>
                        )}
                    </View>

                    <View style={styles.uploadOptions}>
                        <TouchableOpacity
                            style={[styles.uploadOption, styles.galleryOption]}
                            onPress={pickDocument}
                            disabled={loading}
                        >
                            <Feather name="image" size={20} color={COLORS.primary} />
                            <Text style={styles.uploadOptionText}>Choose from Gallery</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={[styles.uploadOption, styles.cameraOption]}
                            onPress={handleCameraCapture}
                            disabled={loading}
                        >
                            <Feather name="camera" size={20} color={COLORS.white} />
                            <Text style={[styles.uploadOptionText, styles.cameraText]}>Take Photo</Text>
                        </TouchableOpacity>
                    </View>

                    {loading && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color={COLORS.primary} />
                            <Text style={styles.loadingText}>Uploading document...</Text>
                        </View>
                    )}
                </View>

                {/* Requirements Card */}
                <View style={styles.requirementsCard}>
                    <Text style={styles.requirementsTitle}>Requirements</Text>
                    <View style={styles.requirementItem}>
                        <Feather name="check-circle" size={16} color={COLORS.success} />
                        <Text style={styles.requirementText}>Clear, well-lit photo</Text>
                    </View>
                    <View style={styles.requirementItem}>
                        <Feather name="check-circle" size={16} color={COLORS.success} />
                        <Text style={styles.requirementText}>All corners visible</Text>
                    </View>
                    <View style={styles.requirementItem}>
                        <Feather name="check-circle" size={16} color={COLORS.success} />
                        <Text style={styles.requirementText}>No glare or shadows</Text>
                    </View>
                </View>
            </View>

            {/* Footer with Next Button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[
                        styles.nextButton,
                        (!passportImage || loading) && styles.nextButtonDisabled
                    ]}
                    onPress={() => {
                        router.push({
                            pathname: '/agency/selected/documentupload/ResultsUpload',
                            params: { courseId, agencyId }
                        });
                    }}
                    disabled={!passportImage || loading}
                >
                    <Text style={styles.nextButtonText}>Continue</Text>
                    <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: COLORS.bg,
        paddingHorizontal: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 16,
        paddingBottom: 24,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: COLORS.white,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    progressContainer: {
        flex: 1,
        marginLeft: 16,
    },
    progressBar: {
        height: 6,
        backgroundColor: COLORS.border,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 3,
    },
    progressText: {
        fontSize: 14,
        color: COLORS.secondary,
        fontWeight: '500',
    },
    content: {
        flex: 1,
    },
    titleContainer: {
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.primary,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.secondary,
        lineHeight: 22,
    },
    uploadCard: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 24,
        marginBottom: 24,
        shadowColor: '#769FCD',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    uploadIconContainer: {
        alignItems: 'center',
        paddingVertical: 32,
        borderWidth: 2,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
        borderRadius: 16,
        marginBottom: 24,
        backgroundColor: COLORS.bg,
    },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: COLORS.bg,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 2,
        borderColor: COLORS.border,
    },
    uploadHint: {
        fontSize: 14,
        color: COLORS.secondary,
        marginTop: 8,
    },
    uploadSize: {
        fontSize: 12,
        color: COLORS.gray,
        marginTop: 4,
    },
    previewContainer: {
        width: '100%',
        height: 200,
        position: 'relative',
    },
    previewImage: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
        resizeMode: 'cover',
    },
    previewOverlay: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 20,
        padding: 4,
    },
    uploadOptions: {
        flexDirection: 'row',
        gap: 12,
    },
    uploadOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 12,
        gap: 8,
    },
    galleryOption: {
        backgroundColor: COLORS.bg,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cameraOption: {
        backgroundColor: COLORS.primary,
    },
    uploadOptionText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.primary,
    },
    cameraText: {
        color: COLORS.white,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: COLORS.secondary,
    },
    requirementsCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 20,
        shadowColor: '#769FCD',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    requirementsTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.primary,
        marginBottom: 16,
    },
    requirementItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    requirementText: {
        fontSize: 14,
        color: COLORS.secondary,
        flex: 1,
    },
    footer: {
        paddingVertical: 24,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: 18,
        borderRadius: 14,
        gap: 8,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    nextButtonDisabled: {
        backgroundColor: COLORS.gray,
        shadowOpacity: 0,
    },
    nextButtonText: {
        fontSize: 17,
        fontWeight: '600',
        color: COLORS.white,
        letterSpacing: 0.5,
    },
});