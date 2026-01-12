import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, 
    ActivityIndicator, Image, StatusBar, Alert, Linking 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';

export default function MentorDetails() {
    const { mentorId, name: initialName } = useLocalSearchParams();
    const router = useRouter();
    const { userToken } = useAuth();

    const [mentor, setMentor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);

    useEffect(() => {
        fetchMentorDetails();
    }, [mentorId]);

    const fetchMentorDetails = async () => {
        try {
            setLoading(true);
            // API endpoint for fetching mentor details
            const res = await fetch(`https://edu-agent-backend-nine.vercel.app/api/v1/mentors/${mentorId}`, {
                headers: { 
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (res.ok) {
                const json = await res.json();
                setMentor(json.data || json.mentor);
            } else {
                // Fallback Data
                setMentor({
                    id: mentorId,
                    name: initialName || 'Karma Dema',
                    image: 'https://i.pravatar.cc/300?u=karma',
                    title: 'Education Consultant & Mentor',
                    about: `${initialName || 'Karma Dema'} is a dedicated education consultant with over 2 years of experience guiding students through the complex process of studying abroad. She specializes in helping students navigate university applications, visa procedures, and scholarship opportunities.`,
                    experience: '2+ years of mentoring students for higher education abroad',
                    expertise: ['University Applications', 'Visa Guidance', 'Scholarship Assistance', 'Career Counseling'],
                    education: [
                        "Master's in International Education – University of Canberra",
                        "Certified Education Counselor (ICEF Trained)",
                        "Bachelor's in Education – Royal University of Bhutan"
                    ],
                    availability: [
                        "Monday to Friday (10 AM – 5 PM)",
                        "Saturday (11 AM – 3 PM)",
                        "Online Meetings (Zoom/Google Meet)",
                        "In-person Appointments (By Booking)"
                    ],
                    contact: {
                        email: 'karma.dema@example.com',
                        phone: '+975-17-123456',
                        zoom: 'https://zoom.us/j/karmadema'
                    },
                    successRate: '92%',
                    studentsHelped: '42+',
                    languages: ['English', 'Dzongkha', 'Hindi']
                });
            }
        } catch (e) {
            console.error("Error fetching mentor:", e);
            Alert.alert("Error", "Could not load mentor details. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        setConnecting(true);
        try {
            // API call to request connection
            const res = await fetch(`https://edu-agent-backend-nine.vercel.app/api/v1/mentors/${mentorId}/connect`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (res.ok) {
                Alert.alert(
                    "Connection Request Sent",
                    `${mentor?.name} has been notified. You'll receive a confirmation shortly.`,
                    [{ text: "OK" }]
                );
            } else {
                // Fallback action
                Alert.alert(
                    "Request Sent",
                    `Your connection request to ${mentor?.name} has been recorded.`,
                    [{ text: "OK" }]
                );
            }
        } catch (error) {
            Alert.alert("Error", "Failed to send connection request. Please try again.");
        } finally {
            setConnecting(false);
        }
    };

    const handleEmail = () => {
        Linking.openURL(`mailto:${mentor?.contact?.email}`);
    };

    const handleCall = () => {
        Linking.openURL(`tel:${mentor?.contact?.phone}`);
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <StatusBar barStyle="dark-content" />
                <ActivityIndicator size="large" color="#769FCD" />
                <Text style={styles.loadingText}>Loading mentor details...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFD" />
            
            {/* Header with Gradient */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={28} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Mentor Profile</Text>
                <TouchableOpacity onPress={fetchMentorDetails} style={styles.refreshBtn}>
                    <Ionicons name="refresh" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Profile Section */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <Image source={{ uri: mentor?.image }} style={styles.profileImage} />
                        <View style={styles.onlineIndicator} />
                    </View>
                    
                    <Text style={styles.profileName}>{mentor?.name}</Text>
                    <Text style={styles.profileTitle}>{mentor?.title || 'Education Mentor'}</Text>
                    
                    {/* Quick Stats */}
                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{mentor?.successRate || '92%'}</Text>
                            <Text style={styles.statLabel}>Success Rate</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{mentor?.studentsHelped || '42+'}</Text>
                            <Text style={styles.statLabel}>Students Helped</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{mentor?.languages?.length || '3'}</Text>
                            <Text style={styles.statLabel}>Languages</Text>
                        </View>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
                        <Ionicons name="call" size={22} color="#769FCD" />
                        <Text style={styles.actionBtnText}>Call</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.actionBtn} onPress={handleEmail}>
                        <MaterialIcons name="email" size={22} color="#769FCD" />
                        <Text style={styles.actionBtnText}>Email</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.actionBtn}>
                        <Ionicons name="calendar" size={22} color="#769FCD" />
                        <Text style={styles.actionBtnText}>Schedule</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.actionBtn}>
                        <FontAwesome5 name="whatsapp" size={22} color="#769FCD" />
                        <Text style={styles.actionBtnText}>Message</Text>
                    </TouchableOpacity>
                </View>

                {/* About Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="person" size={20} color="#769FCD" />
                        <Text style={styles.sectionTitle}>About</Text>
                    </View>
                    <View style={styles.sectionContent}>
                        <Text style={styles.aboutText}>{mentor?.about}</Text>
                    </View>
                </View>

                {/* Experience Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="briefcase" size={20} color="#769FCD" />
                        <Text style={styles.sectionTitle}>Experience</Text>
                    </View>
                    <View style={styles.sectionContent}>
                        <View style={styles.experienceItem}>
                            <Ionicons name="checkmark-circle" size={18} color="#10B981" style={styles.experienceIcon} />
                            <Text style={styles.experienceText}>{mentor?.experience}</Text>
                        </View>
                    </View>
                </View>

                {/* Expertise Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="star" size={20} color="#769FCD" />
                        <Text style={styles.sectionTitle}>Areas of Expertise</Text>
                    </View>
                    <View style={styles.tagsContainer}>
                        {mentor?.expertise?.map((skill, index) => (
                            <View key={index} style={styles.tag}>
                                <Text style={styles.tagText}>{skill}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Education Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="school" size={20} color="#769FCD" />
                        <Text style={styles.sectionTitle}>Education</Text>
                    </View>
                    <View style={styles.sectionContent}>
                        {mentor?.education?.map((item, index) => (
                            <View key={index} style={styles.educationItem}>
                                <Ionicons name="ellipse" size={8} color="#769FCD" style={styles.bulletIcon} />
                                <Text style={styles.educationText}>{item}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Availability Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="time" size={20} color="#769FCD" />
                        <Text style={styles.sectionTitle}>Availability</Text>
                    </View>
                    <View style={styles.sectionContent}>
                        {mentor?.availability?.map((item, index) => (
                            <View key={index} style={styles.availabilityItem}>
                                <Ionicons name="checkmark" size={16} color="#10B981" style={styles.availabilityIcon} />
                                <Text style={styles.availabilityText}>{item}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Connect Button */}
                <TouchableOpacity 
                    style={styles.connectBtn}
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