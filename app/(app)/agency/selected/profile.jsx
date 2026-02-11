import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, TextInput, Modal, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../../context/AuthContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Config } from '../../../config';

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
    const agencyId = params.agencyId || params.id;
    const { userToken } = useAuth();

    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [isModalVisible, setModalVisible] = useState(false);
    const [isEducationModalVisible, setEducationModalVisible] = useState(false);
    const [editField, setEditField] = useState({ name: '', value: '', key: '' });

    // Date picker state
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());

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
            if (response.ok) {
                setUserData(json.profile);
            }
            console.log(response.ok ? "✅ Profile fetched successfully" : "❌ Failed to fetch profile", json);
        } catch (error) {
            console.error("Profile Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (asset) => {
        const registeredAgencyId = userData?.registeredAgency;
        const studentId = userData?._id;

        if (!registeredAgencyId || !studentId) {
            Alert.alert("Error", "Profile data is still loading. Please try again.");
            return;
        }

        try {
            setLoading(true);
            let mimeType = asset.mimeType || 'image/jpeg';
            if (mimeType === 'image/jpg') mimeType = 'image/jpeg';

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

            if (!sasRes.ok) throw new Error("SAS generation failed");
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

            if (!azureRes.ok) throw new Error("Azure storage upload failed");

            await fetch(`${Config.API_BASE_URL}/students/uploads/confirm`, {
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

            const newImageUrl = sasUrl.split('?')[0];
            setUserData(prev => ({ ...prev, profile: newImageUrl }));

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
            Alert.alert("Upload Error", "Failed to update photo. Please try again.");
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

    const handleDateChange = (event, selected) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selected) {
            setSelectedDate(selected);
            const formattedDate = selected.toISOString().split('T')[0];
            setEditField({ ...editField, value: formattedDate });
        }
    };

    const openDatePicker = () => {
        const currentDate = userData?.dob ? new Date(userData.dob) : new Date();
        setSelectedDate(currentDate);
        setEditField({
            name: "Date of Birth",
            value: userData?.dob ? userData.dob.split('T')[0] : '',
            key: "dob"
        });
        setShowDatePicker(true);
        setModalVisible(true);
    };

    // Education CRUD
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
                updatedEducation[educationForm.editIndex] = educationEntry;
            } else {
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
            }
        } catch (error) {
            console.error(error);
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

    if (loading && !userData) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header with Gradient Banner */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => {
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

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Profile Section */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <Image
                            style={styles.avatar}
                            source={userData?.profile || DEFAULT_IMAGE}
                            placeholder={DEFAULT_IMAGE}
                            contentFit="cover"
                            transition={200}
                        />
                        <TouchableOpacity style={styles.editAvatarButton} onPress={pickImage}>
                            <Ionicons name="camera" size={18} color={COLORS.white} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.userName}>{userData?.name || 'User'}</Text>
                    <Text style={styles.userEmail}>{userData?.email || 'user@example.com'}</Text>
                </View>

                {/* Personal Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>

                    <View style={styles.card}>
                        {/* Email - Read Only */}
                        <View style={styles.infoRow}>
                            <View style={styles.infoLeft}>
                                <Ionicons name="mail-outline" size={18} color={COLORS.textSecondary} />
                                <Text style={styles.infoLabel}>Email</Text>
                            </View>
                            <Text style={styles.infoValue}>{userData?.email || '-'}</Text>
                        </View>

                        <View style={styles.divider} />

                        {/* Phone - Editable */}
                        <TouchableOpacity
                            style={styles.infoRow}
                            onPress={() => {
                                setEditField({
                                    name: "Phone Number",
                                    value: userData?.phone || '',
                                    key: "phone"
                                });
                                setModalVisible(true);
                            }}
                        >
                            <View style={styles.infoLeft}>
                                <Ionicons name="call-outline" size={18} color={COLORS.textSecondary} />
                                <Text style={styles.infoLabel}>Phone</Text>
                            </View>
                            <View style={styles.infoRight}>
                                <Text style={[styles.infoValue, !userData?.phone && styles.placeholder]}>
                                    {userData?.phone || 'Add phone'}
                                </Text>
                                <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
                            </View>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        {/* Date of Birth - Editable with Date Picker */}
                        <TouchableOpacity
                            style={styles.infoRow}
                            onPress={openDatePicker}
                        >
                            <View style={styles.infoLeft}>
                                <Ionicons name="calendar-outline" size={18} color={COLORS.textSecondary} />
                                <Text style={styles.infoLabel}>Date of Birth</Text>
                            </View>
                            <View style={styles.infoRight}>
                                <Text style={[styles.infoValue, !userData?.dob && styles.placeholder]}>
                                    {formatDate(userData?.dob)}
                                </Text>
                                <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
                            </View>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        {/* Nationality - Editable */}
                        <TouchableOpacity
                            style={styles.infoRow}
                            onPress={() => {
                                setEditField({
                                    name: "Nationality",
                                    value: userData?.nationality || '',
                                    key: "nationality"
                                });
                                setModalVisible(true);
                            }}
                        >
                            <View style={styles.infoLeft}>
                                <Ionicons name="flag-outline" size={18} color={COLORS.textSecondary} />
                                <Text style={styles.infoLabel}>Nationality</Text>
                            </View>
                            <View style={styles.infoRight}>
                                <Text style={[styles.infoValue, !userData?.nationality && styles.placeholder]}>
                                    {userData?.nationality || 'Add nationality'}
                                </Text>
                                <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Education Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Education</Text>
                        <TouchableOpacity onPress={handleAddEducation}>
                            <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>

                    {userData?.education && userData.education.length > 0 ? (
                        userData.education.map((edu, index) => (
                            <View key={index} style={styles.educationCard}>
                                <View style={styles.educationContent}>
                                    <View style={styles.educationHeader}>
                                        <View style={styles.degreeContainer}>
                                            <Text style={styles.educationDegreeText}>{edu.degree || 'Degree'}</Text>
                                            <Text style={styles.educationInstitutionText}>{edu.institution || 'Institution'}</Text>
                                        </View>
                                        <View style={styles.educationActions}>
                                            <TouchableOpacity
                                                style={styles.editButton}
                                                onPress={() => handleEditEducation(edu, index)}
                                            >
                                                <Ionicons name="pencil" size={16} color={COLORS.primary} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.deleteButton}
                                                onPress={() => handleDeleteEducation(index)}
                                            >
                                                <Ionicons name="trash" size={16} color={COLORS.danger} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {edu.fieldOfStudy ? (
                                        <Text style={styles.educationFieldText}>{edu.fieldOfStudy}</Text>
                                    ) : null}

                                    <View style={styles.educationFooter}>
                                        <View style={styles.yearBadge}>
                                            <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
                                            <Text style={styles.educationYearText}>
                                                {formatYearRange(edu.startYear, edu.endYear)}
                                            </Text>
                                        </View>
                                        {edu.grade ? (
                                            <View style={styles.gradeBadge}>
                                                <Ionicons name="star-outline" size={14} color={COLORS.warning} />
                                                <Text style={styles.educationGradeText}>{edu.grade}</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconContainer}>
                                <Ionicons name="school-outline" size={40} color={COLORS.primary} />
                            </View>
                            <Text style={styles.emptyTitle}>No education added</Text>
                            <Text style={styles.emptyDescription}>Tap the + button to add your education history</Text>
                        </View>
                    )}
                </View>

                <View style={{ height: 30 }} />
            </ScrollView>

            {/* Edit Modal */}
            <Modal visible={isModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit {editField.name}</Text>
                            <TouchableOpacity onPress={() => {
                                setModalVisible(false);
                                setShowDatePicker(false);
                            }}>
                                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {editField.key === 'dob' ? (
                            <>
                                {showDatePicker && (
                                    <DateTimePicker
                                        value={selectedDate}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={handleDateChange}
                                        maximumDate={new Date()}
                                        minimumDate={new Date(1950, 0, 1)}
                                    />
                                )}
                                <View style={styles.dateDisplay}>
                                    <Text style={styles.dateDisplayText}>
                                        {editField.value ? formatDate(editField.value) : 'Select date'}
                                    </Text>
                                </View>
                            </>
                        ) : (
                            <TextInput
                                style={styles.input}
                                value={editField.value}
                                onChangeText={(text) => setEditField({ ...editField, value: text })}
                                placeholder={`Enter ${editField.name.toLowerCase()}`}
                                placeholderTextColor={COLORS.textSecondary}
                                keyboardType={editField.key === 'phone' ? 'phone-pad' : 'default'}
                            />
                        )}

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setModalVisible(false);
                                    setShowDatePicker(false);
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={handlePatchRequest}
                            >
                                <Text style={styles.saveButtonText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* FIXED: Education Modal - ONLY THIS PART CHANGED */}
            <Modal visible={isEducationModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, styles.educationModalContent]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {educationForm.isEditing ? 'Edit Education' : 'Add Education'}
                            </Text>
                            <TouchableOpacity onPress={() => setEducationModalVisible(false)}>
                                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Preview Section - Shows live preview of what you're adding */}
                        {(educationForm.institution || educationForm.degree) && (
                            <View style={styles.previewSection}>
                                <Text style={styles.previewTitle}>Preview</Text>
                                <View style={styles.previewCard}>
                                    <Text style={styles.previewDegree}>
                                        {educationForm.degree || 'Degree'}
                                    </Text>
                                    <Text style={styles.previewInstitution}>
                                        {educationForm.institution || 'Institution'}
                                    </Text>
                                    {educationForm.fieldOfStudy ? (
                                        <Text style={styles.previewField}>{educationForm.fieldOfStudy}</Text>
                                    ) : null}
                                    <View style={styles.previewMeta}>
                                        <Text style={styles.previewYear}>
                                            {formatYearRange(educationForm.startYear, educationForm.endYear)}
                                        </Text>
                                        {educationForm.grade ? (
                                            <Text style={styles.previewGrade}> • {educationForm.grade}</Text>
                                        ) : null}
                                    </View>
                                </View>
                            </View>
                        )}

                        <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>
                                    Institution <Text style={styles.requiredStar}>*</Text>
                                </Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={educationForm.institution}
                                    onChangeText={(text) => setEducationForm({ ...educationForm, institution: text })}
                                    placeholder="e.g. Harvard University"
                                    placeholderTextColor={COLORS.textSecondary}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>
                                    Degree <Text style={styles.requiredStar}>*</Text>
                                </Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={educationForm.degree}
                                    onChangeText={(text) => setEducationForm({ ...educationForm, degree: text })}
                                    placeholder="e.g. Bachelor of Science"
                                    placeholderTextColor={COLORS.textSecondary}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Field of Study</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={educationForm.fieldOfStudy}
                                    onChangeText={(text) => setEducationForm({ ...educationForm, fieldOfStudy: text })}
                                    placeholder="e.g. Computer Science"
                                    placeholderTextColor={COLORS.textSecondary}
                                />
                            </View>

                            <View style={styles.formRow}>
                                <View style={styles.formHalf}>
                                    <Text style={styles.formLabel}>Start Year</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        value={educationForm.startYear}
                                        onChangeText={(text) => setEducationForm({ ...educationForm, startYear: text })}
                                        placeholder="2020"
                                        placeholderTextColor={COLORS.textSecondary}
                                        keyboardType="number-pad"
                                        maxLength={4}
                                    />
                                </View>

                                <View style={styles.formHalf}>
                                    <Text style={styles.formLabel}>End Year</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        value={educationForm.endYear}
                                        onChangeText={(text) => setEducationForm({ ...educationForm, endYear: text })}
                                        placeholder="2024"
                                        placeholderTextColor={COLORS.textSecondary}
                                        keyboardType="number-pad"
                                        maxLength={4}
                                    />
                                </View>
                            </View>

                            <View style={[styles.formGroup, styles.lastFormGroup]}>
                                <Text style={styles.formLabel}>Grade / GPA</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={educationForm.grade}
                                    onChangeText={(text) => setEducationForm({ ...educationForm, grade: text })}
                                    placeholder="e.g. 3.8 / First Class"
                                    placeholderTextColor={COLORS.textSecondary}
                                />
                            </View>
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setEducationModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={handleSaveEducation}
                            >
                                <Text style={styles.saveButtonText}>
                                    {educationForm.isEditing ? 'Update' : 'Add'}
                                </Text>
                            </TouchableOpacity>
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
    header: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 20,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
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
    scrollContent: {
        padding: 20,
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.lightBlue,
        borderWidth: 4,
        borderColor: COLORS.white,
    },
    editAvatarButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primary,
        borderWidth: 3,
        borderColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
    },
    userName: {
        fontSize: 22,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 12,
    },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    infoLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    infoLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginLeft: 12,
    },
    infoRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    infoValue: {
        fontSize: 14,
        color: COLORS.textPrimary,
        fontWeight: '500',
    },
    placeholder: {
        color: COLORS.textSecondary,
        fontWeight: '400',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
    },
    educationItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    educationMain: {
        flex: 1,
    },
    educationDegree: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    educationInstitution: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '500',
        marginBottom: 4,
    },
    educationField: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginBottom: 6,
    },
    educationMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    educationYear: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    educationGrade: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    educationActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 40,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
    },
    emptyText: {
        fontSize: 15,
        fontWeight: '500',
        color: COLORS.textPrimary,
        marginTop: 12,
    },
    emptySubtext: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        width: '100%',
        maxWidth: 400,
    },
    // New style specifically for education modal
    educationModalContent: {
        padding: 0,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    input: {
        backgroundColor: COLORS.bg,
        borderRadius: 10,
        padding: 14,
        fontSize: 15,
        color: COLORS.textPrimary,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginHorizontal: 20,
        marginVertical: 12,
    },
    dateDisplay: {
        backgroundColor: COLORS.bg,
        borderRadius: 10,
        padding: 14,
        marginHorizontal: 20,
        marginVertical: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    dateDisplayText: {
        fontSize: 15,
        color: COLORS.textPrimary,
    },
    modalActions: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: COLORS.bg,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    saveButton: {
        backgroundColor: COLORS.primary,
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    saveButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.cardBg,
    },
      educationCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    educationContent: {
        flex: 1,
    },
    educationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    degreeContainer: {
        flex: 1,
        marginRight: 12,
    },
    educationDegreeText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 4,
        lineHeight: 22,
    },
    educationInstitutionText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
        marginBottom: 2,
        lineHeight: 20,
    },
    educationFieldText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 12,
        lineHeight: 20,
        fontWeight: '400',
    },
    educationFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 4,
    },
    yearBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    gradeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 152, 0, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    educationYearText: {
        fontSize: 13,
        color: COLORS.primary,
        fontWeight: '500',
    },
    educationGradeText: {
        fontSize: 13,
        color: COLORS.warning,
        fontWeight: '500',
    },
    editButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    deleteButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 8,
    },
    emptyDescription: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    // NEW STYLES FOR EDUCATION MODAL - FIXED SPACING
    formScroll: {
        paddingHorizontal: 20,
        maxHeight: 400,
    },
    formGroup: {
        marginBottom: 16,
        width: '100%',
    },
    lastFormGroup: {
        marginBottom: 20,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 8,
    },
    requiredStar: {
        color: COLORS.danger,
        fontSize: 14,
    },
    formInput: {
        backgroundColor: COLORS.bg,
        borderRadius: 10,
        padding: 14,
        fontSize: 15,
        color: COLORS.textPrimary,
        borderWidth: 1,
        borderColor: COLORS.border,
        width: '100%',
    },
    formRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
        width: '100%',
    },
    formHalf: {
        flex: 1,
    },
    // NEW STYLES FOR PREVIEW SECTION
    previewSection: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
        backgroundColor: COLORS.primaryLight,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    previewTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    previewCard: {
        backgroundColor: COLORS.white,
        borderRadius: 10,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    previewDegree: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    previewInstitution: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '500',
        marginBottom: 4,
    },
    previewField: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginBottom: 6,
    },
    previewMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    previewYear: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    previewGrade: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
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