import React, { useState } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, 
    Image, ActivityIndicator, Alert 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../../context/AuthContext';

const COLORS = {
    primary: '#769FCD',
    bg: '#F8FAFD',
    white: '#FFFFFF',
    textBlue: '#9BB8D9',
    secondary: '#8E9AAF',
    light: '#B9D7EA',
    border: '#E0EBFF',
    gray: '#94A3B8',
    success: '#4ADE80',
    error: '#F87171',
};

export default function ResultUpload() {
    const router = useRouter();
    const { userToken } = useAuth();
    const { applicationId, courseId, agencyId } = useLocalSearchParams();

    const [image, setImage] = useState(null);
    const [uploading, setUploading] = useState(false);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
            aspect: [4, 3],
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handleCameraCapture = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        
        if (status !== 'granted') {
            Alert.alert("Permission Required", "Camera access is needed to take photos of your documents.");
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.8,
            aspect: [4, 3],
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handleNext = async () => {
        if (!image) {
            Alert.alert("Missing Document", "Please upload your mark sheets or transcripts to proceed.");
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('document', {
                uri: image,
                name: 'academic_result.jpg',
                type: 'image/jpeg',
            });
            formData.append('documentType', 'academic_results');

            const res = await fetch(`https://edu-agent-backend-nine.vercel.app/api/v1/students/application/upload/${applicationId}`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (res.ok) {
                // Navigate to next step with parameters
                router.push({
                    pathname: '/agency/selected/documentupload/ApplicationUpload',
                    params: { courseId, agencyId, applicationId }
                });
            } else {
                Alert.alert("Upload Failed", "Could not upload academic documents. Please try again.");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "An unexpected error occurred.");
        } finally {
            setUploading(false);
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
                        <View style={[styles.progressFill, { width: '50%' }]} />
                    </View>
                    <Text style={styles.progressText}>Step 2 of 4</Text>
                </View>
            </View>

            {/* Main Content */}
            <View style={styles.content}>
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>Academic Results</Text>
                    <Text style={styles.subtitle}>
                        Upload your mark sheets/certificates (or higher studies transcripts)
                    </Text>
                </View>

                {/* Upload Card */}
                <View style={styles.uploadCard}>
                    <View style={styles.uploadIconContainer}>
                        {image ? (
                            <View style={styles.previewContainer}>
                                <Image source={{ uri: image }} style={styles.previewImage} />
                                <View style={styles.previewOverlay}>
                                    <Feather name="check-circle" size={32} color={COLORS.success} />
                                </View>
                            </View>
                        ) : (
                            <>
                                <View style={styles.iconCircle}>
                                    <Ionicons name="school" size={48} color={COLORS.primary} />
                                </View>
                                <Text style={styles.uploadHint}>Supported: JPG, PNG, PDF</Text>
                                <Text style={styles.uploadSize}>Max size: 5MB</Text>
                            </>
                        )}
                    </View>

                    <View style={styles.uploadOptions}>
                        <TouchableOpacity
                            style={[styles.uploadOption, styles.galleryOption]}
                            onPress={pickImage}
                            disabled={uploading}
                        >
                            <Feather name="image" size={20} color={COLORS.primary} />
                            <Text style={styles.uploadOptionText}>Choose from Gallery</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={[styles.uploadOption, styles.cameraOption]}
                            onPress={handleCameraCapture}
                            disabled={uploading}
                        >
                            <Feather name="camera" size={20} color={COLORS.white} />
                            <Text style={[styles.uploadOptionText, styles.cameraText]}>Take Photo</Text>
                        </TouchableOpacity>
                    </View>

                    {uploading && (
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
                        <Text style={styles.requirementText}>Clear, readable text</Text>
                    </View>
                    <View style={styles.requirementItem}>
                        <Feather name="check-circle" size={16} color={COLORS.success} />
                        <Text style={styles.requirementText}>All pages included</Text>
                    </View>
                    <View style={styles.requirementItem}>
                        <Feather name="check-circle" size={16} color={COLORS.success} />
                        <Text style={styles.requirementText}>Official institution stamps visible</Text>
                    </View>
                    <View style={styles.requirementItem}>
                        <Feather name="check-circle" size={16} color={COLORS.success} />
                        <Text style={styles.requirementText}>No cropping of important information</Text>
                    </View>
                </View>
            </View>

            {/* Footer with Next Button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[
                        styles.nextButton,
                        (!image || uploading) && styles.nextButtonDisabled
                    ]}
                    onPress={handleNext}
                    disabled={!image || uploading}
                >
                    {uploading ? (
                        <ActivityIndicator color={COLORS.white} size="small" />
                    ) : (
                        <>
                            <Text style={styles.nextButtonText}>Continue</Text>
                            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
                        </>
                    )}
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