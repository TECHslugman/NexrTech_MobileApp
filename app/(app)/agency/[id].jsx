import React, { useMemo, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    FlatList,
    ActivityIndicator,
    ScrollView,
    Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const COLORS = {
    bg: '#F6F9FC',
    primary: '#769FCD',
    accent: '#769FCD',
    heading: '#769FCD',
    cardBg: '#FFFFFF',
    cardBorder: '#E6EEF7',
    pillBg: '#F7FBFC',
    text: '#2E2E2E',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    lightBg: '#F8FAFC',
};

// Base URL for your API
const BASE_URL = 'https://edu-agent-backend-nine.vercel.app/api/v1';
const defaultHero = require('../../../assets/images/agencies/default.png');

export default function AgencyDetails() {
    const { id, name: paramName, heroUri } = useLocalSearchParams();
    const router = useRouter();
    const { userToken } = useAuth();

    const [agencyData, setAgencyData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (!userToken || !id) return;
            try {
                setLoading(true);

                // Fetching from both endpoints simultaneously
                const [profileRes, partnerRes] = await Promise.all([
                    fetch(`${BASE_URL}/agency/profile/${id}`, {
                        headers: { 
                            'Authorization': `Bearer ${userToken}`,
                            'Content-Type': 'application/json' 
                        }
                    }),
                    fetch(`${BASE_URL}/agency/universities/agency/${id}`, {
                        headers: { 
                            'Authorization': `Bearer ${userToken}`,
                            'Content-Type': 'application/json' 
                        }
                    })
                ]);

                if (!profileRes.ok) throw new Error('Profile API failed');

                const profileJson = await profileRes.json();
                const partnerJson = await partnerRes.json();

                // Mapping profile data
                const fullProfile = profileJson.agency || profileJson.profile || profileJson;
                
                
                const partnerList = partnerJson.university?.partnerUniversities || [];

                setAgencyData({
                    name: fullProfile.organizationName || paramName,
                    est: fullProfile.establishment || "N/A",
                    address: fullProfile.address || "No address provided",
                    about: fullProfile.about || "No description available",
                    services: fullProfile.servicesOffered || [],
                    process: fullProfile.process || [],
                    partners: partnerList, 
                    imageUri: fullProfile.logo || null,
                });

            } catch (error) {
                console.log("Fetch error:", error.message);
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

    const handleSelectAgency = async () => {
        if (!id) { alert("Error: Agency ID is missing."); return; }

        try {
            setLoading(true);
            const response = await fetch(`${BASE_URL}/students/select-agency`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ agencyId: id })
            });

            const json = await response.json();

            if (!response.ok) {
                alert(`Server Error (${response.status}): ${json.message || "Internal Server Error"}`);
                return;
            }

            router.push({
                pathname: `/agency/selected/${id}`,
                params: { name: agencyData?.name, agencyLogo:agencyData?.imageUri }
            });

        } catch (error) {
            console.error("Network Error:", error);
            alert("Check your internet connection.");
        } finally {
            setLoading(false);
        }
    };

    const heroSource = useMemo(() => {
        if (agencyData?.imageUri) return { uri: agencyData.imageUri };
        if (heroUri) return { uri: String(heroUri) };
        return defaultHero;
    }, [heroUri, agencyData]);

    const renderPartner = ({ item, index }) => (
        <TouchableOpacity key={item._id || `p-${index}`} style={styles.partnerTile}>
            {item.logo ? (
                <Image source={{ uri: item.logo }} style={styles.partnerLogo} resizeMode="contain" />
            ) : (
                <View style={styles.partnerPlaceholder}>
                    <Text style={styles.partnerText}>{item.name?.charAt(0) || "U"}</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    const HeaderSection = () => (
        <View style={styles.headerSection}>
            <View style={styles.heroContainer}>
                <Image source={heroSource} style={styles.heroImage} resizeMode="contain" />
                <View style={styles.headerOverlay}>
                    <Text style={styles.agencyName}>{agencyData.name}</Text>
                    <View style={styles.headerInfoRow}>
                        <View style={styles.infoPill}>
                            <Feather name="calendar" size={12} color="#FFFFFF" />
                            <Text style={styles.infoPillText}>Est. {agencyData.est}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.locationInfo}>
                            <Feather name="map-pin" size={12} color="#FFFFFF" />
                            <Text style={styles.locationText} numberOfLines={1}>
                                {agencyData.address}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );

    const Section = ({ title, icon, children }) => (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                    <Feather name={icon} size={16} color={COLORS.primary} />
                </View>
                <Text style={styles.sectionTitle}>{title}</Text>
            </View>
            <View style={styles.sectionContent}>
                {children}
            </View>
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
            {/* Header */}
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Feather name="chevron-left" size={22} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={styles.topSpacer} />
            </View>

            {/* Content */}
            <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <HeaderSection />

                <View style={styles.contentContainer}>
                    <Section title="About" icon="info">
                        <Text style={styles.aboutText}>{agencyData.about}</Text>
                    </Section>

                    <Section title="Our Services" icon="check-circle">
                        {agencyData.services?.map((service, index) => (
                            <View key={`service-${index}`} style={styles.serviceItem}>
                                <View style={styles.serviceIcon}>
                                    <Feather name="check" size={14} color="#FFFFFF" />
                                </View>
                                <Text style={styles.serviceText}>{service}</Text>
                            </View>
                        ))}
                    </Section>

                    <Section title="Our Process" icon="list">
                        {agencyData.process?.map((step, index) => (
                            <View key={`step-${index}`} style={styles.processStep}>
                                <View style={styles.stepNumber}>
                                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                                </View>
                                <Text style={styles.processText}>{step}</Text>
                            </View>
                        ))}
                    </Section>

                    {/* Partners Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionIcon}>
                                <Feather name="star" size={16} color={COLORS.primary} />
                            </View>
                            <Text style={styles.sectionTitle}>Our Partners</Text>
                            {agencyData.partners?.length > 0 && (
                                <TouchableOpacity
                                    style={styles.viewMoreBtn}
                                    onPress={() => router.push({
                                        pathname: `/agency/partners/${id}`,
                                        params: {
                                            id: id,
                                            name: agencyData?.name,
                                            partnersData: JSON.stringify(agencyData.partners || [])
                                        }
                                    })}
                                >
                                    <Text style={styles.viewMoreText}>View all</Text>
                                    <Feather name="chevron-right" size={14} color={COLORS.primary} />
                                </TouchableOpacity>
                            )}
                        </View>
                        
                        {agencyData.partners?.length > 0 ? (
                            <FlatList
                                data={agencyData.partners.slice(0, 5)}
                                renderItem={renderPartner}
                                keyExtractor={(item, index) => item._id || index.toString()}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.partnersList}
                                ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                            />
                        ) : (
                            <View style={styles.emptyPartners}>
                                <Feather name="university" size={24} color={COLORS.border} />
                                <Text style={styles.emptyPartnersText}>No partners available</Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.bottomSpacing} />
            </ScrollView>

            {/* Fixed Action Button */}
            <View style={styles.actionBar}>
                <TouchableOpacity
                    style={styles.selectBtn}
                    onPress={handleSelectAgency}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <Feather name="check" size={18} color="#FFFFFF" />
                            <Text style={styles.selectText}>Select Agency</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const { width } = Dimensions.get('window');
const HERO_HEIGHT = 220;

const styles = StyleSheet.create({
    safe: { 
        flex: 1, 
        backgroundColor: COLORS.bg 
    },
    topBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 50,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    topSpacer: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    headerSection: {
        marginBottom: 16,
    },
    heroContainer: {
        height: HERO_HEIGHT,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    heroImage: {
        width: '100%',
        height: '100%',
        maxWidth: 200,
        maxHeight: 120,
    },
    headerOverlay: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
    },
    agencyName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 12,
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    headerInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    infoPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        gap: 5,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    infoPillText: {
        fontSize: 11,
        color: '#FFFFFF',
        fontWeight: '500',
    },
    divider: {
        width: 1,
        height: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    locationInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    locationText: {
        fontSize: 12,
        color: '#FFFFFF',
        flex: 1,
        opacity: 0.9,
    },
    contentContainer: {
        paddingHorizontal: 16,
    },
    section: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 10,
    },
    sectionIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(118, 159, 205, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.heading,
        flex: 1,
    },
    sectionContent: {
        paddingHorizontal: 4,
    },
    aboutText: {
        fontSize: 14,
        color: COLORS.text,
        lineHeight: 22,
    },
    serviceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 12,
    },
    serviceIcon: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    serviceText: {
        flex: 1,
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 20,
    },
    processStep: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
        gap: 12,
    },
    stepNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(118, 159, 205, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    stepNumberText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.primary,
    },
    processText: {
        flex: 1,
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 20,
        paddingTop: 2,
    },
    viewMoreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    viewMoreText: {
        fontSize: 13,
        color: COLORS.primary,
        fontWeight: '500',
    },
    partnersList: {
        paddingVertical: 4,
    },
    partnerTile: {
        width: 70,
        height: 70,
        borderRadius: 14,
        backgroundColor: COLORS.cardBg,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 2,
        elevation: 1,
    },
    partnerLogo: {
        width: '100%',
        height: '100%',
    },
    partnerPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: 10,
        backgroundColor: COLORS.lightBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    partnerText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.primary,
    },
    emptyPartners: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        gap: 8,
    },
    emptyPartnersText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
    },
    actionBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: COLORS.cardBg,
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 5,
    },
    selectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: COLORS.primary,
        gap: 10,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    selectText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 16,
    },
    bottomSpacing: {
        height: 90,
    },
});