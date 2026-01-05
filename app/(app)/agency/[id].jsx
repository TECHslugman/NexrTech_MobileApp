import React, { useMemo, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    FlatList,
    ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';;

const COLORS = {
    bg: '#F6F9FC',
    primary: '#769FCD',
    accent: '#769FCD',
    heading: '#87A1C5',
    cardBg: '#FFFFFF',
    cardBorder: '#E6EEF7',
    pillBg: '#F7FBFC',
    text: '#2E2E2E',
};

// --- API CONFIG ---
const API_URL = 'https://edu-agent-backend-nine.vercel.app/api/v1/agency/profile'; // Replace with your URL later

// --- LOCAL ASSET FALLBACKS ---
const defaultHero = require('../../../assets/images/agencies/default.png');

const HERO_BY_ID = { defaultHero};

// --- FALLBACK DATA (Delete this after API is connected) ---
const FALLBACK_CONTENT = {
    about: 'NA',
    services: ['NA'],
    process: ['NA'],
    partners: ["NA"],
};

const FALLBACK_AGENCIES = {
    bodhi5: { name: 'NA', est: 'NA', address: 'NA' },
};

function Dot() {
    return <View style={styles.dot} />;
}

export default function AgencyDetails() {
    const { id, name: paramName, heroUri } = useLocalSearchParams();
    const router = useRouter();
    const { userToken } = useAuth();

    // --- STATE ---
    const [agencyData, setAgencyData] = useState(null);
    const [loading, setLoading] = useState(true);

    // --- DATA FETCHING ---
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

                if (!response.ok) throw new Error('Network response was not ok');

                const json = await response.json();
                const fullJson = json.profile;

                setAgencyData({
                    name: fullJson.organizationName || paramName,
                    est: fullJson.createdAt ? new Date(fullJson.createdAt).getFullYear() : "N/A",
                    address: fullJson.address || "No address provided",
                    about: fullJson.description || "No description available",
                    services: fullJson.servicesOffered || [],
                    process: fullJson.process || [],
                    partners: fullJson.partnerUniversities || [],
                    imageUri: fullJson.logo || null,
                });

            } catch (error) {
                console.log("API Error, falling back to local data:", error.message);
                const meta = FALLBACK_AGENCIES[id] || FALLBACK_AGENCIES.bodhi5;
                setAgencyData({
                    ...meta,
                    ...FALLBACK_CONTENT,
                    name: paramName || meta.name
                });
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [id, userToken]);
    // Resolve Hero Image source
    const heroSource = useMemo(() => {
        if (agencyData?.imageUri) return { uri: agencyData.imageUri };
        if (heroUri) return { uri: String(heroUri) };
        if (HERO_BY_ID[id]) return HERO_BY_ID[id];

        return defaultHero;
    }, [id, heroUri, agencyData]);

    const renderPartner = ({ item }) => {
        return (
            <View style={styles.partnerTile}>
                {/* If the university has a logo in its own schema, use it. 
               Otherwise, show the university name.
            */}
                {item.logo ? (
                    <Image
                        source={{ uri: item.logo }}
                        style={styles.partnerLogo}
                        resizeMode="contain"
                    />
                ) : (
                    <Text style={styles.partnerText}>{item.name}</Text>
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.safe, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.accent} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe}>
            {/* Header */}
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Feather name="chevron-left" size={22} color="#52606B" />
                </TouchableOpacity>
                <Text style={styles.topTitle}>{agencyData.name}</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
                {/* Hero Card */}
                <View style={styles.heroCard}>
                    <Image source={heroSource} style={styles.heroImage} resizeMode="contain" />
                    <View style={styles.heroDivider} />
                </View>

                {/* Established Date */}
                <View style={styles.dividerRow}>
                    <Text style={styles.estText}>EST. {agencyData.est}</Text>
                </View>

                {/* Address */}
                <View style={styles.block}>
                    <View style={styles.locationPill}>
                        <Feather name="map-pin" size={14} color={COLORS.accent} />
                        <Text style={styles.locationText}>{agencyData.address}</Text>
                    </View>
                </View>

                {/* About Section */}
                <Text style={styles.sectionTitle}>About</Text>
                <View style={styles.card}>
                    <Text style={styles.cardText}>{agencyData.about}</Text>
                </View>

                {/* Services Section */}
                <Text style={styles.sectionTitle}>Our Services</Text>
                <View style={styles.card}>
                    {agencyData.services?.map((s, idx) => (
                        <View key={idx} style={styles.serviceRow}>
                            <Feather name="check-circle" size={16} color={COLORS.accent} />
                            <Text style={styles.serviceText}>{s}</Text>
                        </View>
                    ))}
                </View>

                {/* Process Timeline */}
                <Text style={styles.sectionTitle}>Process</Text>
                <View style={styles.card}>
                    {agencyData.process?.map((p, idx) => {
                        const isFirst = idx === 0;
                        const isLast = idx === (agencyData.process?.length - 1);
                        return (
                            <View key={idx} style={styles.processRow}>
                                <View style={styles.timelineCol}>
                                    <View style={styles.lineBox}>{!isFirst && <View style={styles.line} />}</View>
                                    <Dot />
                                    <View style={styles.lineBox}>{!isLast && <View style={styles.line} />}</View>
                                </View>
                                <Text style={styles.processText}>{p}</Text>
                            </View>
                        );
                    })}
                </View>

                {/* Partners Section */}
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitleNoMargin}>Our Partners</Text>
                    <TouchableOpacity onPress={() => router.push({ pathname: '/agency/partners/[id]', params: { id } })}>
                        <Text style={styles.viewMore}>View more</Text>
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={agencyData.partners}
                    keyExtractor={(item) => item._id || item.name}
                    renderItem={renderPartner}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.partnersRow}
                    ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
                />

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Footer Select Button */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={styles.selectBtn}
                    onPress={() => router.push({ pathname: '/agency/selected/[id]', params: { id } })}
                >
                    <Text style={styles.selectText}>SELECT</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const HERO_HEIGHT = 120;

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.bg },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderColor: '#EDEFF2',
        backgroundColor: '#FFFFFF',
    },
    backBtn: {
        height: 32,
        width: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F2F6FF',
    },
    topTitle: {
        flex: 1,
        textAlign: 'center',
        color: COLORS.heading,
        fontWeight: '600',
    },
    scrollBody: { padding: 16 },
    heroCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        paddingHorizontal: 10,
        paddingTop: 10,
        marginBottom: 10,
    },
    heroImage: { width: '100%', height: HERO_HEIGHT, alignSelf: 'center' },
    heroDivider: { marginTop: 10, height: 1, backgroundColor: '#E5EAF1' },
    dividerRow: {
        marginVertical: 12,
        borderTopWidth: 1,
        borderColor: '#E5EAF1',
        paddingTop: 8,
    },
    estText: { fontSize: 12, color: '#8696AA' },
    block: { marginBottom: 8 },
    locationPill: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: COLORS.pillBg,
        borderWidth: 1,
        borderColor: '#EAF2FC',
        borderRadius: 10,
        padding: 10,
    },
    locationText: { flex: 1, color: COLORS.text, fontSize: 12, lineHeight: 18 },
    sectionHeaderRow: {
        marginTop: 12,
        marginBottom: 6,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionTitle: { marginTop: 12, marginBottom: 6, color: COLORS.accent, fontWeight: '700' },
    sectionTitleNoMargin: { color: COLORS.accent, fontWeight: '700' },
    viewMore: { color: '#9AA7BC', fontWeight: '700', fontSize: 12 },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        padding: 12,
        marginBottom: 12,
    },
    cardText: { color: COLORS.text, fontSize: 13, lineHeight: 19 },
    serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    serviceText: { color: COLORS.text, fontSize: 13 },
    processRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10, minHeight: 24 },
    timelineCol: { width: 16, alignItems: 'center' },
    lineBox: { flex: 1, width: 2, alignItems: 'center' },
    line: { flex: 1, width: 2, backgroundColor: COLORS.cardBorder, borderRadius: 1 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent },
    processText: { flex: 1, color: COLORS.text, fontSize: 13, lineHeight: 18 },
    partnersRow: { paddingRight: 4 },
    partnerTile: {
        height: 80,
        width: 140,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        backgroundColor: COLORS.cardBg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
    },
    partnerLogo: { width: '100%', height: '100%' },
    partnerText: { color: '#2A2A2A', fontWeight: '700' },
    bottomBar: { position: 'absolute', left: 16, right: 16, bottom: 18 },
    selectBtn: {
        paddingVertical: 14,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});