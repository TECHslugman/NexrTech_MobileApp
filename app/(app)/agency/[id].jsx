import React, { useMemo, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    FlatList,
    ActivityIndicator,
    Dimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

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

const API_URL = 'https://edu-agent-backend-nine.vercel.app/api/v1/agency/profile/';
const defaultHero = require('../../../assets/images/agencies/default.png');

function Dot() {
    return <View style={styles.dot} />;
}

export default function AgencyDetails() {
    const { id, name: paramName, heroUri } = useLocalSearchParams();
    const router = useRouter();
    const { userToken } = useAuth();

    const [agencyData, setAgencyData] = useState(null);
    const [loading, setLoading] = useState(true);
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
                    est: fullJson.establishment || "N/A",
                    address: fullJson.address || "No address provided",
                    about: fullJson.about || "No description available",
                    services: fullJson.servicesOffered || [],
                    process: fullJson.process || [],
                    partners: fullJson.partnerUniversities || [],
                    imageUri: fullJson.logo || null,
                });

            } catch (error) {
                console.log("API Error, falling back:", error.message);
                setAgencyData({
                    name: paramName || "Agency Details",
                    est: "N/A",
                    address: "Information temporarily unavailable",
                    about: "Details coming soon...",
                    services: [],
                    process: [],
                    partners: [],
                });
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id, userToken]);

    const heroSource = useMemo(() => {
        if (agencyData?.imageUri) return { uri: agencyData.imageUri };
        if (heroUri) return { uri: String(heroUri) };
        return defaultHero;
    }, [heroUri, agencyData]);

    const renderPartner = ({ item, index }) => (
        <View key={item._id || `p-${index}`} style={styles.partnerTile}>
            {item.logo ? (
                <Image source={{ uri: item.logo }} style={styles.partnerLogo} resizeMode="contain" />
            ) : (
                <Text style={styles.partnerText}>{item.name}</Text>
            )}
        </View>
    );

    // Everything that was in the ScrollView goes here
    const renderHeader = () => (
        <View style={styles.scrollBody}>
            <View style={styles.heroCard}>
                <Image source={heroSource} style={styles.heroImage} resizeMode="contain" />
                <View style={styles.heroDivider} />
            </View>

            <View style={styles.dividerRow}>
                <Text style={styles.estText}>EST. {agencyData.est}</Text>
            </View>

            <View style={styles.block}>
                <View style={styles.locationPill}>
                    <Feather name="map-pin" size={14} color={COLORS.accent} />
                    <Text style={styles.locationText}>{agencyData.address}</Text>
                </View>
            </View>

            <Text style={styles.sectionTitle}>About</Text>
            <View style={styles.card}>
                <Text style={styles.cardText}>{agencyData.about}</Text>
            </View>

            <Text style={styles.sectionTitle}>Our Services</Text>
            <View style={styles.card}>
                {agencyData.services?.map((s, idx) => (
                    <View key={`svc-${idx}`} style={styles.serviceRow}>
                        <Feather name="check-circle" size={16} color={COLORS.accent} />
                        <Text style={styles.serviceText}>{s}</Text>
                    </View>
                ))}
            </View>

            <Text style={styles.sectionTitle}>Process</Text>
            <View style={styles.card}>
                {agencyData.process?.map((p, idx) => (
                    <View key={`prc-${idx}`} style={styles.processRow}>
                        <View style={styles.timelineCol}>
                            <View style={styles.lineBox}>{idx !== 0 && <View style={styles.line} />}</View>
                            <Dot />
                            <View style={styles.lineBox}>{idx !== (agencyData.process.length - 1) && <View style={styles.line} />}</View>
                        </View>
                        <Text style={styles.processText}>{p}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitleNoMargin}>Our Partners</Text>
                <TouchableOpacity onPress={() => router.push({ pathname: '/agency/partners/[id]', params: { id } })}>
                    <Text style={styles.viewMore}>View more</Text>
                </TouchableOpacity>
            </View>

            {/* FlatList for partners is handled by the main FlatList below */}
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={[styles.safe, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.accent} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Feather name="chevron-left" size={22} color="#52606B" />
                </TouchableOpacity>
                <Text style={styles.topTitle}>{agencyData.name}</Text>
                <View style={{ width: 32 }} />
            </View>

            <FlatList
                data={[]} // We use ListFooterComponent for the horizontal partners list
                renderItem={null}
                ListHeaderComponent={renderHeader}
                ListFooterComponent={
                    <FlatList
                        data={agencyData.partners}
                        renderItem={renderPartner}
                        keyExtractor={(item, index) => item._id || index.toString()}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
                        ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
                    />
                }
                showsVerticalScrollIndicator={false}
            />

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
    topTitle: { flex: 1, textAlign: 'center', color: COLORS.heading, fontWeight: '600' },
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
    dividerRow: { marginVertical: 12, borderTopWidth: 1, borderColor: '#E5EAF1', paddingTop: 8 },
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
        marginBottom: 12,
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
    partnerText: { color: '#2A2A2A', fontWeight: '700', textAlign: 'center', fontSize: 11 },
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