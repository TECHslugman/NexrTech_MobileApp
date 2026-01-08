import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
    ActivityIndicator, Alert, TextInput, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'expo-router';

const COLORS = {
    bg: '#F8FAFD',
    primary: '#769FCD',
    sectionTitle: '#2D3748',
    viewAll: '#718096',
    white: '#FFFFFF',
    border: '#EEF2F7',
    cardBg: '#FFFFFF',
    textPrimary: '#2D3748',
    textSecondary: '#718096',
    accent: '#E2E8F0',
    lightBlue: '#E8F1FF',
    danger: '#FF6B6B'
};

const DEFAULT_IMAGE = require('../../../../assets/images/agencies/default.png');
const BASE_URL = 'https://edu-agent-backend-nine.vercel.app/api/v1/students';

const formatDate = (dateString) => {
    if (!dateString) return "Not Set";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; 
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function UserProfile() {
    const router = useRouter();
    const { userToken, signOut } = useAuth(); 
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
            const response = await fetch(`${BASE_URL}/profile`, {
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
        try {
            setLoading(true);
            
            let mimeType = asset.mimeType || 'image/jpeg';
            if (mimeType === 'image/jpg') mimeType = 'image/jpeg';

            // Step 1: Get SAS token
            const sasRes = await fetch(`${BASE_URL}/uploads/sas`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${userToken}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    mimeType, 
                    size: asset.fileSize || 0 
                })
            });

            if (!sasRes.ok) {
                const errorText = await sasRes.text();
                throw new Error(`SAS generation failed: ${errorText}`);
            }
            
            const sasData = await sasRes.json();
            const { sasUrl, blobName } = sasData;

            // Extract the base URL without SAS token query parameters
            const urlParts = sasUrl.split('?');
            const newImageUrl = urlParts[0]; // This is your new image URL

            // Step 2: Upload to Azure Blob Storage
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

            if (!azureRes.ok) {
                throw new Error("Azure storage upload failed");
            }

            // Step 3: Confirm upload with backend
            const confirmRes = await fetch(`${BASE_URL}/uploads/confirm`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${userToken}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    blobName, 
                    studentId: userData?._id 
                })
            });

            if (!confirmRes.ok) {
                throw new Error("Failed to confirm upload");
            }

            // Step 4: CRITICAL - Update profile with new image URL
            const patchRes = await fetch(`${BASE_URL}/profile`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${userToken}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    profilePicture: newImageUrl 
                })
            });
            
            if (patchRes.ok) {
                // Update local state with new URL
                setUserData(prevData => ({
                    ...prevData,
                    profilePicture: newImageUrl,
                    updatedAt: new Date().toISOString()
                }));
                
                // Force image re-render
                setImageKey(Date.now());
                
                Alert.alert("Success", "Profile picture updated successfully");
                
                // Optional: Fetch fresh profile data to ensure sync
                setTimeout(() => {
                    fetchProfile();
                }, 500);
            } else {
                const errorText = await patchRes.text();
                throw new Error(`Failed to update profile: ${errorText}`);
            }
            
        } catch (err) {
            console.error('Upload Error Details:', err);
            Alert.alert("Upload Error", err.message || "Could not update profile picture.");
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
            quality: 0.8,
        });
        
        if (!result.canceled && result.assets[0]) {
            handleUpload(result.assets[0]);
        }
    };

    const handlePatchRequest = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${BASE_URL}/profile`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${userToken}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    [editField.key]: editField.value 
                })
            });
            
            if (response.ok) {
                const json = await response.json();
                setUserData(json.profile);
                setModalVisible(false);
                Alert.alert("Success", "Profile updated successfully");
            } else {
                const errorText = await response.text();
                Alert.alert("Error", "Failed to update profile");
            }
        } catch (error) {
            Alert.alert("Error", "Failed to update profile data.");
        } finally { 
            setLoading(false); 
        }
    };

    // Get image URL with cache busting
    const getImageUrl = () => {
        if (userData?.profilePicture) {
            const url = userData.profilePicture;
            const hasQuery = url.includes('?');
            return hasQuery 
                ? `${url}&t=${imageKey}`
                : `${url}?t=${imageKey}`;
        }
        return null;
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
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Profile</Text>
                    <View style={{ width: 44 }} />
                </View>
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.scrollBody}
            >
                {/* Profile Header Card */}
                <View style={styles.profileHeaderCard}>
                    <View style={styles.profileImageContainer}>
                        <Image 
                            key={imageKey}
                            source={profileImageUri ? { uri: profileImageUri } : DEFAULT_IMAGE} 
                            style={styles.profileImage}
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
                    <Text style={styles.sectionTitle}>Personal Information</Text>
                    
                    {/* Email (Read-only) */}
                    <View style={styles.infoCard}>
                        <View style={styles.infoItem}>
                            <View style={styles.infoIcon}>
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
                            <View style={styles.infoIcon}>
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
                            <View style={styles.infoIcon}>
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
                            <View style={styles.infoIcon}>
                                <Ionicons name="flag" size={20} color={COLORS.primary} />
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

                {/* Account Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    
                    <TouchableOpacity 
                        style={[styles.actionCard, styles.logoutCard]}
                        onPress={() => signOut()}
                    >
                        <View style={styles.actionContent}>
                            <View style={[styles.actionIcon, { backgroundColor: 'rgba(255, 107, 107, 0.1)' }]}>
                                <Feather name="log-out" size={20} color={COLORS.danger} />
                            </View>
                            <View style={styles.actionText}>
                                <Text style={styles.actionTitle}>Log Out</Text>
                                <Text style={styles.actionSubtitle}>Sign out from this device</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                </View>

                <View style={{ height: 100 }} />
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
                            <Text style={styles.modalTitle}>
                                Edit {editField.name}
                            </Text>
                            
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
        backgroundColor: COLORS.bg 
    },
    center: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    // Header
    header: {
        backgroundColor: COLORS.bg,
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.primary,
    },
    // Scroll Body
    scrollBody: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    // Profile Header Card
    profileHeaderCard: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 24,
        marginTop: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
    },
    profileImageContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.lightBlue,
    },
    cameraButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: COLORS.white,
    },
    profileInfo: {
        alignItems: 'center',
    },
    userName: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    // Section
    section: {
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 16,
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
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    infoIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(118, 159, 205, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.textPrimary,
    },
    infoValueEmpty: {
        color: COLORS.textSecondary,
        fontStyle: 'italic',
    },
    // Action Cards
    actionCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    actionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    actionIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    actionText: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    actionSubtitle: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    logoutCard: {
        borderColor: 'rgba(255, 107, 107, 0.2)',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '90%',
        maxWidth: 400,
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 20,
        textAlign: 'center',
    },
    modalInput: {
        backgroundColor: COLORS.bg,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 24,
        color: COLORS.textPrimary,
    },
    modalButtons: {
        flexDirection: 'row',
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