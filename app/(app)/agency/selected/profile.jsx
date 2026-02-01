import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, TextInput, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../context/AuthContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import {Config} from '../../../config'

const COLORS = {
    bg: '#F8FAFD',
    primary: '#769FCD',
    primaryLight: 'rgba(118, 159, 205, 0.1)',
    sectionTitle: '#2D3748',
    viewAll: '#718096',
    white: '#FFFFFF',
    border: '#EEF2F7',
    cardBg: '#FFFFFF',
    textPrimary: '#2D3748',
    textSecondary: '#718096',
    accent: '#E2E8F0',
    lightBlue: '#E8F1FF',
    danger: '#FF6B6B',
    dangerLight: 'rgba(255, 107, 107, 0.1)',
    success: '#4CAF50',
    warning: '#FF9800',
};

const DEFAULT_IMAGE = require('../../../../assets/images/agencies/profile_default.png');

const formatDate = (dateString) => {
    if (!dateString) return "Not Set";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function UserProfile() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // Extract agencyId - check both possible parameter names
    const agencyId = params.agencyId || params.id;

    console.log('=== PROFILE PAGE DEBUG ===');
    console.log('All params:', params);
    console.log('Params type:', typeof params);
    console.log('Params keys:', Object.keys(params));
    console.log('agencyId:', agencyId);
    console.log('=== END DEBUG ===');

    const { userToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [isModalVisible, setModalVisible] = useState(false);
    const [editField, setEditField] = useState({ name: '', value: '', key: '' });
    const [imageKey, setImageKey] = useState(Date.now());

    useEffect(() => {
        if (userToken) fetchProfile();
    }, [userToken]);

    const fetchProfile = async () => {
        try {
            const response = await fetch(`${Config.API_BASE_URL}/students/profile`, {
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const json = await response.json();

            if (response.ok) {
                setUserData(json.profile);
            }
        } catch (error) {
            console.error("Profile Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (asset) => {
        // 1. Get the correct IDs from your userData object
        const registeredAgencyId = userData?.registeredAgency; // Renamed to avoid conflict
        const studentId = userData?._id;
        console.log("registeredAgencyId", registeredAgencyId);

        // 2. Safety Check: Stop if IDs are missing to avoid 400 errors
        if (!registeredAgencyId || !studentId) {
            Alert.alert("Error", "Profile data is still loading. Please try again in a second.");
            return;
        }

        try {
            setLoading(true);

            let mimeType = asset.mimeType || 'image/jpeg';
            if (mimeType === 'image/jpg') mimeType = 'image/jpeg';

            // Step 1: Get SAS token
            const sasRes = await fetch(`${Config.API_BASE_URL}/students/uploads/sas`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    mimeType,
                    size: asset.fileSize || 0,
                    studentId: studentId,
                    documentType: 'profile_picture'
                })
            });

            if (!sasRes.ok) {
                const errorLog = await sasRes.json();
                console.error("SAS Error Details:", errorLog);
                throw new Error("SAS generation failed");
            }

            const { sasUrl, blobName } = await sasRes.json();

            // Step 2: Upload to Azure
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

            if (!azureRes.ok) throw new Error("Azure storage upload failed");

            // Step 3: Confirm upload 
            const confirmRes = await fetch(`${Config.API_BASE_URL}/students/uploads/confirm`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    blobName,
                    studentId: studentId,
                    mimeType,
                    documentType: 'profile_picture'
                })
            });

            // Step 4: Optimistic UI Update
            const newImageUrl = sasUrl.split('?')[0];

            setUserData(prev => ({
                ...prev,
                profileURL: newImageUrl
            }));
            setImageKey(Date.now());

            // Step 5: Patch the profile
            const patchRes = await fetch(`${Config.API_BASE_URL}/students/profile`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ profileURL: newImageUrl })
            });

            if (patchRes.ok) {
                Alert.alert("Success", "Profile picture updated");
            } else {
                fetchProfile();
            }

        } catch (err) {
            console.error('Upload Error:', err);
            fetchProfile();
            Alert.alert("Upload Error", "There was a problem updating your photo. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission Required", "Please allow access to your photo library");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.4,
        });

        if (!result.canceled && result.assets[0]) {
            handleUpload(result.assets[0]);
        }
    };

    const handlePatchRequest = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${Config.API_BASE_URL}/students/profile`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ [editField.key]: editField.value })
            });

            if (response.ok) {
                setModalVisible(false);
                fetchProfile();
                Alert.alert("Success", "Information updated");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Get image URL with cache busting
   const getImageUrl = () => {
    if (!userData?.profileURL) return null;
    return userData.profileURL; 
};

    const profileImageUri = getImageUrl();

    if (loading && !userData) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header with Gradient Background */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => {
                            console.log('Back button pressed, agencyId:', agencyId);
                            if (agencyId) {
                                router.push(`/agency/selected/${agencyId}`);
                            } else {
                                router.back();
                            }
                        }}
                    >
                        <Ionicons name="chevron-back" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Profile</Text>
                    <TouchableOpacity
                        style={styles.settingsButton}
                        onPress={() => {
                            if (agencyId) {
                                router.push({
                                    pathname: '/agency/selected/profile-settings',
                                    params: { agencyId }
                                });
                            } else {
                                router.push('/agency/selected/profile-settings');
                            }
                        }}
                    >
                        <Ionicons name="settings-outline" size={22} color={COLORS.white} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollBody}
            >
                {/* Profile Card with Shadow */}
                <View style={styles.profileCard}>
                    <View style={styles.profileImageContainer}>
                        <Image
                            style={styles.profileImage}
                            source={profileImageUri} // Remove the manual {uri: ...} object if using expo-image
                            placeholder={DEFAULT_IMAGE}
                            contentFit="cover"
                            transition={300} // Fades from placeholder to real image smoothly
                            cachePolicy="disk" // This is key: it keeps the image on the phone
                            onLoadStart={() => console.log('Loading started')}
                            onLoad={() => console.log('Loading finished')}
                        />
                        <TouchableOpacity
                            style={styles.cameraButton}
                            onPress={pickImage}
                        >
                            <Ionicons name="camera" size={18} color={COLORS.white} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.profileInfo}>
                        <Text style={styles.userName}>
                            {userData?.name || 'User'}
                        </Text>
                        <Text style={styles.userEmail}>
                            {userData?.email || 'user@example.com'}
                        </Text>
                    </View>
                </View>

                {/* Personal Information Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons name="person-outline" size={22} color={COLORS.primary} />
                        <Text style={styles.sectionTitle}>Personal Information</Text>
                    </View>

                    {/* Email (Read-only) */}
                    <View style={styles.infoCard}>
                        <View style={styles.infoItem}>
                            <View style={[styles.infoIcon, { backgroundColor: COLORS.primaryLight }]}>
                                <MaterialIcons name="email" size={20} color={COLORS.primary} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Email Address</Text>
                                <Text style={styles.infoValue}>{userData?.email || ''}</Text>
                            </View>
                        </View>
                        <Feather name="lock" size={18} color={COLORS.textSecondary} />
                    </View>

                    {/* Phone Number (Editable) */}
                    <TouchableOpacity
                        style={styles.infoCard}
                        onPress={() => {
                            setEditField({
                                name: "Phone Number",
                                value: userData?.phone || '',
                                key: "phone"
                            });
                            setModalVisible(true);
                        }}
                    >
                        <View style={styles.infoItem}>
                            <View style={[styles.infoIcon, { backgroundColor: COLORS.primaryLight }]}>
                                <Feather name="phone" size={20} color={COLORS.primary} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Phone Number</Text>
                                <Text style={[
                                    styles.infoValue,
                                    !userData?.phone && styles.infoValueEmpty
                                ]}>
                                    {userData?.phone || 'Add Phone'}
                                </Text>
                            </View>
                        </View>
                        <Feather name="edit-3" size={18} color={COLORS.primary} />
                    </TouchableOpacity>

                    {/* Date of Birth (Editable) */}
                    <TouchableOpacity
                        style={styles.infoCard}
                        onPress={() => {
                            const rawDate = userData?.dob ? userData.dob.split('T')[0] : '';
                            setEditField({
                                name: "Date of Birth",
                                value: rawDate,
                                key: "dob"
                            });
                            setModalVisible(true);
                        }}
                    >
                        <View style={styles.infoItem}>
                            <View style={[styles.infoIcon, { backgroundColor: COLORS.primaryLight }]}>
                                <Feather name="calendar" size={20} color={COLORS.primary} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Date of Birth</Text>
                                <Text style={[
                                    styles.infoValue,
                                    !userData?.dob && styles.infoValueEmpty
                                ]}>
                                    {formatDate(userData?.dob)}
                                </Text>
                            </View>
                        </View>
                        <Feather name="edit-3" size={18} color={COLORS.primary} />
                    </TouchableOpacity>

                    {/* Nationality (Editable) */}
                    <TouchableOpacity
                        style={styles.infoCard}
                        onPress={() => {
                            setEditField({
                                name: "Nationality",
                                value: userData?.nationality || '',
                                key: "nationality"
                            });
                            setModalVisible(true);
                        }}
                    >
                        <View style={styles.infoItem}>
                            <View style={[styles.infoIcon, { backgroundColor: COLORS.primaryLight }]}>
                                <FontAwesome5 name="flag" size={18} color={COLORS.primary} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Nationality</Text>
                                <Text style={[
                                    styles.infoValue,
                                    !userData?.nationality && styles.infoValueEmpty
                                ]}>
                                    {userData?.nationality || 'Add Nationality'}
                                </Text>
                            </View>
                        </View>
                        <Feather name="edit-3" size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Edit Modal */}
            <Modal
                visible={isModalVisible}
                transparent
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    Edit {editField.name}
                                </Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <TextInput
                                style={styles.modalInput}
                                value={editField.value}
                                onChangeText={(text) => setEditField({ ...editField, value: text })}
                                placeholder={`Enter your ${editField.name.toLowerCase()}`}
                                placeholderTextColor={COLORS.textSecondary}
                            />

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={styles.modalButtonSecondary}
                                    onPress={() => setModalVisible(false)}
                                >
                                    <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.modalButtonPrimary}
                                    onPress={handlePatchRequest}
                                >
                                    <Text style={styles.modalButtonTextPrimary}>Save Changes</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Header with Gradient
    header: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 20,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        elevation: 4,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
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
    settingsButton: {
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
    // Scroll Body
    scrollBody: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: 20,
    },
    // Profile Card
    profileCard: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    profileImageContainer: {
        position: 'relative',
        marginBottom: 20,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: COLORS.lightBlue,
        borderWidth: 4,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    cameraButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: COLORS.white,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    profileInfo: {
        alignItems: 'center',
    },
    userName: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 15,
        color: COLORS.textSecondary,
        marginBottom: 8,
    },
    // Section
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginLeft: 10,
    },
    // Info Cards
    infoCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    infoIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginBottom: 2,
        letterSpacing: 0.3,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    infoValueEmpty: {
        color: COLORS.textSecondary,
        fontStyle: 'italic',
        fontWeight: '400',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        width: '100%',
        maxWidth: 400,
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 0,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    modalInput: {
        backgroundColor: COLORS.bg,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        margin: 24,
        marginTop: 16,
        color: COLORS.textPrimary,
    },
    modalButtons: {
        flexDirection: 'row',
        padding: 24,
        paddingTop: 8,
        gap: 12,
    },
    modalButtonSecondary: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    modalButtonPrimary: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
    },
    modalButtonTextSecondary: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    modalButtonTextPrimary: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.white,
    },
});