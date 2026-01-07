import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    FlatList,
    Image,
    useWindowDimensions,
    ActivityIndicator,
    StatusBar,
    Linking
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';

const DEFAULT_IMAGE = require('../../../../assets/images/agencies/default.png');
const BASE_URL = 'https://edu-agent-backend-nine.vercel.app/api/v1';
const PROFILE_URL = `${BASE_URL}/agency/profile`;

const COLORS = {
    bg: '#F8FAFD',
    primary: '#769FCD',
    sectionTitle: '#87A1C5',
    viewAll: '#9AA7BC',
    white: '#FFFFFF',
    border: '#EEF2F7',
};

export default function SelectedAgencyHome() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { width } = useWindowDimensions();
    const { userToken } = useAuth();

    const [loading, setLoading] = useState(true);
    const [agencyData, setAgencyData] = useState(null);
    const [courses, setCourses] = useState([]);
    const [events, setEvents] = useState([]);
    const [scholarships, setScholarships] = useState([]);
    const [mentors, setMentors] = useState([]);

  useEffect(() => {
    const fetchAllData = async () => {
        if (!userToken || !id) return;
        setLoading(true);
        try {
            const response = await fetch(`${PROFILE_URL}/${id}`, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });

            // Check if response is valid JSON
            const contentType = response.headers.get("content-type");
            if (response.ok && contentType && contentType.includes("application/json")) {
                const json = await response.json();
                const mainData = json.agency || json.profile;
                setAgencyData(mainData);
                setCourses(mainData?.courses || ["Bachelors of Nursing", "Bachelors of Political Sci."]);
            } else {
                // FALLBACK: If API is not real/active yet
                setAgencyData({ organizationName: "Agency Name" }); // Mock agency name
                setCourses(["Bachelors of Nursing", "Bachelors of Political Sci.", "Business Mgt", "IT Computer Science"]);
            }

            // Provisionary Data for others
            setEvents([{ id: '1', title: 'European Higher Education Fair', image: 'https://ehef.id/storage/files/shares/logo-ehef-id.png' }]);
            setScholarships(["Australia Awards", "The Snow Scholarship"]);
            setMentors([{ id: '1', name: 'Karma Dema', bio: '2+ years of mentoring students for higher education abroad', avatar: 'https://via.placeholder.com/100' }]);

        } catch (error) {
            console.log("Using Fallback Data due to error:", error.message);
            // Even if network fails, set data so user can see something
            setCourses(["Bachelors of Nursing", "Bachelors of Political Sci."]);
        } finally {
            setLoading(false);
        }
    };
    fetchAllData();
}, [id, userToken]);

    const GAP = 12;

    if (loading) {
        return (
            <View style={[styles.safe, styles.center]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.headerContainer}>
                <View style={styles.searchRow}>
                    <View style={styles.searchBox}>
                        <Feather name="search" size={20} color="#B0BCCB" />
                        <TextInput placeholder="Search" style={styles.searchInput} placeholderTextColor="#B0BCCB" />
                    </View>
                    <TouchableOpacity style={styles.bellBtn}>
                        <Feather name="bell" size={22} color={COLORS.primary} />
                        <View style={styles.notificationDot} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

                <SectionHeader
                    title="Courses"
                    onBtnPress={() => router.push(`/agency/selected/courses/${id}`)}
                />
                <FlatList
                    horizontal
                    data={courses}
                    keyExtractor={(_, index) => `course-${index}`}
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item, index }) => (
                        <View style={[styles.courseCard, { backgroundColor: index % 2 === 0 ? '#FF6B6B' : '#949BFF' }]}>
                            <Text style={styles.courseText}>{item}</Text>
                        </View>
                    )}
                    ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
                />

                <SectionHeader
                    title="Join Events"
                    onBtnPress={() => router.push(`/agency/selected/events/${id}`)}
                />
                {events.map((event) => (
                    <TouchableOpacity key={event.id} style={styles.eventCard}>
                        <Image source={{ uri: event.image }} style={styles.eventImg} resizeMode="contain" />
                        <View style={styles.eventFooter}>
                            <Text style={styles.eventTitle}>{event.title}</Text>
                        </View>
                    </TouchableOpacity>
                ))}

                <SectionHeader
                    title="Scholarships"
                    onBtnPress={() => router.push(`/agency/selected/scholarships/${id}`)}
                />
                <FlatList
                    horizontal
                    data={scholarships}
                    keyExtractor={(_, index) => `scholar-${index}`}
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <View style={styles.scholarshipCard}>
                            <Text style={styles.scholarshipText}>{item}</Text>
                        </View>
                    )}
                    ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
                />

                <SectionHeader
                    title="Universities"
                    onBtnPress={() => router.push({ pathname: `/agency/selected/universities/${id}`, params: { name: agencyData?.organizationName } })}
                />
                <FlatList
                    horizontal
                    data={agencyData?.partnerUniversities || []}
                    keyExtractor={(item) => item._id || Math.random().toString()}
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.uniTile} onPress={() => item.websiteUrl && Linking.openURL(item.websiteUrl)}>
                            <Image source={item.logo ? { uri: item.logo } : DEFAULT_IMAGE} style={styles.uniImg} resizeMode="contain" />
                        </TouchableOpacity>
                    )}
                    ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
                />

                <SectionHeader
                    title="Meet the Mentors"
                    onBtnPress={() => router.push(`/agency/selected/mentors/${id}`)}
                />
                {mentors.map((mentor) => (
                    <View key={mentor.id} style={styles.mentorCard}>
                        <Image source={{ uri: mentor.avatar }} style={styles.mentorAvatar} />
                        <View style={styles.mentorInfo}>
                            <Text style={styles.mentorName}>{mentor.name}</Text>
                            <Text style={styles.mentorSub}>{mentor.bio}</Text>
                        </View>
                    </View>
                ))}

                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.navBar}>
                <TouchableOpacity style={styles.navItem}><Ionicons name="home" size={28} color={COLORS.primary} /></TouchableOpacity>
                <TouchableOpacity style={styles.navItem}><Ionicons name="refresh-outline" size={28} color="#BFC7D1" /></TouchableOpacity>
                <TouchableOpacity style={styles.navItem}><Ionicons name="mail-outline" size={28} color="#BFC7D1" /></TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => router.push('agency/selected/profile')}><Ionicons name="person-outline" size={28} color="#BFC7D1" /></TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
