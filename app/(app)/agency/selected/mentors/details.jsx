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
    const { userToken } = useAuth();

    const [mentor, setMentor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);

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

            if (res.ok) {
                const json = await res.json();
                const foundMentor = json.mentors.find(m => m._id === id);
                
                if (foundMentor) {
                    setMentor(foundMentor);
                } else {
                    Alert.alert("Error", "Mentor details not found.");
                }
            } else {
                Alert.alert("Error", "Failed to fetch mentor details.");
            }
        } catch (e) {
            console.error("Fetch Error:", e);
            Alert.alert("Connection Error", "Please check your network.");
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        setConnecting(true);
        try {
            const res = await fetch(`${BASE_URL}/students/mentors/connect/${id}`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (res.ok) {
                Alert.alert("Success", "Connection request sent!");
            } else {
                Alert.alert("Notice", "Your request is being processed.");
            }
        } catch (error) {
            Alert.alert("Error", "Failed to send request.");
        } finally {
            setConnecting(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#769FCD" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFD" />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={28} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Mentor Profile</Text>
                <TouchableOpacity onPress={fetchMentorDetails} style={styles.refreshBtn}>
                    <Ionicons name="refresh" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                
                {/* Profile Section */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <Image 
                            source={{ uri: mentor?.profilepic || DEFAULT_IMAGE }} 
                            style={styles.profileImage} 
                        />
                    </View>
                    
                    <Text style={styles.profileName}>{mentor?.name}</Text>
                    <Text style={styles.profileTitle}>Certified Education Mentor</Text>
                    
                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{mentor?.status || 'Active'}</Text>
                            <Text style={styles.statLabel}>Status</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{mentor?.experiences?.length || 0}</Text>
                            <Text style={styles.statLabel}>Experiences</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{mentor?.isVerified ? 'Yes' : 'No'}</Text>
                            <Text style={styles.statLabel}>Verified</Text>
                        </View>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${mentor?.phone}`)}>
                        <Ionicons name="call" size={22} color="#769FCD" />
                        <Text style={styles.actionBtnText}>Call</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`mailto:${mentor?.email}`)}>
                        <MaterialIcons name="email" size={22} color="#769FCD" />
                        <Text style={styles.actionBtnText}>Email</Text>
                    </TouchableOpacity>
                </View>

                {/* Experience Section */}
                {mentor?.experiences && mentor.experiences.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="briefcase" size={20} color="#769FCD" />
                            <Text style={styles.sectionTitle}>Experience</Text>
                        </View>
                        <View style={styles.sectionContent}>
                            {mentor.experiences.map((exp, index) => (
                                <View key={index} style={styles.experienceItem}>
                                    <Ionicons name="checkmark-circle" size={18} color="#10B981" style={styles.experienceIcon} />
                                    <Text style={styles.experienceText}>{exp}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Education Section */}
                {mentor?.education && mentor.education.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="school" size={20} color="#769FCD" />
                            <Text style={styles.sectionTitle}>Education</Text>
                        </View>
                        <View style={styles.sectionContent}>
                            {mentor.education.map((item, index) => (
                                <View key={index} style={styles.educationItem}>
                                    <Ionicons name="ellipse" size={8} color="#769FCD" style={styles.bulletIcon} />
                                    <Text style={styles.educationText}>{item}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Availability Section */}
                {mentor?.availability && mentor.availability.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="time" size={20} color="#769FCD" />
                            <Text style={styles.sectionTitle}>Availability</Text>
                        </View>
                        <View style={styles.sectionContent}>
                            {mentor.availability.map((item, index) => (
                                <View key={index} style={styles.availabilityItem}>
                                    <Ionicons name="time-outline" size={16} color="#769FCD" style={styles.availabilityIcon} />
                                    <Text style={styles.availabilityText}>{item}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                <TouchableOpacity 
                    style={[styles.connectBtn, connecting && { opacity: 0.7 }]}
                    onPress={handleConnect}
                    disabled={connecting}
                >
                    {connecting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <Ionicons name="chatbubble-ellipses" size={22} color="#FFF" style={styles.connectIcon} />
                            <Text style={styles.connectBtnText}>Connect with Mentor</Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#F8FAFD' 
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFD'
    },
    loadingText: {
        marginTop: 12,
        color: '#94A3B8',
        fontSize: 14,
    },
    scrollContent: {
        paddingBottom: 30,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 18,
        backgroundColor: '#769FCD',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    headerTitle: { 
        fontSize: 20, 
        fontWeight: '600', 
        color: '#FFF',
    },
    backBtn: {
        padding: 6,
    },
    refreshBtn: {
        padding: 6,
    },
    profileSection: {
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 25,
        paddingBottom: 20,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: '#FFF',
        backgroundColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#10B981',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    profileName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 4,
    },
    profileTitle: {
        fontSize: 16,
        color: '#64748B',
        marginBottom: 20,
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 16,
        marginTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 3,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#769FCD',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#64748B',
    },
    statDivider: {
        width: 1,
        height: '60%',
        backgroundColor: '#E2E8F0',
        alignSelf: 'center',
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 20,
        marginVertical: 15,
    },
    actionBtn: {
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        minWidth: 70,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    actionBtnText: {
        color: '#769FCD',
        fontSize: 12,
        fontWeight: '500',
        marginTop: 6,
    },
    section: {
        backgroundColor: '#FFF',
        marginHorizontal: 20,
        marginTop: 15,
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 3,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1E293B',
        marginLeft: 10,
    },
    sectionContent: {
        paddingLeft: 5,
    },
    aboutText: {
        fontSize: 14,
        color: '#475569',
        lineHeight: 22,
    },
    experienceItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    experienceIcon: {
        marginRight: 12,
        marginTop: 2,
    },
    experienceText: {
        flex: 1,
        fontSize: 14,
        color: '#475569',
        lineHeight: 20,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginLeft: -5,
        marginTop: -5,
    },
    tag: {
        backgroundColor: '#F1F5F9',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        marginLeft: 5,
        marginTop: 5,
    },
    tagText: {
        color: '#769FCD',
        fontSize: 12,
        fontWeight: '500',
    },
    educationItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    bulletIcon: {
        marginRight: 12,
        marginTop: 6,
    },
    educationText: {
        flex: 1,
        fontSize: 14,
        color: '#475569',
        lineHeight: 20,
    },
    availabilityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    availabilityIcon: {
        marginRight: 12,
    },
    availabilityText: {
        flex: 1,
        fontSize: 14,
        color: '#475569',
    },
    connectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#769FCD',
        marginHorizontal: 20,
        marginTop: 25,
        marginBottom: 10,
        paddingVertical: 16,
        borderRadius: 14,
        shadowColor: '#769FCD',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    connectIcon: {
        marginRight: 10,
    },
    connectBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
});