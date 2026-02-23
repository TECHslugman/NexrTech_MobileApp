import React, { useMemo, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    FlatList,
    ActivityIndicator,
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
    locked: '#E8F5E9',
    lockedBorder: '#A5D6A7',
    lockedText: '#2E7D32',
    disabled: '#B0BEC5',
    disabledBg: '#ECEFF1',
};

const defaultHero = require('../../../assets/images/agencies/default.png');
const BANNER_HEIGHT = Math.min(verticalScale(220), SCREEN_HEIGHT * 0.28);

export default function AgencyDetails() {
    const { id, name: paramName, heroUri } = useLocalSearchParams();
    const router = useRouter();
    const { userToken, activeAgency, setActiveAgency } = useAuth();

    const [agencyData, setAgencyData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selecting, setSelecting] = useState(false);
    const scrollY = new Animated.Value(0);

    // Derived state: is THIS agency already the active one?
    const isThisAgencySelected = activeAgency?.id === String(id);

    // Derived state: is a DIFFERENT agency already selected?
    const isDifferentAgencySelected = !!activeAgency && !isThisAgencySelected;

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
        // Guard: already locked to a different agency
        if (isDifferentAgencySelected) {
            Toast.show({
                type: 'error',
                text1: 'Already Enrolled',
                text2: `You are locked in with ${activeAgency.name}. Contact support to switch.`
            });
            return;
        }

        // Guard: already selected this one — just navigate
        if (isThisAgencySelected) {
            router.replace({
                pathname: `/agency/selected/${id}`,
                params: { name: agencyData?.name, agencyLogo: agencyData?.imageUri }
            });
            return;
        }

        if (!id) {
            Toast.show({
                type: 'error',
                text1: 'Selection Error',
                text2: 'Agency ID is missing.'
            });
            return;
        }

        try {
            setSelecting(true);
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

            // Lock the student into this agency — persisted to SecureStore
            await setActiveAgency({
                id: String(id),
                name: agencyData?.name || paramName || '',
                logo: agencyData?.imageUri || '',
            });

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
            setTimeout(() => setSelecting(false), 500);
        }
    };

    const heroSource = useMemo(() => {
        if (agencyData?.imageUri) return { uri: agencyData.imageUri };
        if (heroUri) return { uri: String(heroUri) };
        return defaultHero;
    }, [heroUri, agencyData]);

    const renderPartner = ({ item, index }) => (
        <TouchableOpacity
            key={item._id || `p-${index}`}
            style={styles.partnerCard}
            activeOpacity={0.7}
        >
            {item.logo ? (
                <Image
                    source={{ uri: item.logo }}
                    style={styles.partnerLogo}
                    resizeMode="cover"
                />
            ) : (
                <View style={styles.partnerPlaceholder}>
                    <Feather name="award" size={moderateScale(32)} color={COLORS.primary} />
                    {item.name && (
                        <Text style={styles.placeholderText} numberOfLines={2}>
                            {item.name}
                        </Text>
                    )}
                </View>
            )}
            {item.logo && item.name && (
                <View style={styles.partnerNameOverlay}>
                    <Text style={styles.partnerName} numberOfLines={2}>
                        {item.name}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );

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
            <Animated.View style={[styles.banner, { transform: [{ scale: bannerScale }] }]}>
                <Image
                    source={heroSource}
                    style={styles.bannerImage}
                    resizeMode="cover"
                />
                <View style={styles.bannerOverlay} />
            </Animated.View>

            <View style={styles.agencyCard}>
                <View style={styles.agencyCardContent}>
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

                        {/* Show "Your Agency" badge if this is the student's locked agency */}
                        {isThisAgencySelected && (
                            <View style={styles.yourAgencyBadge}>
                                <Feather name="check-circle" size={moderateScale(13)} color={COLORS.lockedText} />
                                <Text style={styles.yourAgencyBadgeText}>Your Agency</Text>
                            </View>
                        )}

                        <View style={styles.agencyMeta}>
                            <View style={styles.metaItem}>
                                <Feather name="calendar" size={moderateScale(13)} color={COLORS.textSecondary} />
                                <Text style={styles.metaText}>Est. {agencyData.est}</Text>
                            </View>
                            <View style={styles.metaDivider} />
                            <View style={styles.metaItem}>
                                <Feather name="map-pin" size={moderateScale(13)} color={COLORS.textSecondary} />
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
                <View style={styles.sectionTitleRow}>
                    <View style={styles.iconBadge}>
                        <Feather name={icon} size={moderateScale(16)} color={COLORS.primary} />
                    </View>
                    <Text style={styles.sectionTitle}>{title}</Text>
                </View>
                {showViewAll && (
                    <TouchableOpacity style={styles.viewAllBtn} onPress={onViewAll} activeOpacity={0.7}>
                        <Text style={styles.viewAllText}>View All</Text>
                        <Feather name="chevron-right" size={moderateScale(16)} color={COLORS.primary} />
                    </TouchableOpacity>
                )}
            </View>
            {children}
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

    // Render the correct action bar depending on lock state
    const renderActionBar = () => {
        // This agency is already selected — show a "Go to Dashboard" button
        if (isThisAgencySelected) {
            return (
                <View style={styles.actionBar}>
                    <View style={styles.lockedNotice}>
                        <Feather name="lock" size={moderateScale(15)} color={COLORS.lockedText} />
                        <Text style={styles.lockedNoticeText}>You are enrolled with this agency</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.goToDashboardBtn}
                        onPress={() => router.replace({
                            pathname: `/agency/selected/${id}`,
                            params: { name: agencyData?.name, agencyLogo: agencyData?.imageUri }
                        })}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.goToDashboardBtnText}>Go to Dashboard</Text>
                        <Feather name="arrow-right" size={moderateScale(18)} color="#FFF" />
                    </TouchableOpacity>
                </View>
            );
        }

        // A different agency is already selected — show a disabled/locked state
        if (isDifferentAgencySelected) {
            return (
                <View style={styles.actionBar}>
                    <View style={styles.lockedWarning}>
                        <Feather name="alert-circle" size={moderateScale(15)} color="#C62828" />
                        <Text style={styles.lockedWarningText}>
                            You are already enrolled with <Text style={{ fontWeight: '700' }}>{activeAgency.name}</Text>
                        </Text>
                    </View>
                    <View style={styles.selectBtnDisabled}>
                        <Feather name="lock" size={moderateScale(18)} color={COLORS.disabled} />
                        <Text style={styles.selectBtnDisabledText}>Selection Locked</Text>
                    </View>
                </View>
            );
        }

        // No agency selected yet — normal select button
        return (
            <View style={styles.actionBar}>
                <TouchableOpacity
                    style={styles.selectBtn}
                    onPress={handleSelectAgency}
                    disabled={selecting}
                    activeOpacity={0.8}
                >
                    {selecting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <Text style={styles.selectBtnText}>Select This Agency</Text>
                            <Feather name="arrow-right" size={moderateScale(18)} color="#FFF" />
                        </>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safe} edges={['bottom']}>
            <StatusBar barStyle="light-content" />

            <Animated.View style={[styles.animatedHeader, { opacity: headerOpacity }]}>
                <Text style={styles.animatedHeaderText} numberOfLines={1}>
                    {agencyData.name}
                </Text>
            </Animated.View>

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
                    {/* Locked-to-different-agency banner inside content */}
                    {isDifferentAgencySelected && (
                        <View style={styles.lockedBanner}>
                            <Feather name="lock" size={moderateScale(16)} color="#C62828" />
                            <Text style={styles.lockedBannerText}>
                                You are currently enrolled with{' '}
                                <Text style={{ fontWeight: '700' }}>{activeAgency.name}</Text>.
                                Contact support if you need to switch agencies.
                            </Text>
                        </View>
                    )}

                    <Section title="About Agency" icon="info">
                        <Text style={styles.aboutText}>{agencyData.about}</Text>
                    </Section>

                    {agencyData.services?.length > 0 && (
                        <Section title="Services Offered" icon="check-circle">
                            <View style={styles.servicesGrid}>
                                {agencyData.services.map((service, index) => (
                                    <View key={`service-${index}`} style={styles.serviceChip}>
                                        <Feather name="check" size={moderateScale(14)} color={COLORS.primary} />
                                        <Text style={styles.serviceChipText}>{service}</Text>
                                    </View>
                                ))}
                            </View>
                        </Section>
                    )}

                    {agencyData.process?.length > 0 && (
                        <Section title="Our Process" icon="list">
                            <View style={styles.processContainer}>
                                {agencyData.process.map((step, index) => (
                                    <View key={`step-${index}`} style={styles.processItem}>
                                        <View style={styles.processNumberWrapper}>
                                            <View style={styles.processNumber}>
                                                <Text style={styles.processNumberText}>{index + 1}</Text>
                                            </View>
                                            {index < agencyData.process.length - 1 && (
                                                <View style={styles.processConnector} />
                                            )}
                                        </View>
                                        <View style={styles.processContent}>
                                            <Text style={styles.processText}>{step}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </Section>
                    )}

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
                                <Feather name="briefcase" size={moderateScale(40)} color={COLORS.cardBorder} />
                                <Text style={styles.emptyStateText}>No partner universities available</Text>
                            </View>
                        )}
                    </Section>
                </View>

                <View style={styles.bottomSpacing} />
            </Animated.ScrollView>

            {renderActionBar()}
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
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    animatedHeaderText: {
        fontSize: moderateScale(16),
        fontWeight: '700',
        color: COLORS.heading,
        textAlign: 'center',
    },
    scrollContent: {
        paddingBottom: moderateScale(100),
    },
    headerSection: {
        marginBottom: moderateScale(20),
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
    bannerOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '50%',
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    agencyCard: {
        marginHorizontal: moderateScale(16),
        marginTop: -moderateScale(50),
        backgroundColor: COLORS.cardBg,
        borderRadius: moderateScale(16),
        padding: moderateScale(16),
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: {
                elevation: 6,
            },
        }),
    },
    agencyCardContent: {
        flexDirection: 'row',
        gap: moderateScale(14),
    },
    agencyLogoContainer: {
        width: moderateScale(72),
        height: moderateScale(72),
        borderRadius: moderateScale(14),
        backgroundColor: COLORS.lightBg,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: COLORS.cardBg,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    agencyLogo: {
        width: '100%',
        height: '100%',
    },
    agencyInfo: {
        flex: 1,
        justifyContent: 'center',
        gap: moderateScale(4),
    },
    agencyName: {
        fontSize: moderateScale(19),
        fontWeight: '700',
        color: COLORS.heading,
        marginBottom: moderateScale(2),
        lineHeight: moderateScale(25),
    },
    yourAgencyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(5),
        backgroundColor: COLORS.locked,
        alignSelf: 'flex-start',
        paddingHorizontal: moderateScale(10),
        paddingVertical: moderateScale(4),
        borderRadius: moderateScale(20),
        borderWidth: 1,
        borderColor: COLORS.lockedBorder,
        marginBottom: moderateScale(4),
    },
    yourAgencyBadgeText: {
        fontSize: moderateScale(11),
        fontWeight: '700',
        color: COLORS.lockedText,
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
        gap: moderateScale(5),
    },
    metaDivider: {
        width: 1,
        height: moderateScale(14),
        backgroundColor: COLORS.border,
    },
    metaText: {
        fontSize: moderateScale(12),
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    // Lock banner inside content
    lockedBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: moderateScale(10),
        backgroundColor: '#FFEBEE',
        borderRadius: moderateScale(12),
        padding: moderateScale(14),
        borderWidth: 1,
        borderColor: '#FFCDD2',
    },
    lockedBannerText: {
        flex: 1,
        fontSize: moderateScale(13),
        color: '#C62828',
        lineHeight: moderateScale(19),
    },
    contentContainer: {
        paddingHorizontal: moderateScale(16),
        gap: moderateScale(16),
    },
    section: {
        backgroundColor: COLORS.cardBg,
        borderRadius: moderateScale(16),
        padding: moderateScale(16),
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 3,
            },
            android: {
                elevation: 1,
            },
        }),
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: moderateScale(16),
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(10),
        flex: 1,
    },
    iconBadge: {
        width: moderateScale(34),
        height: moderateScale(34),
        borderRadius: moderateScale(10),
        backgroundColor: COLORS.accentLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        fontSize: moderateScale(16),
        fontWeight: '700',
        color: COLORS.heading,
        flex: 1,
    },
    viewAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(4),
        paddingVertical: moderateScale(6),
        paddingLeft: moderateScale(10),
        paddingRight: moderateScale(6),
    },
    viewAllText: {
        fontSize: moderateScale(13),
        fontWeight: '600',
        color: COLORS.primary,
    },
    aboutText: {
        fontSize: moderateScale(14),
        color: COLORS.text,
        lineHeight: moderateScale(22),
    },
    servicesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: moderateScale(8),
    },
    serviceChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.accentLight,
        paddingHorizontal: moderateScale(12),
        paddingVertical: moderateScale(8),
        borderRadius: moderateScale(20),
        gap: moderateScale(6),
        flexShrink: 1,
    },
    serviceChipText: {
        fontSize: moderateScale(13),
        color: COLORS.primary,
        fontWeight: '600',
        flexShrink: 1,
    },
    processContainer: {
        gap: 0,
    },
    processItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: moderateScale(12),
    },
    processNumberWrapper: {
        alignItems: 'center',
        marginRight: moderateScale(12),
        paddingTop: moderateScale(2),
    },
    processNumber: {
        width: moderateScale(28),
        height: moderateScale(28),
        borderRadius: moderateScale(14),
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    processNumberText: {
        fontSize: moderateScale(13),
        fontWeight: '700',
        color: '#FFFFFF',
    },
    processConnector: {
        width: 2,
        flex: 1,
        minHeight: moderateScale(30),
        backgroundColor: COLORS.cardBorder,
        marginVertical: moderateScale(4),
    },
    processContent: {
        flex: 1,
        backgroundColor: COLORS.lightBg,
        padding: moderateScale(12),
        borderRadius: moderateScale(10),
        minHeight: moderateScale(50),
        justifyContent: 'center',
    },
    processText: {
        fontSize: moderateScale(13),
        color: COLORS.text,
        lineHeight: moderateScale(19),
        fontWeight: '500',
    },
    partnersList: {
        paddingVertical: moderateScale(4),
    },
    partnerCard: {
        width: moderateScale(140),
        height: moderateScale(140),
        borderRadius: moderateScale(16),
        backgroundColor: COLORS.cardBg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    partnerLogo: {
        width: '100%',
        height: '100%',
    },
    partnerPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: COLORS.lightBg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: moderateScale(8),
        padding: moderateScale(12),
    },
    placeholderText: {
        fontSize: moderateScale(12),
        color: COLORS.textSecondary,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: moderateScale(16),
    },
    partnerNameOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        paddingVertical: moderateScale(8),
        paddingHorizontal: moderateScale(10),
        borderTopWidth: 1,
        borderTopColor: COLORS.cardBorder,
    },
    partnerName: {
        fontSize: moderateScale(11),
        color: COLORS.text,
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: moderateScale(14),
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: moderateScale(40),
        gap: moderateScale(12),
    },
    emptyStateText: {
        fontSize: moderateScale(14),
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    // Action bar variants
    actionBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: COLORS.cardBg,
        paddingHorizontal: moderateScale(16),
        paddingTop: moderateScale(12),
        paddingBottom: moderateScale(16),
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        gap: moderateScale(8),
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    // Normal "Select" button
    selectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: moderateScale(16),
        borderRadius: moderateScale(12),
        backgroundColor: COLORS.primary,
        gap: moderateScale(8),
        ...Platform.select({
            ios: {
                shadowColor: COLORS.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    selectBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: moderateScale(16),
    },
    // Disabled/locked select button (different agency selected)
    selectBtnDisabled: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: moderateScale(16),
        borderRadius: moderateScale(12),
        backgroundColor: COLORS.disabledBg,
        gap: moderateScale(8),
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    selectBtnDisabledText: {
        color: COLORS.disabled,
        fontWeight: '700',
        fontSize: moderateScale(16),
    },
    // "Go to Dashboard" button (this agency already selected)
    goToDashboardBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: moderateScale(16),
        borderRadius: moderateScale(12),
        backgroundColor: COLORS.success,
        gap: moderateScale(8),
        ...Platform.select({
            ios: {
                shadowColor: COLORS.success,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    goToDashboardBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: moderateScale(16),
    },
    // Lock notices above buttons
    lockedNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: moderateScale(6),
    },
    lockedNoticeText: {
        fontSize: moderateScale(13),
        color: COLORS.lockedText,
        fontWeight: '600',
    },
    lockedWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: moderateScale(6),
    },
    lockedWarningText: {
        fontSize: moderateScale(12),
        color: '#C62828',
        flex: 1,
        textAlign: 'center',
    },
    bottomSpacing: {
        height: moderateScale(20),
    },
});