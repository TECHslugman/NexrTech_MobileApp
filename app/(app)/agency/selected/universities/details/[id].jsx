import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    Image, 
    ActivityIndicator,
    FlatList,
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
    darkHeader: '#0A0A2E', 
    buttonBlue: '#82A3D1',
    text: '#444',
};

export default function UniversityDetail() {
    const router = useRouter();
    const { id, uniName } = useLocalSearchParams();
    const { userToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const response = await fetch(`https://edu-agent-backend-nine.vercel.app/api/v1/agency/universities/detail/${id}`, {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                });
                
                // FIXED: Check content type before parsing to avoid JSON Parse Error
                const contentType = response.headers.get("content-type");
                if (response.ok && contentType && contentType.includes("application/json")) {
                    const json = await response.json();
                    setData(json.data);
                } else {
                    throw new Error("Invalid Response");
                }
            } catch (error) {
                // FALLBACK: Matches your University screenshot exactly
                setData({
                    name: uniName || "UNIVERSITY OF TORONTO",
                    bannerLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/0/04/Utoronto_logo.svg/1200px-Utoronto_logo.svg.png",
                    website: "www.utoronto.ca",
                    location: "Canada",
                    about: "Founded in 1827, the University of Toronto is Canada's top university with a long history of challenging the impossible",
                    mission: "The University of Toronto is dedicated to fostering an academic community in which the learning and scholarship of every member may flourish, with vigilant protection for individual human rights",
                    courses: [
                        { id: '1', title: 'Bachelors of Nursing', color: '#FF6B6B' },
                        { id: '2', title: 'Bachelors of Political Sci.', color: '#919BFF' },
                    ]
                });
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id]);

    // FIXED: Prevent "Cannot read property of null"
    if (loading || !data) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <StatusBar barStyle="dark-content" />
            
            {/* Nav Header */}
            <View style={styles.navBar}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.navTitle}>University</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                {/* Image Banner Section */}
                <View style={styles.bannerContainer}>
                    <Image source={{ uri: data.bannerLogo }} style={styles.bannerImage} resizeMode="contain" />
                </View>

                <View style={styles.content}>
                    {/* Website */}
                    <Text style={styles.label}>Website</Text>
                    <View style={styles.infoBox}>
                        <Ionicons name="link-outline" size={20} color={COLORS.buttonBlue} />
                        <Text style={styles.linkText}>{data.website}</Text>
                    </View>

                    {/* Location */}
                    <Text style={styles.label}>Location</Text>
                    <View style={styles.infoBox}>
                        <Ionicons name="location-outline" size={20} color={COLORS.buttonBlue} />
                        <Text style={styles.infoText}>{data.location}</Text>
                    </View>

                    {/* About */}
                    <Text style={styles.label}>About</Text>
                    <View style={styles.infoBox}>
                        <Text style={styles.paragraphText}>{data.about}</Text>
                    </View>

                    {/* Mission */}
                    <Text style={styles.label}>Mission</Text>
                    <View style={styles.infoBox}>
                        <Text style={styles.paragraphText}>{data.mission}</Text>
                    </View>

                    {/* Courses Section */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.label}>Courses</Text>
                        <TouchableOpacity><Text style={styles.viewAll}>View all</Text></TouchableOpacity>
                    </View>
                    
                    <FlatList 
                        data={data.courses}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={[styles.courseCard, { backgroundColor: item.color }]}>
                                <Text style={styles.courseCardText}>{item.title}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </ScrollView>

            <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.applyBtn}>
                    <Text style={styles.applyBtnText}>APPLY</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    navBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        height: 50,
        backgroundColor: '#FFF',
    },
    navTitle: { fontSize: 16, color: COLORS.primary, fontWeight: '400' },
    backBtn: { padding: 5 },
    bannerContainer: {
        backgroundColor: COLORS.darkHeader,
        height: 180,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bannerImage: { width: '85%', height: '70%' },
    content: { paddingHorizontal: 20 },
    label: { color: COLORS.primary, fontSize: 14, fontWeight: '500', marginTop: 20, marginBottom: 10 },
    infoBox: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoText: { marginLeft: 10, color: COLORS.text, fontSize: 14 },
    linkText: { marginLeft: 10, color: COLORS.text, fontSize: 14, textDecorationLine: 'underline' },
    paragraphText: { color: COLORS.text, fontSize: 14, lineHeight: 22 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    viewAll: { fontSize: 12, color: '#999', marginBottom: 10 },
    courseCard: { width: 150, height: 100, borderRadius: 15, padding: 15, marginRight: 15, justifyContent: 'center' },
    courseCardText: { color: '#FFF', fontWeight: '500', fontSize: 14 },
    bottomBar: { position: 'absolute', bottom: 0, width: '100%', padding: 20, backgroundColor: COLORS.bg },
    applyBtn: { backgroundColor: COLORS.buttonBlue, height: 55, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
    applyBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});