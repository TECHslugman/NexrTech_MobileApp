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

const formatYearRange = (startYear, endYear) => {
    if (!startYear) return "Not Set";
    if (!endYear) return `${startYear} - Present`;
    return `${startYear} - ${endYear}`;
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
    const [isEducationModalVisible, setEducationModalVisible] = useState(false);
    const [editField, setEditField] = useState({ name: '', value: '', key: '' });
    const [imageKey, setImageKey] = useState(Date.now());
    
    // Education form state
    const [educationForm, setEducationForm] = useState({
        institution: '',
        degree: '',
        fieldOfStudy: '',
        startYear: '',
        endYear: '',
        grade: '',
        isEditing: false,
        editIndex: null
    });

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
            console.log("Profile Fetch Response:", json);

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
                    documentType: 'profile'
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
                    size: asset.fileSize || 0,
                    mimeType,
                    documentType: 'profile'
                })
    
            });

            // Step 4: Optimistic UI Update
            const newImageUrl = sasUrl.split('?')[0];

            setUserData(prev => ({
                ...prev,
                profile: newImageUrl
            }));
            setImageKey(Date.now());

            // Step 5: Patch the profile
            const patchRes = await fetch(`${Config.API_BASE_URL}/students/profile`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ profile: newImageUrl })
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

    // Education CRUD Operations
    const handleAddEducation = () => {
        setEducationForm({
            institution: '',
            degree: '',
            fieldOfStudy: '',
            startYear: '',
            endYear: '',
            grade: '',
            isEditing: false,
            editIndex: null
        });
        setEducationModalVisible(true);
    };

    const handleEditEducation = (education, index) => {
        setEducationForm({
            institution: education.institution || '',
            degree: education.degree || '',
            fieldOfStudy: education.fieldOfStudy || '',
            startYear: education.startYear?.toString() || '',
            endYear: education.endYear?.toString() || '',
            grade: education.grade || '',
            isEditing: true,
            editIndex: index
        });
        setEducationModalVisible(true);
    };

    const handleSaveEducation = async () => {
        // Validate required fields
        if (!educationForm.institution || !educationForm.degree) {
            Alert.alert("Validation Error", "Please fill in institution and degree");
            return;
        }

        try {
            setLoading(true);
            
            let updatedEducation = [...(userData?.education || [])];
            
            const educationEntry = {
                institution: educationForm.institution,
                degree: educationForm.degree,
                fieldOfStudy: educationForm.fieldOfStudy,
                startYear: educationForm.startYear ? parseInt(educationForm.startYear) : null,
                endYear: educationForm.endYear ? parseInt(educationForm.endYear) : null,
                grade: educationForm.grade
            };

            if (educationForm.isEditing) {
                // Update existing education
                updatedEducation[educationForm.editIndex] = educationEntry;
            } else {
                // Add new education
                updatedEducation.push(educationEntry);
            }

            const response = await fetch(`${Config.API_BASE_URL}/students/profile`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ education: updatedEducation })
            });

            if (response.ok) {
                setEducationModalVisible(false);
                fetchProfile();
                Alert.alert("Success", educationForm.isEditing ? "Education updated" : "Education added");
            } else {
                Alert.alert("Error", "Failed to save education");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "An error occurred while saving education");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteEducation = async (index) => {
        Alert.alert(
            "Delete Education",
            "Are you sure you want to delete this education entry?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            let updatedEducation = [...(userData?.education || [])];
                            updatedEducation.splice(index, 1);

                            const response = await fetch(`${Config.API_BASE_URL}/students/profile`, {
                                method: 'PATCH',
                                headers: {
                                    'Authorization': `Bearer ${userToken}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ education: updatedEducation })
                            });

                            if (response.ok) {
                                fetchProfile();
                                Alert.alert("Success", "Education deleted");
                            }
                        } catch (error) {
                            console.error(error);
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // Get image URL with cache busting
   const getImageUrl = () => {
    if (!userData?.profile) return null;
    return userData.profile; 
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
                            source={profileImageUri}
                            placeholder={DEFAULT_IMAGE}
                            contentFit="cover"
                            transition={300}
                            cachePolicy="disk"
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

                {/* Education Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="school-outline" size={22} color={COLORS.primary} />
                        <Text style={styles.sectionTitle}>Education</Text>
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={handleAddEducation}
                        >
                            <Ionicons name="add-circle" size={24} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>

                    {userData?.education && userData.education.length > 0 ? (
                        userData.education.map((edu, index) => (
                            <View key={index} style={styles.educationCard}>
                                <View style={styles.educationHeader}>
                                    <View style={[styles.educationIcon, { backgroundColor: COLORS.primaryLight }]}>
                                        <FontAwesome5 name="graduation-cap" size={20} color={COLORS.primary} />
                                    </View>
                                    <View style={styles.educationContent}>
                                        <Text style={styles.educationDegree}>{edu.degree}</Text>
                                        <Text style={styles.educationInstitution}>{edu.institution}</Text>
                                        {edu.fieldOfStudy && (
                                            <Text style={styles.educationField}>{edu.fieldOfStudy}</Text>
                                        )}
                                        <View style={styles.educationMeta}>
                                            <Feather name="calendar" size={12} color={COLORS.textSecondary} />
                                            <Text style={styles.educationYear}>
                                                {formatYearRange(edu.startYear, edu.endYear)}
                                            </Text>
                                            {edu.grade && (
                                                <>
                                                    <View style={styles.educationDot} />
                                                    <Text style={styles.educationGrade}>Grade: {edu.grade}</Text>
                                                </>
                                            )}
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.educationActions}>
                                    <TouchableOpacity
                                        style={styles.educationActionButton}
                                        onPress={() => handleEditEducation(edu, index)}
                                    >
                                        <Feather name="edit-2" size={16} color={COLORS.primary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.educationActionButton, styles.deleteButton]}
                                        onPress={() => handleDeleteEducation(index)}
                                    >
                                        <Feather name="trash-2" size={16} color={COLORS.danger} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <Ionicons name="school-outline" size={48} color={COLORS.textSecondary} />
                            <Text style={styles.emptyStateText}>No education added yet</Text>
                            <Text style={styles.emptyStateSubtext}>
                                Tap the + button to add your educational background
                            </Text>
                        </View>
                    )}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Edit Modal for Basic Info */}
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

            {/* Education Modal */}
            <Modal
                visible={isEducationModalVisible}
                transparent
                animationType="slide"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    {educationForm.isEditing ? 'Edit Education' : 'Add Education'}
                                </Text>
                                <TouchableOpacity onPress={() => setEducationModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.educationFormScroll}>
                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Institution Name *</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        value={educationForm.institution}
                                        onChangeText={(text) => setEducationForm({ ...educationForm, institution: text })}
                                        placeholder="e.g., Harvard University"
                                        placeholderTextColor={COLORS.textSecondary}
                                    />
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Degree *</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        value={educationForm.degree}
                                        onChangeText={(text) => setEducationForm({ ...educationForm, degree: text })}
                                        placeholder="e.g., Bachelor's, Master's, PhD"
                                        placeholderTextColor={COLORS.textSecondary}
                                    />
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Field of Study</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        value={educationForm.fieldOfStudy}
                                        onChangeText={(text) => setEducationForm({ ...educationForm, fieldOfStudy: text })}
                                        placeholder="e.g., Computer Science"
                                        placeholderTextColor={COLORS.textSecondary}
                                    />
                                </View>

                                <View style={styles.formRow}>
                                    <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                                        <Text style={styles.formLabel}>Start Year</Text>
                                        <TextInput
                                            style={styles.modalInput}
                                            value={educationForm.startYear}
                                            onChangeText={(text) => setEducationForm({ ...educationForm, startYear: text })}
                                            placeholder="2020"
                                            keyboardType="numeric"
                                            placeholderTextColor={COLORS.textSecondary}
                                        />
                                    </View>

                                    <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                                        <Text style={styles.formLabel}>End Year</Text>
                                        <TextInput
                                            style={styles.modalInput}
                                            value={educationForm.endYear}
                                            onChangeText={(text) => setEducationForm({ ...educationForm, endYear: text })}
                                            placeholder="2024"
                                            keyboardType="numeric"
                                            placeholderTextColor={COLORS.textSecondary}
                                        />
                                    </View>
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Grade/GPA</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        value={educationForm.grade}
                                        onChangeText={(text) => setEducationForm({ ...educationForm, grade: text })}
                                        placeholder="e.g., 3.8 GPA, First Class"
                                        placeholderTextColor={COLORS.textSecondary}
                                    />
                                </View>
                            </ScrollView>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={styles.modalButtonSecondary}
                                    onPress={() => setEducationModalVisible(false)}
                                >
                                    <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.modalButtonPrimary}
                                    onPress={handleSaveEducation}
                                >
                                    <Text style={styles.modalButtonTextPrimary}>
                                        {educationForm.isEditing ? 'Update' : 'Add'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Loading Overlay */}
            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            )}
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
        flex: 1,
    },
    addButton: {
        padding: 4,
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
    // Education Cards
    educationCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
    },
    educationHeader: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    educationIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    educationContent: {
        flex: 1,
    },
    educationDegree: {
        fontSize: 17,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    educationInstitution: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.primary,
        marginBottom: 4,
    },
    educationField: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 6,
    },
    educationMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    educationYear: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginLeft: 6,
    },
    educationDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.textSecondary,
        marginHorizontal: 8,
    },
    educationGrade: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    educationActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    educationActionButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButton: {
        backgroundColor: COLORS.dangerLight,
    },
    // Empty State
    emptyState: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 40,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
    },
    emptyStateText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
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
        maxHeight: '80%',
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
        marginHorizontal: 24,
        marginVertical: 8,
        color: COLORS.textPrimary,
    },
    modalButtons: {
        flexDirection: 'row',
        padding: 24,
        paddingTop: 16,
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
    // Education Form
    educationFormScroll: {
        maxHeight: 400,
    },
    formGroup: {
        marginBottom: 8,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginLeft: 24,
        marginBottom: 4,
    },
    formRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
    },
    // Loading Overlay
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});