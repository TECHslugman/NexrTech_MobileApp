import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../../../context/AuthContext';

const COLORS = {
    bg: '#F8FAFD',
    white: '#FFFFFF',
    primary: '#87A1C5',
    buttonBlue: '#769FCD',
};

export default function ScholarshipDetail() {
    const router = useRouter();
    const { id, scholarshipName } = useLocalSearchParams();
    const { userToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const response = await fetch(`https://edu-agent-backend-nine.vercel.app/api/v1/agency/scholarships/detail/${id}`, {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                });
                
                const fallback = {
                    name: scholarshipName || "Australia Awards",
                    about: "External Scholarship provided to you by Department of Foreign Affairs and Trade",
                    howToApply: "Read through the available details and deadlines for this scholarship on the UC Scholarships website.",
                    providerName: "UNIVERSITY OF CANBERRA",
                    providerLogo: "https://via.placeholder.com/50" 
                };

                if (response.ok) {
                    const json = await response.json();
                    setData({ ...fallback, ...json.data });
                } else {
                    setData(fallback);
                }
            } catch (error) {
                setData({ 
                    name: scholarshipName || "Australia Awards",
                    about: "External Scholarship provided to you by Department of Foreign Affairs and Trade",
                    howToApply: "Read through the available details and deadlines for this scholarship on the UC Scholarships website.",
                    providerName: "UNIVERSITY OF CANBERRA"
                });
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id]);

    if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;

    return (
        <SafeAreaView style={styles.safe} edges={['bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={26} color="#333" /></TouchableOpacity>
                <Text style={styles.headerTitle}>Scholarships</Text>
                <View style={{ width: 26 }} />
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Hero Header */}
                <View style={styles.heroCard}>
                    <Text style={styles.heroTitle}>{data.name}</Text>
                </View>

                <View style={styles.content}>
                    <Text style={styles.label}>About</Text>
                    <View style={styles.card}><Text style={styles.bodyText}>{data.about}</Text></View>

                    <Text style={styles.label}>How to Apply</Text>
                    <View style={styles.card}><Text style={styles.bodyText}>{data.howToApply}</Text></View>

                    <Text style={styles.label}>Provided by:</Text>
                    <View style={styles.providerCard}>
                        <Ionicons name="business" size={24} color={COLORS.primary} />
                        <Text style={styles.providerName}>{data.providerName}</Text>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.applyBtn}><Text style={styles.applyBtnText}>APPLY</Text></TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#FFF' },
    headerTitle: { fontSize: 16, color: COLORS.primary, fontWeight: '500' },
    heroCard: { backgroundColor: COLORS.primary, height: 180, justifyContent: 'center', alignItems: 'center', padding: 20 },
    heroTitle: { color: '#FFF', fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
    content: { padding: 20 },
    label: { color: COLORS.primary, fontSize: 14, fontWeight: '500', marginBottom: 10, marginTop: 15 },
    card: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, elevation: 1 },
    bodyText: { color: '#444', fontSize: 14, lineHeight: 22 },
    providerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#EEE', width: '60%' },
    providerName: { marginLeft: 10, fontWeight: 'bold', color: '#444', fontSize: 12 },
    bottomBar: { position: 'absolute', bottom: 0, width: '100%', padding: 20, backgroundColor: COLORS.bg },
    applyBtn: { backgroundColor: COLORS.buttonBlue, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
    applyBtnText: { color: '#FFF', fontWeight: 'bold', letterSpacing: 1 }
});