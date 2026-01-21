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
    StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const COLORS = {
    bg: '#F6F9FC',
    primary: '#769FCD',
    accent: '#769FCD',
    heading: '#2E2E2E',
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
                    <Feather name="university" size={20} color={COLORS.primary} />
                </View>
            )}
        </TouchableOpacity>
    );

    const HeaderSection = () => (
        <View style={styles.headerSection}>
            {/* Banner with full-size logo */}
            <View style={styles.banner}>
                <View style={styles.bannerOverlay} />
                <Image 
                    source={heroSource} 
                    style={styles.bannerImage} 
                    resizeMode="cover"
                />
                
                {/* Agency Info Overlay */}
                <View style={styles.bannerInfo}>
                    <View style={styles.bannerContent}>
                        <Text style={styles.agencyName}>{agencyData.name}</Text>
                        <View style={styles.bannerDetails}>
                            <View style={styles.detailItem}>
                                <Feather name="calendar" size={14} color="#FFFFFF" />
                                <Text style={styles.detailText}>Est. {agencyData.est}</Text>
                            </View>
                            <View style={styles.detailItem}>
                                <Feather name="map-pin" size={14} color="#FFFFFF" />
                                <Text style={styles.detailText} numberOfLines={1}>
                                    {agencyData.address}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );

    const Section = ({ title, icon, children, showViewAll = false, onViewAll = () => {} }) => (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                    <Feather name={icon} size={18} color={COLORS.primary} />
                    <Text style={styles.sectionTitle}>{title}</Text>
                </View>
                {showViewAll && (
                    <TouchableOpacity style={styles.viewMoreBtn} onPress={onViewAll}>
                        <Text style={styles.viewMoreText}>View All</Text>
                    </TouchableOpacity>
                )}
            </View>
            <View style={styles.sectionContent}>
                {children}
            </View>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={[styles.safe, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" />
            
            {/* Header with back button */}
            <View style={styles.topBar}>
                <TouchableOpacity 
                    style={styles.backBtn} 
                    onPress={() => router.back()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Feather name="chevron-left" size={24} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <HeaderSection />

                <View style={styles.contentContainer}>
                    <Section title="About Agency" icon="info">
                        <View style={styles.aboutCard}>
                            <Text style={styles.aboutText}>{agencyData.about}</Text>
                        </View>
                    </Section>

                    <Section title="Services Offered" icon="check-circle">
                        <View style={styles.servicesGrid}>
                            {agencyData.services?.map((service, index) => (
                                <View key={`service-${index}`} style={styles.serviceChip}>
                                    <Feather name="check" size={14} color="#FFFFFF" />
                                    <Text style={styles.serviceChipText}>{service}</Text>
                                </View>
                            ))}
                        </View>
                    </Section>

                    <Section title="Our Process" icon="list">
                        {agencyData.process?.map((step, index) => (
                            <View key={`step-${index}`} style={styles.processItem}>
                                <View style={styles.processNumber}>
                                    <Text style={styles.processNumberText}>{index + 1}</Text>
                                </View>
                                <View style={styles.processContent}>
                                    <Text style={styles.processStepText}>{step}</Text>
                                </View>
                            </View>
                        ))}
                    </Section>

                    <Section 
                        title="Partner Universities" 
                        icon="star"
                        showViewAll={agencyData.partners?.length > 0}
                        onViewAll={() => router.push({
                            pathname: `/agency/partners/${id}`,
                            params: {
                                id: id,
                                name: agencyData?.name,
                                partnersData: JSON.stringify(agencyData.partners || [])
                            }
                        })}
                    >
                        {agencyData.partners?.length > 0 ? (
                            <FlatList
                                data={agencyData.partners.slice(0, 4)}
                                renderItem={renderPartner}
                                keyExtractor={(item, index) => item._id || index.toString()}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.partnersList}
                                ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
                            />
                        ) : (
                            <View style={styles.emptyPartners}>
                                <Text style={styles.emptyPartnersText}>No partner universities available</Text>
                            </View>
                        )}
                    </Section>
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
                            <Feather name="check-circle" size={20} color="#FFFFFF" />
                            <Text style={styles.selectText}>Select Agency</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const { width } = Dimensions.get('window');
const BANNER_HEIGHT = 180; // Smaller banner height

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
        zIndex: 100,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingBottom: 100,
    },
    headerSection: {
        marginBottom: 16,
    },
    banner: {
        height: BANNER_HEIGHT,
        backgroundColor: COLORS.primary,
        position: 'relative',
        overflow: 'hidden',
    },
    bannerImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    bannerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(118, 159, 205, 0.7)',
        zIndex: 1,
    },
    bannerInfo: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2,
        justifyContent: 'flex-end',
        padding: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
    },
    bannerContent: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    agencyName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
        flex: 1,
        marginRight: 16,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    bannerDetails: {
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        flexShrink: 1,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginVertical: 4,
    },
    detailText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#FFFFFF',
        flexShrink: 1,
    },
    contentContainer: {
        paddingHorizontal: 20,
        marginTop: 8,
    },
    section: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    sectionTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.heading,
    },
    viewMoreBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: 'rgba(118, 159, 205, 0.1)',
    },
    viewMoreText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
    },
    sectionContent: {
        paddingHorizontal: 4,
    },
    aboutCard: {
        backgroundColor: COLORS.lightBg,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    aboutText: {
        fontSize: 15,
        color: COLORS.text,
        lineHeight: 24,
    },
    servicesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    serviceChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 8,
    },
    serviceChipText: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '500',
    },
    processItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: COLORS.lightBg,
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    processNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    processNumberText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    processContent: {
        flex: 1,
        marginLeft: 12,
    },
    processStepText: {
        fontSize: 15,
        color: COLORS.text,
        lineHeight: 22,
    },
    partnersList: {
        paddingVertical: 8,
    },
    partnerTile: {
        width: 80,
        height: 80,
        borderRadius: 16,
        backgroundColor: COLORS.lightBg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    partnerLogo: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
    partnerPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    emptyPartners: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
    },
    emptyPartnersText: {
        fontSize: 15,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
    },
    actionBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: COLORS.cardBg,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    selectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: 14,
        backgroundColor: COLORS.primary,
        gap: 12,
    },
    selectText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 16,
    },
    bottomSpacing: {
        height: 90,
    },
});