function SectionHeader({ title, onBtnPress }) {
    return (
        <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>{title}</Text>
            <TouchableOpacity onPress={onBtnPress}>
                <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerContainer: { paddingHorizontal: 20, paddingVertical: 15 },
    searchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    searchBox: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.white, borderRadius: 30, paddingHorizontal: 18, height: 50,
        borderWidth: 1, borderColor: '#F0F3F7'
    },
    searchInput: { flex: 1, marginLeft: 12, fontSize: 15, color: '#333' },
    bellBtn: {
        height: 50, width: 50, borderRadius: 25, backgroundColor: COLORS.white,
        alignItems: 'center', justifyContent: 'center', marginLeft: 12,
        borderWidth: 1, borderColor: '#F0F3F7'
    },
    notificationDot: { position: 'absolute', top: 14, right: 16, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF5858', borderWidth: 1.5, borderColor: '#FFF' },
    body: { paddingHorizontal: 20 },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 14 },
    sectionHeading: { fontSize: 17, fontWeight: '600', color: COLORS.sectionTitle },
    viewAllText: { fontSize: 13, color: COLORS.viewAll, fontWeight: '500' },
    courseCard: { width: 150, height: 100, borderRadius: 18, padding: 15, justifyContent: 'center' },
    courseText: { color: COLORS.white, fontWeight: '600', fontSize: 15 },
    eventCard: { width: '100%', height: 190, borderRadius: 20, backgroundColor: COLORS.white, overflow: 'hidden', borderWidth: 1, borderColor: '#F0F3F7', marginBottom: 15 },
    eventImg: { width: '100%', height: '70%', marginTop: 10 },
    eventFooter: { padding: 12, alignItems: 'center' },
    eventTitle: { fontSize: 14, fontWeight: '600', color: '#444' },
    scholarshipCard: { width: 150, height: 90, borderRadius: 18, backgroundColor: COLORS.sectionTitle, padding: 15, justifyContent: 'center' },
    scholarshipText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
    uniTile: { width: 140, height: 100, borderRadius: 20, backgroundColor: COLORS.white, padding: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F0F3F7' },
    uniImg: { width: '100%', height: '100%' },
    mentorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: '#F0F3F7', marginBottom: 12 },
    mentorAvatar: { width: 70, height: 70, borderRadius: 35 },
    mentorInfo: { flex: 1, marginLeft: 16 },
    mentorName: { fontSize: 16, fontWeight: '700', color: COLORS.sectionTitle },
    mentorSub: { fontSize: 13, color: '#7B8DA5', marginTop: 4, lineHeight: 18 },
    navBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 85, backgroundColor: COLORS.white, flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F0F3F7', paddingBottom: 20 },
    navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' }
});