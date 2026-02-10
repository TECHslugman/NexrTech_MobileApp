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
    Animated,
    Platform,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Config } from "../../config";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive scaling functions
const scale = (size) => (SCREEN_WIDTH / 375) * size;
const verticalScale = (size) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

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
    success: '#57C785',
    accentLight: '#EDF4FB',
};

const defaultHero = require('../../../assets/images/agencies/default.png');
const BANNER_HEIGHT = Math.min(verticalScale(240), SCREEN_HEIGHT * 0.3);

export default function AgencyDetails() {
    const { id, name: paramName, heroUri } = useLocalSearchParams();
    const router = useRouter();
    const { userToken } = useAuth();

    const [agencyData, setAgencyData] = useState(null);
    const [loading, setLoading] = useState(true);
    const scrollY = new Animated.Value(0);

    useEffect(() => {
        const loadData = async () => {
            if (!userToken || !id) return;
            try {
                setLoading(true);

                const [profileRes, partnerRes] = await Promise.all([
                    fetch(`${Config.API_BASE_URL}/agency/profile/${id}`, {
                        headers: {
                            'Authorization': `Bearer ${userToken}`,
                            'Content-Type': 'application/json'
                        }
                    }),
                    fetch(`${Config.API_BASE_URL}/agency/universities/agency/${id}`, {
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
        if (!id) {
            Toast.show({
                type: 'error',
                text1: 'Selection Error',
                text2: 'Agency ID is missing.'
            });
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`${Config.API_BASE_URL}/students/select-agency`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ agencyId: id })
            });

            const json = await response.json();

            if (!response.ok) {
                Toast.show({
                    type: 'error',
                    text1: 'Server Error',
                    text2: json.message || "Internal Server Error"
                });
                return;
            }

            Toast.show({
                type: 'success',
                text1: 'Agency Selected',
                text2: `Welcome to ${agencyData?.name || 'the agency'}!`
            });

            setTimeout(() => {
                router.replace({
                    pathname: `/agency/selected/${id}`,
                    params: { name: agencyData?.name, agencyLogo: agencyData?.imageUri }
                });
            }, 500);

        } catch (error) {
            console.error("Network Error:", error);
            Toast.show({
                type: 'error',
                text1: 'Connection Error',
                text2: 'Please check your internet connection.'
            });
        } finally {
            setTimeout(() => setLoading(false), 500);
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
                    <Feather name="briefcase" size={moderateScale(24)} color={COLORS.primary} />
                </View>
            )}
            {item.name && (
                <Text style={styles.partnerName} numberOfLines={2}>
                    {item.name}
                </Text>
            )}
        </TouchableOpacity>
    );

    // Animated header opacity based on scroll
    const headerOpacity = scrollY.interpolate({
        inputRange: [0, BANNER_HEIGHT - 100, BANNER_HEIGHT],
        outputRange: [0, 0, 1],
        extrapolate: 'clamp',
    });

    const bannerScale = scrollY.interpolate({
        inputRange: [-100, 0],
        outputRange: [1.2, 1],
        extrapolate: 'clamp',
    });

    const HeaderSection = () => (
        <View style={styles.headerSection}>
            {/* Parallax Banner */}
            <Animated.View style={[styles.banner, { transform: [{ scale: bannerScale }] }]}>
                <Image
                    source={heroSource}
                    style={styles.bannerImage}
                    resizeMode="cover"
                />
                <View style={styles.bannerGradient} />
            </Animated.View>

            {/* Agency Card - Overlapping Banner */}
            <View style={styles.agencyCard}>
                <View style={styles.agencyCardHeader}>
                    <View style={styles.agencyLogoContainer}>
                        <Image
                            source={heroSource}
                            style={styles.agencyLogo}
                            resizeMode="cover"
                        />
                    </View>
                    <View style={styles.agencyInfo}>
                        <Text style={styles.agencyName} numberOfLines={2}>
                            {agencyData.name}
                        </Text>
                        <View style={styles.agencyMeta}>
                            <View style={styles.metaItem}>
                                <Feather name="calendar" size={moderateScale(12)} color={COLORS.textSecondary} />
                                <Text style={styles.metaText}>Est. {agencyData.est}</Text>
                            </View>
                            <View style={styles.metaDivider} />
                            <View style={styles.metaItem}>
                                <Feather name="map-pin" size={moderateScale(12)} color={COLORS.textSecondary} />
                                <Text style={styles.metaText} numberOfLines={1}>
                                    {agencyData.address.split(',')[0]}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );

    const Section = ({ title, icon, children, showViewAll = false, onViewAll = () => { } }) => (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                    <View style={styles.iconBadge}>
                        <Feather name={icon} size={moderateScale(16)} color={COLORS.primary} />
                    </View>
                    <Text style={styles.sectionTitle}>{title}</Text>
                </View>
                {showViewAll && (
                    <TouchableOpacity style={styles.viewMoreBtn} onPress={onViewAll}>
                        <Text style={styles.viewMoreText}>View All</Text>
                        <Feather name="arrow-right" size={moderateScale(14)} color={COLORS.primary} />
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
            <SafeAreaView style={[styles.safe, styles.loadingContainer]}>
                <StatusBar barStyle="dark-content" />
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading agency details...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe} edges={['bottom']}>
            <StatusBar barStyle="light-content" />

            {/* Animated Header Background */}
            <Animated.View style={[styles.animatedHeader, { opacity: headerOpacity }]}>
                <Text style={styles.animatedHeaderText} numberOfLines={1}>
                    {agencyData.name}
                </Text>
            </Animated.View>

            {/* Content */}
            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                scrollEventThrottle={16}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
            >
                <HeaderSection />

                <View style={styles.contentContainer}>
                    {/* About Section */}
                    <Section title="About Agency" icon="info">
                        <View style={styles.aboutCard}>
                            <Text style={styles.aboutText}>{agencyData.about}</Text>
                        </View>
                    </Section>

                    {/* Services Section */}
                    {agencyData.services?.length > 0 && (
                        <Section title="Services Offered" icon="check-circle">
                            <View style={styles.servicesGrid}>
                                {agencyData.services.map((service, index) => (
                                    <View key={`service-${index}`} style={styles.serviceChip}>
                                        <View style={styles.serviceIcon}>
                                            <Feather name="check" size={moderateScale(12)} color={COLORS.primary} />
                                        </View>
                                        <Text style={styles.serviceChipText}>{service}</Text>
                                    </View>
                                ))}
                            </View>
                        </Section>
                    )}

                    {/* Process Section */}
                    {agencyData.process?.length > 0 && (
                        <Section title="Our Process" icon="list">
                            <View style={styles.processContainer}>
                                {agencyData.process.map((step, index) => (
                                    <View key={`step-${index}`} style={styles.processItem}>
                                        <View style={styles.processLeft}>
                                            <View style={styles.processNumber}>
                                                <Text style={styles.processNumberText}>{index + 1}</Text>
                                            </View>
                                            {index < agencyData.process.length - 1 && (
                                                <View style={styles.processLine} />
                                            )}
                                        </View>
                                        <View style={styles.processRight}>
                                            <Text style={styles.processStepText}>{step}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </Section>
                    )}

                    {/* Partners Section */}
                    <Section
                        title="Partner Universities"
                        icon="award"
                        showViewAll={agencyData.partners?.length > 4}
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
                                data={agencyData.partners.slice(0, 6)}
                                renderItem={renderPartner}
                                keyExtractor={(item, index) => item._id || index.toString()}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.partnersList}
                                ItemSeparatorComponent={() => <View style={{ width: moderateScale(12) }} />}
                            />
                        ) : (
                            <View style={styles.emptyState}>
                                <Feather name="briefcase" size={moderateScale(32)} color={COLORS.cardBorder} />
                                <Text style={styles.emptyStateText}>No partner universities available</Text>
                            </View>
                        )}
                    </Section>
                </View>

                <View style={styles.bottomSpacing} />
            </Animated.ScrollView>

            {/* Fixed Action Button */}
            <View style={styles.actionBar}>
                <TouchableOpacity
                    style={styles.selectBtn}
                    onPress={handleSelectAgency}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.selectText}>Select This Agency</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: COLORS.bg
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        gap: moderateScale(12),
    },
    loadingText: {
        fontSize: moderateScale(14),
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    animatedHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: Platform.OS === 'ios' ? moderateScale(100) : moderateScale(80),
        backgroundColor: COLORS.cardBg,
        zIndex: 99,
        justifyContent: 'flex-end',
        paddingBottom: moderateScale(12),
        paddingHorizontal: moderateScale(60),
        borderBottomWidth: 1,
        borderBottomColor: COLORS.cardBorder,
    },
    animatedHeaderText: {
        fontSize: moderateScale(16),
        fontWeight: '700',
        color: COLORS.heading,
        textAlign: 'center',
    },
    scrollContent: {
        paddingBottom: moderateScale(120),
    },
    headerSection: {
        marginBottom: moderateScale(16),
        position: 'relative',
    },
    banner: {
        height: BANNER_HEIGHT,
        backgroundColor: COLORS.primary,
        overflow: 'hidden',
    },
    bannerImage: {
        width: '100%',
        height: '100%',
    },
    bannerGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60%',
        backgroundColor: 'transparent',
    },
    agencyCard: {
        marginHorizontal: moderateScale(16),
        marginTop: -moderateScale(60),
        backgroundColor: COLORS.cardBg,
        borderRadius: moderateScale(20),
        padding: moderateScale(16),
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    agencyCardHeader: {
        flexDirection: 'row',
        gap: moderateScale(14),
    },
    agencyLogoContainer: {
        width: moderateScale(80),
        height: moderateScale(80),
        borderRadius: moderateScale(16),
        backgroundColor: COLORS.lightBg,
        overflow: 'hidden',
        borderWidth: 3,
        borderColor: COLORS.cardBg,
    },
    agencyLogo: {
        width: '100%',
        height: '100%',
    },
    agencyInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    agencyName: {
        fontSize: moderateScale(20),
        fontWeight: '700',
        color: COLORS.heading,
        marginBottom: moderateScale(6),
        lineHeight: moderateScale(26),
    },
    agencyMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(8),
        flexWrap: 'wrap',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(4),
    },
    metaDivider: {
        width: 1,
        height: moderateScale(12),
        backgroundColor: COLORS.border,
    },
    metaText: {
        fontSize: moderateScale(12),
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    contentContainer: {
        paddingHorizontal: moderateScale(16),
        marginTop: moderateScale(8),
    },
    section: {
        backgroundColor: COLORS.cardBg,
        borderRadius: moderateScale(16),
        padding: moderateScale(16),
        marginBottom: moderateScale(16),
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: moderateScale(16),
    },
    sectionTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(10),
        flex: 1,
    },
    iconBadge: {
        width: moderateScale(32),
        height: moderateScale(32),
        borderRadius: moderateScale(8),
        backgroundColor: COLORS.accentLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        fontSize: moderateScale(17),
        fontWeight: '700',
        color: COLORS.heading,
        flex: 1,
    },
    viewMoreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(4),
        paddingVertical: moderateScale(6),
        paddingHorizontal: moderateScale(10),
        borderRadius: moderateScale(8),
        backgroundColor: COLORS.accentLight,
    },
    viewMoreText: {
        fontSize: moderateScale(13),
        fontWeight: '600',
        color: COLORS.primary,
    },
    sectionContent: {
        marginTop: moderateScale(4),
    },
    aboutCard: {
        backgroundColor: COLORS.lightBg,
        padding: moderateScale(14),
        borderRadius: moderateScale(12),
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    aboutText: {
        fontSize: moderateScale(14),
        color: COLORS.text,
        lineHeight: moderateScale(22),
    },
    servicesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: moderateScale(10),
    },
    serviceChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.accentLight,
        paddingHorizontal: moderateScale(14),
        paddingVertical: moderateScale(10),
        borderRadius: moderateScale(20),
        gap: moderateScale(8),
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    serviceIcon: {
        width: moderateScale(18),
        height: moderateScale(18),
        borderRadius: moderateScale(9),
        backgroundColor: COLORS.cardBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    serviceChipText: {
        fontSize: moderateScale(13),
        color: COLORS.primary,
        fontWeight: '600',
    },
    processContainer: {
        gap: 0,
    },
    processItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    processLeft: {
        alignItems: 'center',
        marginRight: moderateScale(14),
    },
    processNumber: {
        width: moderateScale(32),
        height: moderateScale(32),
        borderRadius: moderateScale(16),
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    processNumberText: {
        fontSize: moderateScale(14),
        fontWeight: '700',
        color: '#FFFFFF',
    },
    processLine: {
        width: 2,
        flex: 1,
        minHeight: moderateScale(40),
        backgroundColor: COLORS.cardBorder,
        marginVertical: moderateScale(4),
    },
    processRight: {
        flex: 1,
        backgroundColor: COLORS.lightBg,
        padding: moderateScale(14),
        borderRadius: moderateScale(12),
        marginBottom: moderateScale(12),
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        minHeight: moderateScale(60),
        justifyContent: 'center',
    },
    processStepText: {
        fontSize: moderateScale(14),
        color: COLORS.text,
        lineHeight: moderateScale(20),
        fontWeight: '500',
    },
    partnersList: {
        paddingVertical: moderateScale(8),
    },
    partnerTile: {
        width: moderateScale(110),
        minHeight: moderateScale(130),
        borderRadius: moderateScale(14),
        backgroundColor: COLORS.lightBg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: moderateScale(12),
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        gap: moderateScale(8),
    },
    partnerLogo: {
        width: moderateScale(60),
        height: moderateScale(60),
        borderRadius: moderateScale(10),
    },
    partnerPlaceholder: {
        width: moderateScale(60),
        height: moderateScale(60),
        borderRadius: moderateScale(10),
        backgroundColor: COLORS.cardBg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    partnerName: {
        fontSize: moderateScale(11),
        color: COLORS.text,
        fontWeight: '600',
        textAlign: 'center',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: moderateScale(32),
        gap: moderateScale(8),
    },
    emptyStateText: {
        fontSize: moderateScale(14),
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    actionBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: COLORS.cardBg,
        paddingHorizontal: moderateScale(20),
        paddingVertical: moderateScale(20),
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    selectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: moderateScale(18),
        borderRadius: moderateScale(14),
        backgroundColor: COLORS.primary,
    },
    selectText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: moderateScale(16),
        letterSpacing: 0.5,
    },
    bottomSpacing: {
        height: moderateScale(20),
    },
});