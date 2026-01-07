import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    TextInput,
    Modal,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Helper to format the display date
const formatDate = (dateString) => {
    if (!dateString) return "Not Set";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; 

    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

const COLORS = {
    headerBg: '#E3EDF7',
    screenBg: '#F7FBFC',
    textBlue: '#87A1C5',
    cardBg: '#FFFFFF',
    textDark: '#333333',
    textMuted: '#9AA7BC',
    danger: '#FF6B6B'
};

const DEFAULT_IMAGE = require('../../../../assets/images/agencies/default.png');
const BASE_URL = 'https://edu-agent-backend-nine.vercel.app/api/v1/students';

export default function UserProfile() {
    const router = useRouter();
    const { userToken, signOut } = useAuth(); 
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [isModalVisible, setModalVisible] = useState(false);
    const [editField, setEditField] = useState({ name: '', value: '', key: '' });

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
            console.log("DEBUG: Current User Data ->", json.profile); 
            if (response.ok) setUserData(json.profile);
        } catch (error) {
            console.error("Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (asset) => {
        try {
            setLoading(true);
            let mimeType = asset.mimeType || 'image/jpeg';
            if (mimeType === 'image/jpg') mimeType = 'image/jpeg';

            const sasRes = await fetch(`${BASE_URL}/uploads/sas`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ mimeType: mimeType, size: asset.fileSize || 0 })
            });

            if (!sasRes.ok) throw new Error("Backend rejected SAS request");
            const { sasUrl, blobName } = await sasRes.json();

            const blobRes = await fetch(asset.uri);
            const blob = await blobRes.blob();

            const azureRes = await fetch(sasUrl, {
                method: 'PUT',
                body: blob,
                headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': mimeType }
            });

            if (!azureRes.ok) throw new Error("Azure upload failed");

            const confirmRes = await fetch(`${BASE_URL}/uploads/confirm`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ blobName: blobName, studentId: userData?._id })
            });

            if (confirmRes.ok) {
                Alert.alert("Success", "Profile picture updated!");
                fetchProfile();
            }
        } catch (err) {
            Alert.alert("Upload Failed", err.message);
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return Alert.alert("Error", "Permission denied");

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) handleUpload(result.assets[0]);
    };

    const handlePatchRequest = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${BASE_URL}/profile`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ [editField.key]: editField.value })
            });
            const json = await response.json();
            if (response.ok) {
                setUserData(json.profile);
                setModalVisible(false);
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading && !userData) {
        return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.textBlue} /></View>;
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
                <View style={styles.topActionRow}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={24} color={COLORS.textBlue} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Your Profile</Text>
                    <TouchableOpacity><Feather name="settings" size={22} color={COLORS.textBlue} /></TouchableOpacity>
                </View>

                <View style={styles.headerBlock}>
                    <View style={styles.imageWrapper}>
                        <Image source={userData?.profilePicture ? { uri: userData.profilePicture } : DEFAULT_IMAGE} style={styles.profilePic} />
                        <TouchableOpacity style={styles.cameraIconContainer} onPress={pickImage}>
                            <Ionicons name="camera" size={16} color="white" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.userNameText}>{userData?.name || 'User'}</Text>
                    <Text style={styles.userSubText}>{userData?.email || ''}</Text>
                </View>

                <View style={styles.contentPadding}>
                    {/* Registered Email (Read Only) */}
                    <SectionBlock label="Registered Email">
                        <View style={[styles.standardCard, styles.readOnlyCard]}>
                            <Text style={styles.readOnlyText}>{userData?.email || ''}</Text>
                            <Feather name="lock" size={14} color={COLORS.textMuted} />
                        </View>
                    </SectionBlock>

                    {/* Phone Number (Editable) */}
                    <EditableSection 
                        label="Phone Number" 
                        value={userData?.phone || "Add Phone Number"} 
                        onPress={() => { setEditField({ name: "Phone", value: userData?.phone || '', key: "phone" }); setModalVisible(true); }} 
                    />

                    {/* Date of Birth (Editable) */}
                    <EditableSection
                        label="Date of Birth"
                        value={formatDate(userData?.dob)} 
                        onPress={() => {
                            const rawDate = userData?.dob ? userData.dob.split('T')[0] : '';
                            setEditField({ name: "Date of Birth", value: rawDate, key: "dob" });
                            setModalVisible(true);
                        }}
                    />

                    {/* Nationality (Editable) */}
                    <EditableSection 
                        label="Nationality" 
                        value={userData?.nationality || "Add Nationality"} 
                        onPress={() => { setEditField({ name: "Nationality", value: userData?.nationality || '', key: "nationality" }); setModalVisible(true); }} 
                    />

                    <TouchableOpacity style={styles.logoutButton} onPress={() => signOut()}>
                        <Feather name="log-out" size={20} color={COLORS.danger} />
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <Modal visible={isModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Update {editField.name}</Text>
                        <TextInput 
                            style={styles.input} 
                            value={editField.value} 
                            onChangeText={(text) => setEditField({ ...editField, value: text })} 
                            placeholder={editField.key === 'dob' ? "YYYY-MM-DD" : ""}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity onPress={handlePatchRequest}><Text style={styles.saveText}>Save</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const SectionBlock = ({ label, children }) => (
    <View style={{ marginTop: 20 }}>
        <Text style={styles.sectionTitle}>{label}</Text>
        {children}
    </View>
);

const EditableSection = ({ label, value, onPress }) => (
    <SectionBlock label={label}>
        <TouchableOpacity style={styles.standardCard} onPress={onPress}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.bodyText}>{value}</Text>
                <Feather name="edit-3" size={16} color={COLORS.textBlue} />
            </View>
        </TouchableOpacity>
    </SectionBlock>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.screenBg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollBody: { paddingBottom: 100 },
    contentPadding: { paddingHorizontal: 20 },
    topActionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
    headerTitle: { color: COLORS.textBlue, fontWeight: '700', fontSize: 17 },
    headerBlock: { backgroundColor: COLORS.headerBg, alignItems: 'center', paddingVertical: 30, marginHorizontal: 20, borderRadius: 20, elevation: 2 },
    imageWrapper: { position: 'relative' },
    profilePic: { width: 90, height: 90, borderRadius: 45, marginBottom: 10, backgroundColor: '#FFF' },
    cameraIconContainer: { position: 'absolute', bottom: 12, right: 0, backgroundColor: COLORS.textBlue, width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    userNameText: { fontSize: 20, fontWeight: '700', color: COLORS.textBlue },
    userSubText: { fontSize: 13, color: COLORS.textBlue, opacity: 0.7 },
    sectionTitle: { color: COLORS.textBlue, fontSize: 11, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
    standardCard: { backgroundColor: COLORS.cardBg, borderRadius: 14, padding: 18, elevation: 1 },
    readOnlyCard: { backgroundColor: '#F0F4F8', flexDirection: 'row', justifyContent: 'space-between' },
    readOnlyText: { color: COLORS.textMuted, fontSize: 14 },
    bodyText: { fontSize: 15, color: COLORS.textDark, fontWeight: '500' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '88%', backgroundColor: '#FFF', borderRadius: 24, padding: 25 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textBlue, marginBottom: 15 },
    input: { backgroundColor: '#F7F9FC', borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#E1E8EF', marginBottom: 25 },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20 },
    cancelText: { color: COLORS.textMuted, fontSize: 16 },
    saveText: { color: COLORS.textBlue, fontWeight: '700', fontSize: 16 },
    logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 40, padding: 16, borderRadius: 14, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#FFE5E5' },
    logoutText: { marginLeft: 12, color: COLORS.danger, fontWeight: '700', fontSize: 16 }
});