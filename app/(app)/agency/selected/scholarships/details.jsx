import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';

const COLORS = {
    bg: '#F8FAFD',
    primary: '#87A1C5',
    buttonBlue: '#769FCD',
    text: '#333333',
    textLight: '#666666',
    border: '#EEF2F7',
    white: '#FFFFFF',
};

export default function ScholarshipDetail() {
    const router = useRouter();
    const { id, agencyId, scholarshipName } = useLocalSearchParams();
    const { userToken } = useAuth();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    const formatDate = (dateString) => {
        if (!dateString) return "TBA";
        const date = new Date(dateString);
        // Returns format like: Jan 9, 2026
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const targetId = agencyId || id;
                const response = await fetch(`https://edu-agent-backend-nine.vercel.app/api/v1/agency/scholarships/agency/${targetId}`, {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                });

                const json = await response.json();

                if (response.ok) {
                    const list = json.scholarship || json.data || json;
                    const selected = Array.isArray(list) ? list.find(item => (item._id === id || item.id === id)) : null;

                    if (selected) {
                        setData({
                            title: selected.title || selected.name || scholarshipName,
                            about: selected.about || "No description available.",
                            howToApply: selected.howToApply || "Contact agency for details.",
                            amount: selected.amount || "Check with provider",
                            fieldOfStudy: Array.isArray(selected.fieldOfStudy)
                                ? selected.fieldOfStudy
                                : [selected.fieldOfStudy || "General"],
                            deadline: formatDate(selected.applicationDateline),
                            status: selected.Status || "Active",
                            eligibility: ["Academic Transcripts", "Proof of Enrollment"],
                            duration: "Full Course"
                        });
                    } else {
                        console.warn("Scholarship not found in list");
                    }
                }
            } catch (error) {
                console.error("Fetch error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id, agencyId, userToken]);

    if (loading || !data) {
        return (
            <View style={[styles.safe, styles.center]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ marginTop: 10, color: COLORS.textLight }}>Loading Details...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Scholarship Detail</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Title Section */}
                <View style={styles.titleBanner}>
                    <MaterialCommunityIcons name="trophy" size={32} color="#FFFFFF" />
                    <Text style={styles.scholarshipTitle}>{data.title}</Text>
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>{data.status}</Text>
                    </View>
                </View>

                {/* Quick Info Grid */}
                <View style={styles.infoGrid}>
                    <View style={styles.infoCard}>
                        <MaterialCommunityIcons name="calendar-clock" size={20} color={COLORS.primary} />
                        <Text style={styles.infoLabel}>Deadline</Text>
                        <Text style={styles.infoValue}>{data.deadline}</Text>
                    </View>
                    <View style={styles.infoCard}>
                        <MaterialCommunityIcons name="cash" size={20} color={COLORS.primary} />
                        <Text style={styles.infoLabel}>Amount</Text>
                        <Text style={styles.infoValue}>{data.amount}</Text>
                    </View>
                </View>

                {/* Field of Study Bullet Points */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="book-open-variant" size={22} color={COLORS.primary} />
                        <Text style={styles.sectionTitle}>Field of Study</Text>
                    </View>
                    <View style={styles.bulletContainer}>
                        {data.fieldOfStudy.map((item, index) => (
                            <View key={index} style={styles.bulletItem}>
                                <View style={styles.bulletDot} />
                                <Text style={styles.bulletText}>{item}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* About Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="information" size={22} color={COLORS.primary} />
                        <Text style={styles.sectionTitle}>About</Text>
                    </View>
                    <Text style={styles.paragraph}>{data.about}</Text>
                </View>

                {/* How to Apply Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="send-circle" size={22} color={COLORS.primary} />
                        <Text style={styles.sectionTitle}>How to Apply</Text>
                    </View>
                    <Text style={styles.paragraph}>{data.howToApply}</Text>
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.applyButton} activeOpacity={0.8}>
                    <Text style={styles.applyButtonText}>Apply Now</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 20, 
        paddingVertical: 15, 
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border
    },
    backButton: { 
        width: 40, 
        height: 40, 
        borderRadius: 20, 
        backgroundColor: '#F8FAFD', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: COLORS.text },
    scrollContent: { padding: 20 },
    titleBanner: { 
        backgroundColor: COLORS.buttonBlue, 
        padding: 25, 
        borderRadius: 24, 
        alignItems: 'center',
        shadowColor: COLORS.buttonBlue,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10
    },
    scholarshipTitle: { 
        fontSize: 20, 
        fontWeight: '800', 
        color: '#FFF', 
        marginVertical: 12, 
        textAlign: 'center',
        lineHeight: 28
    },
    statusBadge: { 
        backgroundColor: 'rgba(255,255,255,0.25)', 
        paddingHorizontal: 12, 
        paddingVertical: 6, 
        borderRadius: 12 
    },
    statusText: { color: '#FFF', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    infoGrid: { flexDirection: 'row', gap: 15, marginVertical: 20 },
    infoCard: { 
        flex: 1, 
        backgroundColor: '#FFF', 
        padding: 16, 
        borderRadius: 20, 
        alignItems: 'center', 
        borderWidth: 1, 
        borderColor: COLORS.border,
        elevation: 2
    },
    infoLabel: { fontSize: 12, color: COLORS.textLight, marginBottom: 4 },
    infoValue: { fontSize: 14, fontWeight: '700', color: COLORS.text },
    section: { 
        backgroundColor: '#FFF', 
        padding: 20, 
        borderRadius: 20, 
        marginBottom: 15,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 10
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
    paragraph: { fontSize: 14, color: COLORS.textLight, lineHeight: 22 },
    bulletContainer: { marginTop: 4 },
    bulletItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        paddingRight: 10
    },
    bulletDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.primary,
        marginRight: 12
    },
    bulletText: { fontSize: 14, color: COLORS.textLight, fontWeight: '500' },
    bottomBar: { 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        padding: 20, 
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingBottom: 34 // Extra padding for modern gesture bars
    },
    applyButton: { 
        backgroundColor: COLORS.buttonBlue, 
        height: 56, 
        borderRadius: 18, 
        flexDirection: 'row',
        justifyContent: 'center', 
        alignItems: 'center',
        gap: 10,
        shadowColor: COLORS.buttonBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5
    },
    applyButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});