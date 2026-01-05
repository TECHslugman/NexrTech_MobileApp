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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';

const DEFAULT_IMAGE = require('../../../../assets/images/agencies/default.png');
const API_URL = 'https://edu-agent-backend-nine.vercel.app/api/v1/agency/profile';

const COLORS = {
    bg: '#F6F9FC',
    heading: '#87A1C5',
    accent: '#769FCD',
    primary: '#769FCD',
    cardBg: '#FFFFFF',
    cardBorder: '#E6EEF7',
    inputBg: '#F7FBFC',
    inputBorder: '#D6E6F2',
    text: '#000000',
    link: '#9AA7BC',
};

export default function SelectedAgencyHome() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { width } = useWindowDimensions();
    const { userToken } = useAuth();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            if (!userToken) return;
            try {
                setLoading(true);
                const response = await fetch(API_URL, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${userToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (!response.ok) throw new Error('Network error');
                const json = await response.json();
                setData(json.profile);
            } catch (error) {
                console.log("Fetch Error:", error.message);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id, userToken]);

    // UI Sizing Logic
    const SIDE_PAD = 16;
    const GAP = 12;
    const CARD_W = Math.floor((width - SIDE_PAD * 2 - GAP) / 2);
    const EVENT_W = width - (SIDE_PAD * 4); // Wider cards for events

    if (loading) {
        return (
            <View style={[styles.safe, styles.center]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safe}>
            {/* Top Bar */}
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Feather name="chevron-left" size={22} color="#52606B" />
                </TouchableOpacity>
                <Text style={styles.topTitle}>{data?.organizationName || "Agency Home"}</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
                {/* Search */}
                <View style={styles.searchRow}>
                    <View style={styles.searchBox}>
                        <Feather name="search" size={18} color="#9CA3AF" />
                        <TextInput placeholder="Search" style={styles.searchInput} />
                    </View>
                    <TouchableOpacity style={styles.bellBtn}>
                        <Feather name="bell" size={18} color={COLORS.accent} />
                    </TouchableOpacity>
                </View>

                {/* 1. Courses Section (Using your Pill Card UI) */}
                <SectionHeader title="Courses" />
                <FlatList
                    horizontal
                    data={data?.servicesOffered || []} // Mapping 'servicesOffered' as courses
                    keyExtractor={(_, index) => `course-${index}`}
                    renderItem={({ item, index }) => (
                        <View style={[styles.pillCard, styles.shadow, { width: CARD_W, backgroundColor: index % 2 === 0 ? '#FF5858' : '#949BFF' }]}>
                            <Text style={styles.pillText}>{item}</Text>
                        </View>
                    )}
                    ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
                    showsHorizontalScrollIndicator={false}
                />

                {/* 2. Universities Section (Using your Uni Tile UI) */}
                <SectionHeader title="Universities" onBtnPress={() => router.push({ pathname: '/agency/partners/[id]', params: { id } })} />
                <FlatList
                    horizontal
                    data={data?.partnerUniversities || []}
                    keyExtractor={(_, index) => `uni-${index}`}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.uniTile, styles.shadow, { width: CARD_W }]}
                            onPress={() => router.push({ pathname: '/university/[id]', params: { id: item._id, name: item.name } })}
                        >
                            <Image
                                source={item.logo ? { uri: item.logo } : DEFAULT_IMAGE}
                                style={styles.uniImg}
                                resizeMode="contain"
                            />
                            <Text style={styles.uniLabel}>{item.name}</Text>
                        </TouchableOpacity>
                    )}
                    ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
                    showsHorizontalScrollIndicator={false}
                />

                {/* 3. Events Section (Using your Event Card UI) */}
                <SectionHeader title="Join Events" />
                <FlatList
                    horizontal
                    data={data?.process || []} // Mapping 'process' as events for now
                    keyExtractor={(_, index) => `event-${index}`}
                    renderItem={({ item }) => (
                        <View style={[styles.eventCard, styles.shadow, { width: EVENT_W }]}>
                            <View style={styles.eventPlaceholder}>
                                <Feather name="calendar" size={24} color={COLORS.primary} />
                                <Text style={styles.eventTitle}>{item}</Text>
                            </View>
                        </View>
                    )}
                    ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
                    showsHorizontalScrollIndicator={false}
                />

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Bottom Navigation */}
            <View style={styles.navBar}>
                <TouchableOpacity style={styles.navItem} onPress={() => { }}>
                    <Ionicons name="home" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem}>
                    <Ionicons name="checkmark-done-circle-outline" size={24} color="#BFC7D1" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem}>
                    <Ionicons name="mail-outline" size={24} color="#BFC7D1" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => router.push('/agency/selected/profile')}>
                    <Ionicons name="person-circle-outline" size={26} color="#BFC7D1" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

// Sub-components
function SectionHeader({ title, onBtnPress }) {
    return (
        <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>{title}</Text>
            <TouchableOpacity onPress={onBtnPress}><Text style={styles.viewAll}>View all</Text></TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    topBar: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: COLORS.bg },
    backBtn: { height: 32, width: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F6FF' },
    topTitle: { flex: 1, textAlign: 'center', color: COLORS.heading, fontWeight: '600' },
    body: { paddingHorizontal: 16, paddingTop: 10 },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
    searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: 21, paddingHorizontal: 12, height: 42 },
    searchInput: { flex: 1, marginLeft: 8 },
    bellBtn: { height: 42, width: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: COLORS.inputBorder },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 },
    sectionHeading: { color: COLORS.heading, fontWeight: '700' },
    viewAll: { color: COLORS.link, fontWeight: '700', fontSize: 12 },

    // UI Cards
    pillCard: { borderRadius: 14, padding: 15, height: 96, justifyContent: 'center' },
    pillText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

    uniTile: { borderRadius: 12, borderWidth: 1, borderColor: COLORS.cardBorder, backgroundColor: '#FFF', padding: 10, height: 100, alignItems: 'center', justifyContent: 'center' },
    uniImg: { width: '80%', height: '60%' },
    uniLabel: { fontSize: 10, fontWeight: '600', color: COLORS.text, marginTop: 5 },

    eventCard: { borderRadius: 12, backgroundColor: '#FFF', height: 120, borderWidth: 1, borderColor: COLORS.cardBorder, overflow: 'hidden' },
    eventPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 15 },
    eventTitle: { textAlign: 'center', marginTop: 8, fontWeight: '600', fontSize: 13, color: COLORS.text },

    shadow: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
    navBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, backgroundColor: '#FFF', flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#EEE' },
    navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' }
});