import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, TextInput, Modal, Platform,
    KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
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
    white: '#FFFFFF',
    border: '#EEF2F7',
    cardBg: '#FFFFFF',
    textPrimary: '#2D3748',
    textSecondary: '#718096',
    lightBlue: '#E8F1FF',
    danger: '#FF6B6B',
    dangerLight: 'rgba(255, 107, 107, 0.1)',
    success: '#4CAF50',
    warning: '#FF9800',
};

const DEFAULT_IMAGE = require('../../../../assets/images/agencies/profile_default.png');

const formatDate = (dateString) => {
    if (!dateString) return 'Not Set';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatYearRange = (startYear, endYear) => {
    if (!startYear) return 'Not Set';
    if (!endYear) return `${startYear} – Present`;
    return `${startYear} – ${endYear}`;
};

export default function UserProfile() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const agencyId = params.agencyId || params.id;
    const { userToken } = useAuth();

    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);

    // Simple edit modal
    const [isModalVisible, setModalVisible] = useState(false);
    const [editField, setEditField] = useState({ name: '', value: '', key: '' });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Education modal
    const [isEducationModalVisible, setEducationModalVisible] = useState(false);
    const [educationForm, setEducationForm] = useState({
        institution: '', 
        degree: '', 
        fieldOfStudy: '',
        startYear: '', 
        endYear: '', 
        grade: '',
        isEditing: false, 
        editIndex: null,
    });

    useEffect(() => {
        if (userToken) fetchProfile();
    }, [userToken]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${Config.API_BASE_URL}/students/profile`, {
                headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' },
            });
            const json = await response.json();
            console.log('Profile data:', JSON.stringify(json, null, 2));
            if (response.ok) setUserData(json.profile);
        } catch (error) {
            console.error('Profile Fetch Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (asset) => {
        if (!userData?.registeredAgency || !userData?._id) {
            Alert.alert('Error', 'Profile data is still loading. Please try again.');
            return;
        }
        try {
            setLoading(true);
            let mimeType = asset.mimeType || 'image/jpeg';
            if (mimeType === 'image/jpg') mimeType = 'image/jpeg';

            const sasRes = await fetch(`${Config.API_BASE_URL}/students/uploads/sas`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ mimeType, size: asset.fileSize || 0, documentType: 'profile' }),
            });
            if (!sasRes.ok) throw new Error('SAS generation failed');
            const { sasUrl, blobName } = await sasRes.json();

            const blobRes = await fetch(asset.uri);
            const blob = await blobRes.blob();
            const azureRes = await fetch(sasUrl, {
                method: 'PUT', body: blob,
                headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': mimeType },
            });
            if (!azureRes.ok) throw new Error('Azure storage upload failed');

            await fetch(`${Config.API_BASE_URL}/students/uploads/confirm`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ blobName, size: asset.fileSize || 0, mimeType, documentType: 'profile' }),
            });

            const newImageUrl = sasUrl.split('?')[0];
            const patchRes = await fetch(`${Config.API_BASE_URL}/students/profile`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ profileUrl: newImageUrl }),
            });
            if (patchRes.ok) {
                setUserData(prev => ({ ...prev, profileUrl: newImageUrl }));
                Alert.alert('Success', 'Profile picture updated successfully');
            } else throw new Error('Failed to save profile picture');
        } catch (err) {
            Alert.alert('Upload Error', err.message || 'Failed to update photo.');
            await fetchProfile();
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please allow access to your photo library');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.4,
        });
        if (!result.canceled && result.assets[0]) handleUpload(result.assets[0]);
    };

    const handlePatchRequest = async () => {
        try {
            setLoading(true);
            
            // Prepare the update object
            const updateData = {};
            
            if (editField.key === 'dob') {
                // Ensure date is in proper format
                updateData.dob = editField.value;
            } else if (editField.key === 'phone') {
                updateData.phone = editField.value;
            } else if (editField.key === 'nationality') {
                updateData.nationality = editField.value;
            }
            
            console.log('Updating with:', updateData);
            
            const response = await fetch(`${Config.API_BASE_URL}/students/profile`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData),
            });
            
            const responseData = await response.json();
            console.log('Update response:', responseData);
            
            if (response.ok) {
                setModalVisible(false);
                setShowDatePicker(false);
                await fetchProfile(); // Refresh data
                Alert.alert('Success', 'Information updated');
            } else {
                Alert.alert('Error', responseData.message || 'Failed to update');
            }
        } catch (error) {
            console.error('Update error:', error);
            Alert.alert('Error', 'Failed to update information');
        } finally {
            setLoading(false);
        }
    };

    const handleDateChange = (event, selected) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (selected) {
            setSelectedDate(selected);
            // Format date as YYYY-MM-DD
            const year = selected.getFullYear();
            const month = String(selected.getMonth() + 1).padStart(2, '0');
            const day = String(selected.getDate()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}`;
            setEditField(prev => ({ ...prev, value: formattedDate }));
        }
    };

    const openDatePicker = () => {
        const current = userData?.dob ? new Date(userData.dob) : new Date();
        setSelectedDate(current);
        setEditField({ name: 'Date of Birth', value: userData?.dob?.split('T')[0] || '', key: 'dob' });
        setShowDatePicker(true);
        setModalVisible(true);
    };

    const handleAddEducation = () => {
        console.log('Add education pressed');
        setEducationForm({
            institution: '', 
            degree: '', 
            fieldOfStudy: '',
            startYear: '', 
            endYear: '', 
            grade: '',
            isEditing: false, 
            editIndex: null,
        });
        setEducationModalVisible(true);
    };

    const handleEditEducation = (edu, index) => {
        console.log('Edit education pressed', edu);
        setEducationForm({
            institution: edu.institution || '',
            degree: edu.degree || '',
            fieldOfStudy: edu.fieldOfStudy || '',
            startYear: edu.startYear?.toString() || '',
            endYear: edu.endYear?.toString() || '',
            grade: edu.grade || '',
            isEditing: true,
            editIndex: index,
        });
        setEducationModalVisible(true);
    };

    const handleSaveEducation = async () => {
        if (!educationForm.institution || !educationForm.degree) {
            Alert.alert('Validation Error', 'Please fill in institution and degree');
            return;
        }
        
        try {
            setLoading(true);
            
            // Prepare education entry with proper data types
            const entry = {
                institution: educationForm.institution.trim(),
                degree: educationForm.degree.trim(),
                fieldOfStudy: educationForm.fieldOfStudy.trim() || undefined,
                startYear: educationForm.startYear ? parseInt(educationForm.startYear) : undefined,
                endYear: educationForm.endYear ? parseInt(educationForm.endYear) : undefined,
                grade: educationForm.grade.trim() || undefined,
            };
            
            // Remove undefined fields
            Object.keys(entry).forEach(key => 
                entry[key] === undefined && delete entry[key]
            );
            
            console.log('Saving education entry:', entry);
            
            // Get current education array
            const currentEducation = userData?.education || [];
            let updatedEducation;
            
            if (educationForm.isEditing) {
                // Update existing entry
                updatedEducation = [...currentEducation];
                updatedEducation[educationForm.editIndex] = entry;
            } else {
                // Add new entry
                updatedEducation = [...currentEducation, entry];
            }
            
            console.log('Updated education array:', updatedEducation);
            
            const response = await fetch(`${Config.API_BASE_URL}/students/profile`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ education: updatedEducation }),
            });
            
            const responseData = await response.json();
            console.log('Education save response:', responseData);
            
            if (response.ok) {
                setEducationModalVisible(false);
                await fetchProfile(); // Refresh the profile data
                Alert.alert('Success', educationForm.isEditing ? 'Education updated' : 'Education added');
            } else {
                Alert.alert('Error', responseData.message || 'Failed to save education');
            }
        } catch (error) {
            console.error('Education save error:', error);
            Alert.alert('Error', 'Failed to save education information');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteEducation = (index) => {
        Alert.alert('Delete Education', 'Are you sure you want to delete this entry?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try {
                        setLoading(true);
                        const updated = [...(userData?.education || [])];
                        updated.splice(index, 1);
                        
                        console.log('Deleting education, updated array:', updated);
                        
                        const response = await fetch(`${Config.API_BASE_URL}/students/profile`, {
                            method: 'PATCH',
                            headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ education: updated }),
                        });
                        
                        if (response.ok) { 
                            await fetchProfile(); 
                            Alert.alert('Success', 'Education deleted'); 
                        }
                    } catch (error) { 
                        console.error('Delete error:', error);
                    } finally { 
                        setLoading(false); 
                    }
                },
            },
        ]);
    };

    if (loading && !userData) {
        return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={() => agencyId ? router.push(`/agency/selected/${agencyId}`) : router.back()}
                    >
                        <Ionicons name="chevron-back" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Profile</Text>
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={() => router.push(agencyId
                            ? { pathname: '/agency/selected/profile-settings', params: { agencyId } }
                            : '/agency/selected/profile-settings'
                        )}
                    >
                        <Ionicons name="settings-outline" size={22} color={COLORS.white} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Avatar */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <Image
                            style={styles.avatar}
                            source={userData?.profileUrl ? { uri: userData.profileUrl } : DEFAULT_IMAGE}
                            placeholder={DEFAULT_IMAGE}
                            contentFit="cover"
                            transition={200}
                            cachePolicy="memory-disk"
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
                        {/* Email - read only */}
                        <View style={styles.infoRow}>
                            <View style={styles.infoLeft}>
                                <View style={styles.iconWrap}><Ionicons name="mail-outline" size={17} color={COLORS.primary} /></View>
                                <Text style={styles.infoLabel}>Email</Text>
                            </View>
                            <Text style={styles.infoValue} numberOfLines={1}>{userData?.email || '–'}</Text>
                        </View>
                        <View style={styles.divider} />

                        {/* Phone */}
                        <TouchableOpacity style={styles.infoRow} onPress={() => {
                            setEditField({ name: 'Phone Number', value: userData?.phone || '', key: 'phone' });
                            setModalVisible(true);
                        }}>
                            <View style={styles.infoLeft}>
                                <View style={styles.iconWrap}><Ionicons name="call-outline" size={17} color={COLORS.primary} /></View>
                                <Text style={styles.infoLabel}>Phone</Text>
                            </View>
                            <View style={styles.infoRight}>
                                <Text style={[styles.infoValue, !userData?.phone && styles.placeholder]}>
                                    {userData?.phone || 'Add phone'}
                                </Text>
                                <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
                            </View>
                        </TouchableOpacity>
                        <View style={styles.divider} />

                        {/* DOB */}
                        <TouchableOpacity style={styles.infoRow} onPress={openDatePicker}>
                            <View style={styles.infoLeft}>
                                <View style={styles.iconWrap}><Ionicons name="calendar-outline" size={17} color={COLORS.primary} /></View>
                                <Text style={styles.infoLabel}>Date of Birth</Text>
                            </View>
                            <View style={styles.infoRight}>
                                <Text style={[styles.infoValue, !userData?.dob && styles.placeholder]}>
                                    {formatDate(userData?.dob)}
                                </Text>
                                <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
                            </View>
                        </TouchableOpacity>
                        <View style={styles.divider} />

                        {/* Nationality */}
                        <TouchableOpacity style={styles.infoRow} onPress={() => {
                            setEditField({ name: 'Nationality', value: userData?.nationality || '', key: 'nationality' });
                            setModalVisible(true);
                        }}>
                            <View style={styles.infoLeft}>
                                <View style={styles.iconWrap}><Ionicons name="flag-outline" size={17} color={COLORS.primary} /></View>
                                <Text style={styles.infoLabel}>Nationality</Text>
                            </View>
                            <View style={styles.infoRight}>
                                <Text style={[styles.infoValue, !userData?.nationality && styles.placeholder]}>
                                    {userData?.nationality || 'Add nationality'}
                                </Text>
                                <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Education */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Education</Text>
                        <TouchableOpacity style={styles.addBtn} onPress={handleAddEducation}>
                            <Ionicons name="add" size={18} color={COLORS.primary} />
                            <Text style={styles.addBtnText}>Add</Text>
                        </TouchableOpacity>
                    </View>

                    {userData?.education && userData.education.length > 0 ? (
                        userData.education.map((edu, index) => {
                            console.log('Rendering education:', edu);
                            return (
                                <View key={index} style={styles.educationCard}>
                                    {/* Top row: degree + actions */}
                                    <View style={styles.eduTopRow}>
                                        <View style={styles.eduIconCircle}>
                                            <Ionicons name="school" size={20} color={COLORS.primary} />
                                        </View>
                                        <View style={styles.eduMain}>
                                            <Text style={styles.eduDegree}>{edu.degree || 'Degree'}</Text>
                                            <Text style={styles.eduInstitution}>{edu.institution || 'Institution'}</Text>
                                        </View>
                                        <View style={styles.eduActions}>
                                            <TouchableOpacity style={styles.eduEditBtn} onPress={() => handleEditEducation(edu, index)}>
                                                <Ionicons name="pencil" size={15} color={COLORS.primary} />
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.eduDeleteBtn} onPress={() => handleDeleteEducation(index)}>
                                                <Ionicons name="trash" size={15} color={COLORS.danger} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {/* Field of study */}
                                    {edu.fieldOfStudy ? (
                                        <Text style={styles.eduField}>{edu.fieldOfStudy}</Text>
                                    ) : null}

                                    {/* Badges row */}
                                    <View style={styles.eduBadgesRow}>
                                        {(edu.startYear || edu.endYear) ? (
                                            <View style={styles.yearBadge}>
                                                <Ionicons name="calendar-outline" size={13} color={COLORS.primary} />
                                                <Text style={styles.yearBadgeText}>
                                                    {formatYearRange(edu.startYear, edu.endYear)}
                                                </Text>
                                            </View>
                                        ) : null}
                                        {edu.grade ? (
                                            <View style={styles.gradeBadge}>
                                                <Ionicons name="star-outline" size={13} color={COLORS.warning} />
                                                <Text style={styles.gradeBadgeText}>{edu.grade}</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                </View>
                            );
                        })
                    ) : (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconContainer}>
                                <Ionicons name="school-outline" size={36} color={COLORS.primary} />
                            </View>
                            <Text style={styles.emptyTitle}>No education added</Text>
                            <Text style={styles.emptyDescription}>Tap "Add" to include your education history</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* ── Simple Edit Modal (phone / nationality / dob) ── */}
            <Modal 
                visible={isModalVisible} 
                transparent 
                animationType="fade" 
                onRequestClose={() => {
                    setModalVisible(false);
                    setShowDatePicker(false);
                }}
            >
                <TouchableWithoutFeedback onPress={() => {
                    setModalVisible(false);
                    setShowDatePicker(false);
                }}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.simpleModalCard}>
                                {/* Handle bar */}
                                <View style={styles.modalHandle} />

                                <Text style={styles.simpleModalTitle}>Edit {editField.name}</Text>

                                {editField.key === 'dob' ? (
                                    <View>
                                        <View style={styles.dateDisplayBox}>
                                            <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                                            <Text style={styles.dateDisplayText}>
                                                {editField.value ? formatDate(editField.value) : 'Select a date'}
                                            </Text>
                                        </View>
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
                                        {Platform.OS === 'android' && !showDatePicker && (
                                            <TouchableOpacity 
                                                style={styles.datePickerButton}
                                                onPress={() => setShowDatePicker(true)}
                                            >
                                                <Text style={styles.datePickerButtonText}>Change Date</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ) : (
                                    <TextInput
                                        style={styles.simpleInput}
                                        value={editField.value}
                                        onChangeText={text => setEditField(prev => ({ ...prev, value: text }))}
                                        placeholder={`Enter ${editField.name.toLowerCase()}`}
                                        placeholderTextColor={COLORS.textSecondary}
                                        keyboardType={editField.key === 'phone' ? 'phone-pad' : 'default'}
                                        autoFocus
                                        returnKeyType="done"
                                        onSubmitEditing={handlePatchRequest}
                                    />
                                )}

                                <View style={styles.modalActions}>
                                    <TouchableOpacity
                                        style={[styles.modalBtn, styles.cancelBtn]}
                                        onPress={() => { 
                                            setModalVisible(false); 
                                            setShowDatePicker(false); 
                                        }}
                                    >
                                        <Text style={styles.cancelBtnText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handlePatchRequest}>
                                        <Text style={styles.saveBtnText}>Save</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* ── Education Modal ── */}
            <Modal 
                visible={isEducationModalVisible} 
                transparent 
                animationType="slide" 
                onRequestClose={() => setEducationModalVisible(false)}
            >
                <View style={styles.eduModalOverlay}>
                    <View style={styles.eduModalSheet}>
                        {/* Header with close button */}
                        <View style={styles.eduModalHeader}>
                            <Text style={styles.eduModalTitle}>
                                {educationForm.isEditing ? 'Edit Education' : 'Add Education'}
                            </Text>
                            <TouchableOpacity 
                                onPress={() => setEducationModalVisible(false)}
                                style={styles.eduCloseButton}
                            >
                                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Form Content */}
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={styles.eduKeyboardView}
                            keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
                        >
                            <ScrollView
                                style={styles.eduFormScroll}
                                contentContainerStyle={styles.eduFormContent}
                                showsVerticalScrollIndicator={true}
                                keyboardShouldPersistTaps="handled"
                            >
                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>
                                        Institution <Text style={{ color: COLORS.danger }}>*</Text>
                                    </Text>
                                    <TextInput
                                        style={styles.formInput}
                                        value={educationForm.institution}
                                        onChangeText={t => setEducationForm(p => ({ ...p, institution: t }))}
                                        placeholder="e.g. Harvard University"
                                        placeholderTextColor={COLORS.textSecondary}
                                    />
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>
                                        Degree <Text style={{ color: COLORS.danger }}>*</Text>
                                    </Text>
                                    <TextInput
                                        style={styles.formInput}
                                        value={educationForm.degree}
                                        onChangeText={t => setEducationForm(p => ({ ...p, degree: t }))}
                                        placeholder="e.g. Bachelor of Science"
                                        placeholderTextColor={COLORS.textSecondary}
                                    />
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Field of Study</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        value={educationForm.fieldOfStudy}
                                        onChangeText={t => setEducationForm(p => ({ ...p, fieldOfStudy: t }))}
                                        placeholder="e.g. Computer Science"
                                        placeholderTextColor={COLORS.textSecondary}
                                    />
                                </View>

                                <View style={styles.rowFields}>
                                    <View style={styles.halfField}>
                                        <Text style={styles.formLabel}>Start Year</Text>
                                        <TextInput
                                            style={styles.formInput}
                                            value={educationForm.startYear}
                                            onChangeText={t => setEducationForm(p => ({ ...p, startYear: t }))}
                                            placeholder="2020"
                                            placeholderTextColor={COLORS.textSecondary}
                                            keyboardType="number-pad"
                                            maxLength={4}
                                        />
                                    </View>
                                    <View style={styles.halfField}>
                                        <Text style={styles.formLabel}>End Year</Text>
                                        <TextInput
                                            style={styles.formInput}
                                            value={educationForm.endYear}
                                            onChangeText={t => setEducationForm(p => ({ ...p, endYear: t }))}
                                            placeholder="2024"
                                            placeholderTextColor={COLORS.textSecondary}
                                            keyboardType="number-pad"
                                            maxLength={4}
                                        />
                                    </View>
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Grade / GPA</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        value={educationForm.grade}
                                        onChangeText={t => setEducationForm(p => ({ ...p, grade: t }))}
                                        placeholder="e.g. 3.8 / First Class"
                                        placeholderTextColor={COLORS.textSecondary}
                                    />
                                </View>

                                {/* Live preview */}
                                {(educationForm.institution || educationForm.degree) && (
                                    <View style={styles.previewBox}>
                                        <Text style={styles.previewLabel}>PREVIEW</Text>
                                        <Text style={styles.previewDegree}>{educationForm.degree || '—'}</Text>
                                        <Text style={styles.previewInstitution}>{educationForm.institution || '—'}</Text>
                                        {educationForm.fieldOfStudy ? (
                                            <Text style={styles.previewField}>{educationForm.fieldOfStudy}</Text>
                                        ) : null}
                                        <Text style={styles.previewMeta}>
                                            {formatYearRange(educationForm.startYear, educationForm.endYear)}
                                            {educationForm.grade ? `  ·  ${educationForm.grade}` : ''}
                                        </Text>
                                    </View>
                                )}
                                
                                {/* Add some bottom padding */}
                                <View style={{ height: 20 }} />
                            </ScrollView>
                        </KeyboardAvoidingView>

                        {/* Actions */}
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.cancelBtn]}
                                onPress={() => setEducationModalVisible(false)}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalBtn, styles.saveBtn]} 
                                onPress={handleSaveEducation}
                            >
                                <Text style={styles.saveBtnText}>
                                    {educationForm.isEditing ? 'Update' : 'Add'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Header
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
        alignItems: 'center' 
    },
    headerBtn: {
        width: 40, 
        height: 40, 
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', 
        alignItems: 'center',
    },
    headerTitle: { 
        fontSize: 22, 
        fontWeight: '700', 
        color: COLORS.white 
    },

    scrollContent: { 
        padding: 20,
        paddingBottom: 20,
    },

    // Profile
    profileSection: { 
        alignItems: 'center', 
        marginBottom: 32 
    },
    avatarContainer: { 
        position: 'relative', 
        marginBottom: 16 
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
        marginBottom: 4 
    },
    userEmail: { 
        fontSize: 14, 
        color: COLORS.textSecondary 
    },

    // Section
    section: { 
        marginBottom: 24 
    },
    sectionHeader: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: 12 
    },
    sectionTitle: { 
        fontSize: 16, 
        fontWeight: '700', 
        color: COLORS.textPrimary, 
        marginBottom: 12 
    },
    addBtn: {
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 4,
        paddingHorizontal: 12, 
        paddingVertical: 6,
        backgroundColor: COLORS.primaryLight, 
        borderRadius: 20,
    },
    addBtnText: { 
        fontSize: 13, 
        fontWeight: '600', 
        color: COLORS.primary 
    },

    // Info card
    card: {
        backgroundColor: COLORS.cardBg, 
        borderRadius: 16,
        paddingHorizontal: 16, 
        borderWidth: 1, 
        borderColor: COLORS.border,
    },
    infoRow: {
        flexDirection: 'row', 
        alignItems: 'center',
        justifyContent: 'space-between', 
        paddingVertical: 14,
    },
    infoLeft: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        flex: 1 
    },
    iconWrap: {
        width: 34, 
        height: 34, 
        borderRadius: 10,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center', 
        justifyContent: 'center', 
        marginRight: 12,
    },
    infoLabel: { 
        fontSize: 14, 
        color: COLORS.textSecondary 
    },
    infoRight: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 6 
    },
    infoValue: { 
        fontSize: 14, 
        color: COLORS.textPrimary, 
        fontWeight: '500' 
    },
    placeholder: { 
        color: COLORS.textSecondary, 
        fontWeight: '400' 
    },
    divider: { 
        height: 1, 
        backgroundColor: COLORS.border 
    },

    // Education cards - removed shadow
    educationCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16, 
        padding: 16, 
        marginBottom: 12,
        borderWidth: 1, 
        borderColor: COLORS.border,
    },
    eduTopRow: { 
        flexDirection: 'row', 
        alignItems: 'flex-start', 
        marginBottom: 8 
    },
    eduIconCircle: {
        width: 40, 
        height: 40, 
        borderRadius: 20,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center', 
        justifyContent: 'center',
        marginRight: 12, 
        flexShrink: 0,
    },
    eduMain: { 
        flex: 1 
    },
    eduDegree: { 
        fontSize: 15, 
        fontWeight: '700', 
        color: COLORS.textPrimary, 
        lineHeight: 21 
    },
    eduInstitution: { 
        fontSize: 13, 
        fontWeight: '600', 
        color: COLORS.primary, 
        lineHeight: 19, 
        marginTop: 2 
    },
    eduActions: { 
        flexDirection: 'row', 
        gap: 8, 
        flexShrink: 0 
    },
    eduEditBtn: {
        width: 34, 
        height: 34, 
        borderRadius: 10,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center', 
        justifyContent: 'center',
    },
    eduDeleteBtn: {
        width: 34, 
        height: 34, 
        borderRadius: 10,
        backgroundColor: 'rgba(255,107,107,0.1)',
        alignItems: 'center', 
        justifyContent: 'center',
    },
    eduField: { 
        fontSize: 13, 
        color: COLORS.textSecondary, 
        marginBottom: 10, 
        marginLeft: 52 
    },
    eduBadgesRow: { 
        flexDirection: 'row', 
        gap: 8, 
        marginLeft: 52,
        flexWrap: 'wrap',
    },
    yearBadge: {
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 5,
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 10, 
        paddingVertical: 5, 
        borderRadius: 20,
    },
    yearBadgeText: { 
        fontSize: 12, 
        color: COLORS.primary, 
        fontWeight: '500' 
    },
    gradeBadge: {
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 5,
        backgroundColor: 'rgba(255,152,0,0.1)',
        paddingHorizontal: 10, 
        paddingVertical: 5, 
        borderRadius: 20,
    },
    gradeBadgeText: { 
        fontSize: 12, 
        color: COLORS.warning, 
        fontWeight: '500' 
    },

    // Empty state
    emptyState: {
        backgroundColor: COLORS.cardBg, 
        borderRadius: 16, 
        padding: 40,
        alignItems: 'center', 
        borderWidth: 1, 
        borderColor: COLORS.border, 
        borderStyle: 'dashed',
    },
    emptyIconContainer: {
        width: 72, 
        height: 72, 
        borderRadius: 36,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center', 
        justifyContent: 'center', 
        marginBottom: 14,
    },
    emptyTitle: { 
        fontSize: 16, 
        fontWeight: '600', 
        color: COLORS.textPrimary, 
        marginBottom: 6 
    },
    emptyDescription: { 
        fontSize: 13, 
        color: COLORS.textSecondary, 
        textAlign: 'center', 
        lineHeight: 20 
    },

    // ── Simple modal ──
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    simpleModalCard: {
        backgroundColor: COLORS.white,
        borderRadius: 20, 
        padding: 24, 
        width: '90%', 
        maxWidth: 380,
    },
    modalHandle: {
        width: 36, 
        height: 4, 
        borderRadius: 2,
        backgroundColor: COLORS.border, 
        alignSelf: 'center', 
        marginBottom: 16,
    },
    simpleModalTitle: {
        fontSize: 17, 
        fontWeight: '700', 
        color: COLORS.textPrimary, 
        marginBottom: 16,
    },
    simpleInput: {
        backgroundColor: COLORS.bg, 
        borderRadius: 12,
        paddingHorizontal: 14, 
        paddingVertical: 13,
        fontSize: 15, 
        color: COLORS.textPrimary,
        borderWidth: 1, 
        borderColor: COLORS.border, 
        marginBottom: 4,
    },
    dateDisplayBox: {
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 10,
        backgroundColor: COLORS.bg, 
        borderRadius: 12,
        paddingHorizontal: 14, 
        paddingVertical: 13,
        borderWidth: 1, 
        borderColor: COLORS.border, 
        marginBottom: 16,
    },
    dateDisplayText: { 
        fontSize: 15, 
        color: COLORS.textPrimary, 
        flex: 1 
    },
    datePickerButton: {
        backgroundColor: COLORS.primaryLight,
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 16,
    },
    datePickerButtonText: {
        color: COLORS.primary,
        fontWeight: '600',
        fontSize: 14,
    },

    // ── Education modal ──
    eduModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    eduModalSheet: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 24, 
        borderTopRightRadius: 24,
        height: '80%', // Fixed height instead of maxHeight
    },
    eduModalHeader: {
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        paddingHorizontal: 20, 
        paddingVertical: 16,
        borderBottomWidth: 1, 
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.white,
    },
    eduModalTitle: { 
        fontSize: 18, 
        fontWeight: '700', 
        color: COLORS.textPrimary 
    },
    eduCloseButton: {
        padding: 4,
    },
    eduKeyboardView: {
        flex: 1,
    },
    eduFormScroll: { 
        flex: 1,
    },
    eduFormContent: { 
        padding: 20,
    },

    // Form fields
    formGroup: { 
        marginBottom: 20,
    },
    formLabel: { 
        fontSize: 14, 
        fontWeight: '600', 
        color: COLORS.textSecondary, 
        marginBottom: 8,
    },
    formInput: {
        backgroundColor: COLORS.bg, 
        borderRadius: 12,
        paddingHorizontal: 16, 
        paddingVertical: 14,
        fontSize: 16, 
        color: COLORS.textPrimary,
        borderWidth: 1, 
        borderColor: COLORS.border,
    },
    rowFields: { 
        flexDirection: 'row', 
        marginBottom: 0,
        gap: 12,
    },
    halfField: {
        flex: 1,
    },

    // Preview
    previewBox: {
        backgroundColor: COLORS.primaryLight,
        borderRadius: 16, 
        padding: 16,
        marginTop: 16,
        marginBottom: 8,
        borderWidth: 1, 
        borderColor: 'rgba(118,159,205,0.3)',
    },
    previewLabel: {
        fontSize: 10,
        fontWeight: '700', 
        color: COLORS.primary,
        letterSpacing: 1, 
        marginBottom: 8,
    },
    previewDegree: { 
        fontSize: 15,
        fontWeight: '700', 
        color: COLORS.textPrimary, 
        marginBottom: 2,
    },
    previewInstitution: { 
        fontSize: 13,
        fontWeight: '600', 
        color: COLORS.primary, 
        marginBottom: 2,
    },
    previewField: { 
        fontSize: 13,
        color: COLORS.textSecondary, 
        marginBottom: 6,
    },
    previewMeta: { 
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },

    // Shared modal actions
    modalActions: {
        flexDirection: 'row', 
        gap: 12,
        padding: 16,
        borderTopWidth: 1, 
        borderTopColor: COLORS.border,
        backgroundColor: COLORS.white,
    },
    modalBtn: { 
        flex: 1, 
        paddingVertical: 14,
        borderRadius: 12, 
        alignItems: 'center' 
    },
    cancelBtn: { 
        backgroundColor: COLORS.bg, 
        borderWidth: 1, 
        borderColor: COLORS.border 
    },
    saveBtn: { 
        backgroundColor: COLORS.primary 
    },
    cancelBtnText: { 
        fontSize: 15,
        fontWeight: '600', 
        color: COLORS.textSecondary 
    },
    saveBtnText: { 
        fontSize: 15,
        fontWeight: '600', 
        color: COLORS.white 
    },

    loadingOverlay: {
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center', 
        alignItems: 'center',
    },
});