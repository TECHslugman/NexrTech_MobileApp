import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    StatusBar
} from 'react-native';
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

export default function EventDetail() {
    const router = useRouter();
    const { id, agencyId, eventTitle } = useLocalSearchParams();
    const { userToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        const fetchEventDetails = async () => {
            try {
                const response = await fetch(`https://edu-agent-backend-nine.vercel.app/api/v1/agency/events/detail/${id}`, {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                });

                const fallbackData = {
                    title: eventTitle || "European Higher Education Fair",
                    image: 'https://ehef.id/storage/files/shares/logo-ehef-id.png',
                    date: "18th November 2025",
                    time: "10:00 AM – 12:30 PM (BST)",
                    location: "Hotel Osel Conference Hall, Thimphu (or 'Online via Zoom')",
                    about: "This event is designed to help students and parents understand the complete process of applying to study abroad, with a special focus on admissions, visa requirements, scholarships, and documentation.",
                    whoShouldAttend: [
                        "Class 12 Graduates",
                        "Bachelor's Students",
                        "Students planning for Feb/July 2026 Intake"
                    ],
                    agenda: [
                        "Admission Process for Australian Universities",
                        "Visa Documentation Guidance",
                        "Scholarships & Financial Aid",
                        "Live Q&A with University Representative"
                    ],
                    registration: {
                        fee: "Free Entry",
                        seats: "100",
                        deadline: "16th Nov 2025"
                    }
                };

                if (response.ok) {
                    const json = await response.json();
                    setData({ ...fallbackData, ...json.event });
                } else {
                    setData(fallbackData);
                }
            } catch (error) {
                setData(fallbackData); // Use provisions if API fails
            } finally {
                setLoading(false);
            }
        };
        fetchEventDetails();
    }, [id]);

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
    if (!data) return null;

    return (
        <SafeAreaView style={styles.safe} edges={['bottom']}>
            <StatusBar barStyle="dark-content" />
            
            {/* Custom Header */}
            <View style={styles.navHeader}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
                    <Ionicons name="chevron-back" size={26} color="#333" />
                </TouchableOpacity>
                <Text style={styles.navTitle}>Event</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Event Image Card */}
                <View style={styles.imageCard}>
                    <Image source={{ uri: data.image }} style={styles.mainImage} resizeMode="contain" />
                </View>

                <View style={styles.content}>
                    {/* Date & Time */}
                    <Text style={styles.label}>Date & Time</Text>
                    <View style={styles.card}>
                        <Text style={styles.bulletText}>•  Date: {data.date}</Text>
                        <Text style={styles.bulletText}>•  Time: {data.time}</Text>
                    </View>

                    {/* Location */}
                    <Text style={styles.label}>Location</Text>
                    <View style={styles.card}>
                        <View style={styles.row}>
                            <Ionicons name="location-outline" size={20} color={COLORS.primary} />
                            <Text style={styles.bodyText}>{data.location}</Text>
                        </View>
                    </View>

                    {/* About */}
                    <Text style={styles.label}>About</Text>
                    <View style={styles.card}>
                        <Text style={styles.bodyText}>{data.about}</Text>
                    </View>

                    {/* Who Should Attend */}
                    <Text style={styles.label}>Who should attend?</Text>
                    <View style={styles.card}>
                        {data.whoShouldAttend.map((item, i) => (
                            <Text key={i} style={styles.bulletText}>•  {item}</Text>
                        ))}
                    </View>

                    {/* Agenda */}
                    <Text style={styles.label}>Agenda</Text>
                    <View style={styles.card}>
                        {data.agenda.map((item, i) => (
                            <Text key={i} style={styles.bulletText}>•  {item}</Text>
                        ))}
                    </View>

                    {/* Registration Details */}
                    <Text style={styles.label}>Registration</Text>
                    <View style={styles.card}>
                        <Text style={styles.bulletText}>•  Fee: {data.registration.fee}</Text>
                        <Text style={styles.bulletText}>•  Seats Available: {data.registration.seats}</Text>
                        <Text style={styles.bulletText}>•  Registration Deadline: {data.registration.deadline}</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Button */}
            <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.registerButton}>
                    <Text style={styles.registerText}>REGISTER NOW</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    navHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
    navTitle: { color: COLORS.primary, fontSize: 16, fontWeight: '500' },
    imageCard: { 
        backgroundColor: COLORS.white, margin: 20, borderRadius: 15, height: 180, 
        justifyContent: 'center', alignItems: 'center', padding: 20, elevation: 2 
    },
    mainImage: { width: '100%', height: '100%' },
    content: { paddingHorizontal: 20 },
    label: { color: COLORS.primary, fontSize: 14, fontWeight: '500', marginBottom: 8, marginTop: 10 },
    card: { backgroundColor: COLORS.white, borderRadius: 12, padding: 15, marginBottom: 12 },
    bulletText: { color: '#444', fontSize: 14, marginBottom: 5, lineHeight: 20 },
    bodyText: { color: '#444', fontSize: 14, lineHeight: 22, flex: 1, marginLeft: 8 },
    row: { flexDirection: 'row', alignItems: 'center' },
    bottomBar: { position: 'absolute', bottom: 0, width: '100%', padding: 20, backgroundColor: COLORS.bg },
    registerButton: {
        backgroundColor: COLORS.buttonBlue, height: 50, borderRadius: 25,
        justifyContent: 'center', alignItems: 'center', elevation: 3
    },
    registerText: { color: '#FFF', fontWeight: 'bold', fontSize: 14, letterSpacing: 0.5 }
});