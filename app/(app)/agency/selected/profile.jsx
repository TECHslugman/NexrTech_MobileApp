import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

// --- THEME CONFIGURATION ---
const COLORS = {
    headerBg: '#E3EDF7',
    screenBg: '#F7FBFC',
    textBlue: '#87A1C5',
    cardBg: '#FFFFFF',
    accentRed: '#FF5858',
    timelineDone: '#87A1C5',
    timelineLine: '#D6E6F2',
    navInactive: '#BFC7D1',
    textDark: '#333333',
    textMuted: '#9AA7BC'
};

const DEFAULT_IMAGE = require('../../../../assets/images/agencies/default.png');
const API_ENDPOINT = 'https://edu-agent-backend-nine.vercel.app/api/v1/user/profile';

export default function UserProfile() {
    const router = useRouter();
    const { userToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!userToken) { setLoading(false); return; }
            try {
                const response = await fetch(API_ENDPOINT, {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                });
                if (response.ok) {
                    const json = await response.json();
                    setUserData(json.profile || json.data || json);
                }
            } catch (error) {
                console.log("Using fallbacks due to error");
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [userToken]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.textBlue} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>

                {/* --- TOP HEADER --- */}
                <View style={styles.headerBlock}>
                    <View style={styles.headerActions}>
                        <TouchableOpacity><Feather name="more-horizontal" size={24} color={COLORS.textBlue} /></TouchableOpacity>
                        <Text style={styles.headerTitle}>Your Profile</Text>
                        <TouchableOpacity><Feather name="settings" size={22} color={COLORS.textBlue} /></TouchableOpacity>
                    </View>

                    <Image
                        source={userData?.profileImage ? { uri: userData.profileImage } : DEFAULT_IMAGE}
                        style={styles.profilePic}
                    />
                    <Text style={styles.userNameText}>{userData?.name || "Sonam Choden"}</Text>
                    <Text style={styles.userSubText}>{userData?.email || "sonam@gmail.com"}</Text>
                </View>

                {/* --- MAIN CONTENT --- */}
                <View style={styles.contentPadding}>

                    <SectionBlock label="About">
                        <View style={styles.standardCard}>
                            <Text style={styles.bodyText}>
                                {userData?.about || "Karma Dema is passionate about helping Bhutanese students achieve their dream of studying abroad."}
                            </Text>
                        </View>
                    </SectionBlock>

                    <SectionBlock label="Email">
                        <View style={styles.standardCard}>
                            <Text style={styles.bodyText}>{userData?.email || "sonam@gmail.com"}</Text>
                        </View>
                    </SectionBlock>

                    <SectionBlock label="Document Status">
                        <View style={styles.standardCard}>
                            <StatusRow label="Passport" done={true} />
                            <StatusRow label="Class 10 & 12 Marksheet" done={true} />
                            <StatusRow label="IELTS Score Report" done={false} />
                            <StatusRow label="Financial Documents" done={false} isLast />
                        </View>
                    </SectionBlock>

                    {/* APPLIED STATS GRID */}
                    <View style={styles.gridRow}>
                        <View style={styles.gridItem}>
                            <SectionBlock label="Applied University">
                                <View style={[styles.standardCard, styles.centeredCard]}>
                                    <Image
                                        source={require('../../../../assets/images/agencies/default.png')}
                                        style={styles.logoFit}
                                        resizeMode="contain"
                                    />
                                </View>
                            </SectionBlock>
                        </View>
                        <View style={styles.gridItem}>
                            <SectionBlock label="Applied Course">
                                <View style={[styles.standardCard, styles.courseCardStyle]}>
                                    <Text style={styles.courseWhiteText}>{userData?.course || "Bachelors of Nursing"}</Text>
                                </View>
                            </SectionBlock>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.outlineBtn}>
                        <Text style={styles.outlineBtnText}>Change Agency/Consultancy</Text>
                    </TouchableOpacity>

                </View>
            </ScrollView>

            {/* --- BOTTOM NAVIGATION --- */}
            <View style={styles.navBar}>
                <TouchableOpacity onPress={() => router.back()} style={styles.navTab}><Feather name="home" size={24} color={COLORS.navInactive} /></TouchableOpacity>
                <TouchableOpacity style={styles.navTab}><MaterialCommunityIcons name="restart" size={26} color={COLORS.navInactive} /></TouchableOpacity>
                <TouchableOpacity style={styles.navTab}><Feather name="mail" size={24} color={COLORS.navInactive} /></TouchableOpacity>
                <TouchableOpacity style={styles.navTab}><Ionicons name="person-circle" size={30} color={COLORS.textBlue} /></TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

