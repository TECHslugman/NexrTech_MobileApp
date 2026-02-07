import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Image, StatusBar, Alert, Linking
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';
import { Config } from '../../../../config';
import Toast from 'react-native-toast-message';

const DEFAULT_IMAGE_URL = 'https://ui-avatars.com/api/?background=769FCD&color=fff&name=Mentor';

export default function MentorDetails() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { userToken } = useAuth(); 

    const [mentor, setMentor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    
    // Logic States
    const [connectionStatus, setConnectionStatus] = useState('connect'); 
    const [isBlockedByExisting, setIsBlockedByExisting] = useState(false);

    useEffect(() => {
        if (id) {
            fetchAllData();
        }
    }, [id]);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            
            // 1. Fetch Mentor Details
            const mentorRes = await fetch(`${Config.API_BASE_URL}/agency/mentors/${id}`, {
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                }
            });
            const mentorJson = await mentorRes.json();
            console.log("Fetched Mentor Data:", mentorJson);
            // 2. Fetch Student Profile
            const profileRes = await fetch(`${Config.API_BASE_URL}/students/profile`, {
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                }
            });
            const profileJson = await profileRes.json();

            if (mentorRes.ok && mentorJson.mentor) {
                setMentor(mentorJson.mentor);

                if (profileRes.ok && profileJson.profile) {
                    const activeConn = profileJson.profile.connectedMentor;
                    
                    // Logic: Block if student has a pending/confirmed mentor elsewhere
                    if (activeConn && (activeConn.status === 'pending' || activeConn.status === 'confirmed')) {
                        if (activeConn.mentor === id) {
                            setConnectionStatus(activeConn.status);
                            setIsBlockedByExisting(false);
                        } else {
                            setConnectionStatus('blocked');
                            setIsBlockedByExisting(true);
                        }
                    } else {
                        setConnectionStatus('connect');
                        setIsBlockedByExisting(false);
                    }
                }
            } else {
                Toast.show({ type: 'error', text1: 'Error', text2: 'Mentor not found' });
            }
        } catch (e) {
            console.error("Fetch Error:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        if (connectionStatus !== 'connect' || isBlockedByExisting) return;

        setConnecting(true);
        try {
            const res = await fetch(`${Config.API_BASE_URL}/students/mentors/connect/${id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await res.json();

            if (res.ok) {
                setConnectionStatus('pending');
                Toast.show({
                    type: 'success',
                    text1: 'Request Sent!',
                    text2: result.message || "Your connection request is now pending."
                });
            } else {
                Toast.show({
                    type: 'info',
                    text1: 'Notice',
                    text2: result.message || "Request could not be processed."
                });
            }
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Request Failed' });
        } finally {
            setConnecting(false);
        }
    };

    const getButtonConfig = () => {
        if (isBlockedByExisting) {
            return { color: '#94A3B8', text: 'Another Request Active' };
        }
        switch (connectionStatus) {
            case 'pending':
                return { color: '#F59E0B', text: 'Request Pending' };
            case 'confirmed':
            case 'accepted':
            case 'connected':
                return { color: '#10B981', text: 'Your Mentor' };
            default:
                return { color: '#769FCD', text: 'Connect with Mentor' };
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#769FCD" />
            </SafeAreaView>
        );
    }

    const btn = getButtonConfig();

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#769FCD" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                    <Ionicons name="chevron-back" size={26} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Mentor Profile</Text>
                <TouchableOpacity onPress={fetchAllData} style={styles.iconBtn}>
                    <Ionicons name="refresh" size={22} color="#FFF" />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.profileSection}>
                    <Image
                        source={{ uri: mentor?.profilepic || DEFAULT_IMAGE_URL }}
                        style={styles.profileImage}
                    />
                    <Text style={styles.profileName}>{mentor?.name}</Text>
                    <Text style={styles.profileTitle}>
                        {mentor?.isVerified ? 'Verified Education Mentor' : 'Education Mentor'}
                    </Text>

                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => Linking.openURL(`tel:${mentor?.phone}`)}
                        >
                            <Ionicons name="call" size={18} color="#769FCD" />
                            <Text style={styles.actionBtnText}>Call</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#769FCD' }]}
                            onPress={() => Linking.openURL(`mailto:${mentor?.email}`)}
                        >
                            <MaterialIcons name="email" size={18} color="#FFF" />
                            <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Email</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Experience Card */}
                {mentor?.experiences?.length > 0 && (
                    <View style={styles.infoCard}>
                        <Text style={styles.cardHeader}>Experience</Text>
                        {mentor.experiences.map((exp, i) => (
                            <View key={i} style={styles.listItem}>
                                <Ionicons name="checkmark-sharp" size={16} color="#10B981" />
                                <Text style={styles.listText}>{exp}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Education Card */}
                {mentor?.education?.length > 0 && (
                    <View style={styles.infoCard}>
                        <Text style={styles.cardHeader}>Education</Text>
                        {mentor.education.map((edu, i) => (
                            <View key={i} style={styles.listItem}>
                                <View style={styles.bullet} />
                                <Text style={styles.listText}>{edu}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Availability Card (RE-ADDED) */}
                {mentor?.availability?.length > 0 && (
                    <View style={styles.infoCard}>
                        <Text style={styles.cardHeader}>Availability</Text>
                        {mentor.availability.map((time, i) => (
                            <View key={i} style={styles.listItem}>
                                <Ionicons name="time-outline" size={16} color="#769FCD" />
                                <Text style={styles.listText}>{time}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Connect Button */}
                <TouchableOpacity
                    style={[styles.connectBtn, { backgroundColor: btn.color }]}
                    onPress={handleConnect}
                    disabled={connecting || connectionStatus !== 'connect' || isBlockedByExisting}
                >
                    {connecting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.connectBtnText}>{btn.text}</Text>
                    )}
                </TouchableOpacity>

                {isBlockedByExisting && (
                    <Text style={styles.blockedText}>
                        You already have an active or pending mentor request.
                    </Text>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFD' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#769FCD',
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    iconBtn: { padding: 5 },
    scrollContent: { padding: 16 },
    profileSection: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 16,
    },
    profileImage: { width: 100, height: 100, borderRadius: 50, marginBottom: 16, backgroundColor: '#F1F5F9' },
    profileName: { fontSize: 22, fontWeight: '700', color: '#1E293B' },
    profileTitle: { fontSize: 14, color: '#64748B', marginBottom: 20 },
    actionRow: { flexDirection: 'row', gap: 12, width: '100%' },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        height: 44,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#769FCD',
        alignItems: 'center',
        justifyContent: 'center'
    },
    actionBtnText: { marginLeft: 8, fontWeight: '600', color: '#769FCD' },
    infoCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 12
    },
    cardHeader: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 12 },
    listItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
    listText: { fontSize: 14, color: '#475569', flex: 1, marginLeft: 10, lineHeight: 20 },
    bullet: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#769FCD', marginTop: 8 },
    connectBtn: { height: 52, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
    connectBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    blockedText: { textAlign: 'center', color: '#64748B', marginTop: 10, fontSize: 12, paddingHorizontal: 20 }
});