import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    StatusBar,
    FlatList
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../../../context/AuthContext'; // Reverted to 4 levels as per your check

// Adjust this path to your actual local asset location
const DEFAULT_UNI_LOGO = require('../../../../../../assets/images/agencies/default.png');

const COLORS = {
    bg: '#F8FAFD',
    white: '#FFFFFF',
    textBlue: '#87A1C5',
    primaryBlue: '#769FCD',
    headerRed: '#FF6B6B', 
};

export default function CourseDetail() {
    const router = useRouter();
    const { courseId, agencyId, courseName, headerColor } = useLocalSearchParams();
    const { userToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        const fetchCourseDetails = async () => {
            try {
                // Fetching from the profile to get the university partners
                const response = await fetch(`https://edu-agent-backend-nine.vercel.app/api/v1/agency/profile/${agencyId}`, {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                });
                
                // 1. Define fallback data immediately to ensure 'data' is never null
                const fallbackData = {
                    title: courseName || "Bachelors of Nursing",
                    aboutItems: [
                        "Bachelor's Degree",
                        "Duration: 4 years",
                        "Intakes: February, July"
                    ],
                    whyStudy: "A BSN program covers core subjects like pharmacology, anatomy, and microbiology, includes clinical hours, and develops critical thinking and leadership skills.",
                    tuition: "AUD $36,000 per year",
                    entryReq: [
                        "Class 12 with minimum 60% in Science stream",
                        "IELTS 6.5 (no band below 6.0)",
                        "OR PTE 58+"
                    ],
                    docs: [
                        "Passport",
                        "Class 10 & 12 Mark Sheets",
                        "IELTS/PTE Score",
                        "SOP",
                        "Personal Statement"
                    ],
                    providers: []
                };

                if (response.ok) {
                    const json = await response.json();
                    const agency = json.agency || json.profile;
                    
                    setData({
                        ...fallbackData,
                        providers: agency?.partnerUniversities || []
                    });
                } else {
                    // If API responds with error (like 500), use fallback
                    setData(fallbackData);
                }
            } catch (error) {
                console.log("Error fetching course details, using fallback.");
                setData({
                    title: courseName || "Course Info",
                    aboutItems: ["Information unavailable"],
                    whyStudy: "Unable to load data at this time.",
                    tuition: "N/A",
                    entryReq: ["N/A"],
                    docs: ["N/A"],
                    providers: []
                });
            } finally {
                setLoading(false);
            }
        };
        fetchCourseDetails();
    }, [courseId]);

    // 2. Prevent rendering until loading is done
    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primaryBlue} />
            </View>
        );
    }

    // 3. Final safety check for 'data' object
    if (!data) return null;

    return (
        <SafeAreaView style={styles.safe} edges={['bottom']}>
            <StatusBar barStyle="light-content" />
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                
                {/* 1. Colored Header */}
                <View style={[styles.header, { backgroundColor: headerColor || COLORS.headerRed }]}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={26} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitleText}>Course</Text>
                    <Text style={styles.courseTitle}>{data.title}</Text>
                </View>

                <View style={styles.content}>
                    <Text style={styles.label}>About</Text>
                    <View style={styles.card}>
                        {data.aboutItems.map((item, i) => (
                            <Text key={i} style={styles.bulletText}>•  {item}</Text>
                        ))}
                    </View>

                    <Text style={styles.label}>Why study this course?</Text>
                    <View style={styles.card}>
                        <Text style={styles.bodyText}>{data.whyStudy}</Text>
                    </View>

                    <Text style={styles.label}>Tuition Fees</Text>
                    <View style={styles.card}>
                        <Text style={styles.bodyText}>{data.tuition}</Text>
                    </View>

                    <Text style={styles.label}>Entry Requirements</Text>
                    <View style={styles.card}>
                        {data.entryReq.map((item, i) => (
                            <Text key={i} style={styles.bulletText}>•  {item}</Text>
                        ))}
                    </View>

                    <Text style={styles.label}>Document Requirements</Text>
                    <View style={styles.card}>
                        {data.docs.map((item, i) => (
                            <Text key={i} style={styles.bulletText}>•  {item}</Text>
                        ))}
                    </View>

                    <View style={styles.row}>
                        <Text style={styles.label}>Provided by:</Text>
                        <TouchableOpacity><Text style={styles.viewMore}>View more</Text></TouchableOpacity>
                    </View>
                    
                    <FlatList
                        horizontal
                        data={data.providers}
                        keyExtractor={(item, index) => item._id || index.toString()}
                        showsHorizontalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <View style={styles.providerCard}>
                                <Image 
                                    source={item.logo ? { uri: item.logo } : DEFAULT_UNI_LOGO} 
                                    style={styles.providerLogo} 
                                    resizeMode="contain" 
                                />
                            </View>
                        )}
                        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                    />
                </View>
            </ScrollView>

            {/* Sticky Apply Button */}
            <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.applyButton}>
                    <Text style={styles.applyText}>APPLY</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { height: 220, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
    backBtn: { position: 'absolute', top: 50, left: 20 },
    headerTitleText: { color: 'rgba(255,255,255,0.8)', fontSize: 16, position: 'absolute', top: 50 },
    courseTitle: { color: '#FFF', fontSize: 32, fontWeight: 'bold', textAlign: 'center', paddingHorizontal: 40, lineHeight: 40 },
    content: { padding: 20 },
    label: { color: COLORS.textBlue, fontSize: 15, fontWeight: '500', marginBottom: 10, marginTop: 15 },
    card: { backgroundColor: COLORS.white, borderRadius: 12, padding: 18, marginBottom: 10 },
    bulletText: { color: '#444', fontSize: 14, marginBottom: 6, lineHeight: 20 },
    bodyText: { color: '#444', fontSize: 14, lineHeight: 22 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    viewMore: { color: '#BBB', fontSize: 12 },
    providerCard: {
        backgroundColor: COLORS.white,
        width: 130, height: 80,
        borderRadius: 15, justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: '#EEE', padding: 10
    },
    providerLogo: { width: '100%', height: '100%' },
    bottomBar: { position: 'absolute', bottom: 0, width: '100%', padding: 20, backgroundColor: COLORS.bg },
    applyButton: {
        backgroundColor: COLORS.primaryBlue, height: 55, borderRadius: 30,
        justifyContent: 'center', alignItems: 'center', elevation: 5,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2
    },
    applyText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 }
});