// --- MODULAR UI COMPONENTS ---

const SectionBlock = ({ label, children }) => (
    <View style={styles.sectionMargin}>
        <Text style={styles.sectionTitle}>{label}</Text>
        {children}
    </View>
);

const StatusRow = ({ label, done, isLast }) => (
    <View style={styles.statusRowLayout}>
        <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, done ? styles.dotDone : styles.dotPending]} />
            {!isLast && <View style={styles.statusLine} />}
        </View>
        <Text style={[styles.statusLabel, { color: done ? COLORS.textDark : COLORS.textMuted }]}>{label}</Text>
    </View>
);

// --- CLEAN STYLESHEET ---

const styles = StyleSheet.create({
    // Global Layout
    container: { flex: 1, backgroundColor: COLORS.screenBg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollBody: { paddingBottom: 110 },
    contentPadding: { paddingHorizontal: 20 },

    // Header Styles
    headerBlock: {
        backgroundColor: COLORS.headerBg,
        alignItems: 'center',
        paddingBottom: 35,
        borderBottomLeftRadius: 5, // Subtle rounding matching image
        borderBottomRightRadius: 5
    },
    headerActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 20,
        paddingTop: 10,
        marginBottom: 15
    },
    headerTitle: { color: COLORS.textBlue, fontWeight: '600', fontSize: 16 },
    profilePic: { width: 100, height: 100, borderRadius: 50, marginBottom: 12, backgroundColor: '#FFF' },
    userNameText: { fontSize: 19, fontWeight: '700', color: COLORS.textBlue },
    userSubText: { fontSize: 12, color: COLORS.textBlue, opacity: 0.7 },

    // Typography & Sectioning
    sectionMargin: { marginTop: 20 },
    sectionTitle: { color: COLORS.textBlue, fontSize: 14, fontWeight: '600', marginBottom: 8 },
    bodyText: { fontSize: 13, color: COLORS.textDark, lineHeight: 20 },

    // Card Styles
    standardCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 15,
        shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5, elevation: 1
    },
    centeredCard: { height: 95, justifyContent: 'center', alignItems: 'center' },
    courseCardStyle: { height: 95, backgroundColor: COLORS.accentRed, justifyContent: 'center', alignItems: 'center' },
    courseWhiteText: { color: '#FFF', fontWeight: '600', textAlign: 'center', fontSize: 13 },
    logoFit: { width: '85%', height: '65%' },

    // Grid Layout
    gridRow: { flexDirection: 'row', justifyContent: 'space-between' },
    gridItem: { width: (width - 55) / 2 },

    // Status Timeline Component
    statusRowLayout: { flexDirection: 'row', height: 42 },
    statusIndicator: { alignItems: 'center', width: 22, marginRight: 12 },
    statusDot: { width: 12, height: 12, borderRadius: 6 },
    dotDone: { backgroundColor: COLORS.timelineDone },
    dotPending: { backgroundColor: '#FFF', borderWidth: 1.5, borderColor: COLORS.timelineLine },
    statusLine: { width: 1.5, flex: 1, backgroundColor: COLORS.timelineLine, marginVertical: 2 },
    statusLabel: { fontSize: 13, fontWeight: '500', paddingTop: 0 },

    // Buttons
    outlineBtn: {
        marginTop: 35,
        borderWidth: 1.2,
        borderColor: COLORS.accentRed,
        borderRadius: 25,
        padding: 15,
        alignItems: 'center'
    },
    outlineBtnText: { color: COLORS.accentRed, fontWeight: '700', fontSize: 14 },

    // Navigation Bar
    navBar: {
        position: 'absolute', bottom: 0,
        flexDirection: 'row', width: '100%', height: 75,
        backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F0F0F0',
        justifyContent: 'space-around', alignItems: 'center'
    },
    navTab: { flex: 1, alignItems: 'center' }
});