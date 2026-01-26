import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, 
    ActivityIndicator, Image, StatusBar, Alert, Linking 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';

const DEFAULT_IMAGE = 'https://i.pravatar.cc/300';
const BASE_URL = 'https://edu-agent-backend-nine.vercel.app/api/v1';

export default function MentorDetails() {
    const { id, agencyId } = useLocalSearchParams(); 
    const router = useRouter();
    const { userToken, user } = useAuth(); // Ensure AuthContext provides 'user' (the student object)

    const [mentor, setMentor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('connect'); 

    useEffect(() => {
        if (id && agencyId) {
            fetchMentorDetails();
        }
    }, [id, agencyId]);

    const fetchMentorDetails = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${BASE_URL}/students/mentors/${agencyId}`, {
                headers: { 
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const json = await res.json();

            if (res.ok && json.mentors) {
                // Find the specific mentor by ID from the array in your response
                const foundMentor = json.mentors.find(m => m._id === id);
                
                if (foundMentor) {
                    setMentor(foundMentor);
                    
                    // CHECK CONNECTION STATUS
                    // Based on your JSON: mentees: [{ "student": "...", "status": "pending" }]
                    if (user?._id && foundMentor.mentees) {
                        const connection = foundMentor.mentees.find(m => m.student === user._id);
                        if (connection) {
                            setConnectionStatus(connection.status); 
                        }
                    }
                } else {
                    Alert.alert("Error", "Mentor not found in this agency.");
                }
            } else {
                Alert.alert("Error", "Failed to fetch data from server.");
            }
        } catch (e) {
            console.error("Fetch Error:", e);
            Alert.alert("Connection Error", "Please check your network.");
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        if (connectionStatus !== 'connect') return;

        setConnecting(true);
        console.log("--- Connection Request Started ---");
        console.log("Connecting to Mentor ID:", id);

        try {
            const res = await fetch(`${BASE_URL}/students/mentors/connect/${id}`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                }
            });

            // Log the HTTP Status (e.g., 200, 400, 500)
            console.log("Backend Response Status:", res.status);

            const result = await res.json();
            
            // Log the full JSON body from the backend
            console.log("Backend Response Body:", JSON.stringify(result, null, 2));

            if (res.ok) {
                setConnectionStatus('pending');
                Alert.alert("Success", result.message || "Connection request sent!");
            } else {
                // If backend sends a 400 or 404, result.message will tell us why
                Alert.alert("Notice", result.message || "Request could not be processed.");
            }
        } catch (error) {
            console.error("Network/Fetch Error:", error);
            Alert.alert("Error", "Failed to send request. Check your internet.");
        } finally {
            setConnecting(false);
            console.log("--- Connection Request Finished ---");
        }
    };

    const getButtonConfig = () => {
        switch(connectionStatus) {
            case 'pending':
                return { color: '#94A3B8', text: 'Request Pending' };
            case 'accepted':
            case 'connected':
                return { color: '#10B981', text: 'Connected' };
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
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                    <Ionicons name="chevron-back" size={26} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Mentor Profile</Text>
                <TouchableOpacity onPress={fetchMentorDetails} style={styles.iconBtn}>
                    <Ionicons name="refresh" size={22} color="#FFF" />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                
                {/* Profile Section */}
                <View style={styles.profileSection}>
                    <Image 
                        source={{ uri: mentor?.profilepic || DEFAULT_IMAGE }} 
                        style={styles.profileImage} 
                    />
                    <Text style={styles.profileName}>{mentor?.name}</Text>
                    <Text style={styles.profileTitle}>
                        {mentor?.isVerified ? 'Verified Education Mentor' : 'Education Mentor'}
                    </Text>

                    {/* Action Buttons */}
                    <View style={styles.actionRow}>
                        <TouchableOpacity 
                            style={styles.actionBtn} 
                            onPress={() => Linking.openURL(`tel:${mentor?.phone}`)}
                        >
                            <Ionicons name="call" size={18} color="#769FCD" />
                            <Text style={styles.actionBtnText}>Call</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.actionBtn, {backgroundColor: '#769FCD'}]} 
                            onPress={() => Linking.openURL(`mailto:${mentor?.email}`)}
                        >
                            <MaterialIcons name="email" size={18} color="#FFF" />
                            <Text style={[styles.actionBtnText, {color: '#FFF'}]}>Email</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Experience Card */}
                {mentor?.experiences && mentor.experiences.length > 0 && (
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
                {mentor?.education && mentor.education.length > 0 && (
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

                {/* Availability Card */}
                {mentor?.availability && mentor.availability.length > 0 && (
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

                {/* Dynamic Connect Button */}
                <TouchableOpacity 
                    style={[styles.connectBtn, { backgroundColor: btn.color }]}
                    onPress={handleConnect}
                    disabled={connecting || connectionStatus !== 'connect'}
                >
                    {connecting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.connectBtnText}>{btn.text}</Text>
                    )}
                </TouchableOpacity>

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
    connectBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});