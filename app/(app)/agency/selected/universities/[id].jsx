import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Image,
    ActivityIndicator,
    StatusBar,
    useWindowDimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';

const BASE_URL = 'https://edu-agent-backend-nine.vercel.app/api/v1';

const COLORS = {
    bg: '#F8FAFD',
    primary: '#769FCD',
    primaryLight: 'rgba(118, 159, 205, 0.1)',
    white: '#FFFFFF',
    textPrimary: '#2D3748',
    textSecondary: '#718096',
    border: '#EEF2F7',
    cardBg: '#FFFFFF',
};

export default function AllUniversities() {
    const router = useRouter();
    const { id, agencyName } = useLocalSearchParams();
    const { userToken } = useAuth();
    const { width } = useWindowDimensions();

    const [loading, setLoading] = useState(true);
    const [universities, setUniversities] = useState([]);

    useEffect(() => {
        const fetchUniversities = async () => {
            if (!userToken || !id) return;
            setLoading(true);

            try {
                const response = await fetch(`${BASE_URL}/agency/universities/agency/${id}`, {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                });

                if (response.ok) {
                    const json = await response.json();
                    
                    const partnerUnis = json.university?.partnerUniversities || [];
                    setUniversities(partnerUnis);
                } else {
                    throw new Error("Failed to fetch university data");
                }
            } catch (error) {
                console.error("Fetch Error:", error);
                // Fallback data for testing
                setUniversities([
                    { 
                        _id: '1', 
                        name: "University of Melbourne", 
                        logo: "https://upload.wikimedia.org/wikipedia/en/thumb/6/61/University_of_Melbourne_coat_of_arms.svg/1200px-University_of_Melbourne_coat_of_arms.svg.png",
                        country: "Australia"
                    },
                    { 
                        _id: '2', 
                        name: "University of Toronto", 
                        logo: "https://upload.wikimedia.org/wikipedia/en/thumb/6/6c/University_of_Toronto_coat_of_arms.svg/1200px-University_of_Toronto_coat_of_arms.svg.png",
                        country: "Canada"
                    },
                    { 
                        _id: '3', 
                        name: "University of Oxford", 
                        logo: "https://upload.wikimedia.org/wikipedia/en/thumb/5/5c/University_of_Oxford.svg/1200px-University_of_Oxford.svg.png",
                        country: "United Kingdom"
                    },
                    { 
                        _id: '4', 
                        name: "Harvard University", 
                        logo: "https://upload.wikimedia.org/wikipedia/en/thumb/2/29/Harvard_shield_wreath.svg/1200px-Harvard_shield_wreath.svg.png",
                        country: "United States"
                    },
                    { 
                        _id: '5', 
                        name: "University of Tokyo", 
                        logo: "https://upload.wikimedia.org/wikipedia/en/thumb/4/4e/University_of_Tokyo_coat_of_arms.svg/1200px-University_of_Tokyo_coat_of_arms.svg.png",
                        country: "Japan"
                    },
                    { 
                        _id: '6', 
                        name: "ETH Zurich", 
                        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/ETH_Z%C3%BCrich_Logo_black.svg/1200px-ETH_Z%C3%BCrich_Logo_black.svg.png",
                        country: "Switzerland"
                    },
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchUniversities();
    }, [id, userToken]);

    const renderUniItem = ({ item, index }) => {
        const universityId = item._id;
        const cardWidth = (width - 48) / 2;
        
        return (
            <TouchableOpacity 
                style={[styles.universityCard, { width: cardWidth }]}
                activeOpacity={0.85}
                onPress={() => {
                    router.push({
                        pathname: '/agency/selected/universities/details',
                        params: { 
                            id: universityId,
                            uniName: item.name || "University",
                            uniLogo: item.logo || "",
                            uniCountry: item.country || ""
                        }
                    });
                }}
            >
                <View style={styles.cardContent}>
                    {item.logo ? (
                        <Image 
                            source={{ uri: item.logo }} 
                            style={styles.universityLogo}
                            resizeMode="contain"
                        />
                    ) : (
                        <View style={styles.logoPlaceholder}>
                            <Text style={styles.logoPlaceholderText}>
                                {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
                            </Text>
                        </View>
                    )}
                    
                    <Text style={styles.universityName} numberOfLines={2}>
                        {item.name || "University"}
                    </Text>
                    
                    {item.country && (
                        <View style={styles.countryRow}>
                            <MaterialIcons name="location-on" size={12} color={COLORS.textSecondary} />
                            <Text style={styles.countryText} numberOfLines={1}>
                                {item.country}
                            </Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
            
            {/* Header with consistent blue design */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="chevron-back" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        {agencyName ? `${agencyName}` : 'Agency'}
                    </Text>
                    <View style={{ width: 40 }} />
                </View>
                <Text style={styles.headerSubtitle}>
                    Partner Universities
                </Text>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading universities...</Text>
                </View>
            ) : (
                <>
                    <View style={styles.universitiesCountContainer}>
                        <View style={styles.universitiesCountBadge}>
                            <Text style={styles.universitiesCountText}>
                                {universities.length} {universities.length === 1 ? 'University' : 'Universities'} Available
                            </Text>
                        </View>
                    </View>
                    
                    <FlatList
                        data={universities}
                        numColumns={2}
                        keyExtractor={(item, index) => (item._id || index).toString()}
                        renderItem={renderUniItem}
                        contentContainerStyle={styles.listContainer}
                        columnWrapperStyle={styles.columnWrapper}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <View style={styles.emptyIcon}>
                                    <Ionicons name="school-outline" size={60} color={COLORS.border} />
                                </View>
                                <Text style={styles.emptyTitle}>No Universities Available</Text>
                                <Text style={styles.emptyText}>
                                    Partner universities will be listed here
                                </Text>
                            </View>
                        }
                    />
                </>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    // Header with consistent blue design
    header: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 20,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        elevation: 4,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.white,
        textAlign: 'center',
        flex: 1,
    },
    headerSubtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
        textAlign: 'center',
        fontWeight: '500',
    },
    universitiesCountContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
    },
    universitiesCountBadge: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    universitiesCountText: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        paddingTop: 80,
    },
    emptyIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(118, 159, 205, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    listContainer: { 
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 40,
    },
    columnWrapper: { 
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    universityCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardContent: {
        padding: 20,
        alignItems: 'center',
    },
    universityLogo: {
        width: 80,
        height: 80,
        marginBottom: 16,
    },
    logoPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    logoPlaceholderText: {
        fontSize: 32,
        fontWeight: '700',
        color: COLORS.primary,
    },
    universityName: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 8,
        height: 40,
        width: '100%',
    },
    countryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    countryText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
});