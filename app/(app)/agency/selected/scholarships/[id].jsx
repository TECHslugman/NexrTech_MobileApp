import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    StatusBar,
    useWindowDimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';

const BASE_URL = 'https://edu-agent-backend-nine.vercel.app/api/v1';

const COLORS = {
    bg: '#F8FAFD',
    primary: '#87A1C5',
    text: '#333333',
    cardLight: '#769FCD',
    cardDark: '#87A1C5',
    border: '#EEF2F7',
    white: '#FFFFFF',
};

export default function AllScholarships() {
    const router = useRouter();
    const { id, initialData } = useLocalSearchParams(); // Receive initialData from Home
    const { userToken } = useAuth();
    const { width } = useWindowDimensions();

    const [loading, setLoading] = useState(true);
    const [scholarships, setScholarships] = useState([]);

    useEffect(() => {
        const fetchScholarships = async () => {
            // 1. Try to use data passed from the Home page first
            if (initialData) {
                try {
                    const parsedData = JSON.parse(initialData);
                    if (Array.isArray(parsedData) && parsedData.length > 0) {
                        setScholarships(parsedData);
                        setLoading(false);
                        return; // Stop here if we have data
                    }
                } catch (e) {
                    console.error("Error parsing initialData:", e);
                }
            }

            // 2. Fetch from API if no initial data or if initial data was empty
            try {
                setLoading(true);
                const response = await fetch(`${BASE_URL}/agency/scholarships/agency/${id}`, {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                });

                const json = await response.json();
                if (response.ok) {
                    const data = json.scholarships || json.scholarship || json.data || json;
                    setScholarships(Array.isArray(data) ? data : []);
                } else {
                    throw new Error("API response not ok");
                }
            } catch (error) {
                console.log("Fetch Error, using fallback:", error);
                setScholarships([
                    { id: '1', title: "Australia Awards" },
                    { id: '2', title: "The Snow Scholarship" },
                    { id: '3', title: "Fulbright Program" },
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchScholarships();
    }, [id, userToken, initialData]);

    const renderScholarshipItem = ({ item, index }) => {
        const scholarshipId = item._id || item.id;
        const cardWidth = (width - 48) / 2;
        const isLight = index % 2 === 0;
        
        // Support both 'title' (from Home mapping) and 'name' (from raw API)
        const displayName = item.title || item.name || "Scholarship Program";
        
        return (
            <TouchableOpacity 
                style={[
                    styles.scholarshipCard, 
                    { 
                        width: cardWidth,
                        backgroundColor: isLight ? COLORS.cardLight : COLORS.cardDark
                    }
                ]}
                activeOpacity={0.85}
                onPress={() => {
                    router.push({
                        pathname: '/agency/selected/scholarships/details',
                        params: { 
                            id: scholarshipId,
                            agencyId: id, 
                            scholarshipName: displayName
                        }
                    });
                }}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons 
                            name="trophy-outline" 
                            size={22} 
                            color="rgba(255,255,255,0.9)" 
                        />
                    </View>
                    <View style={styles.numberBadge}>
                        <Text style={styles.numberText}>#{index + 1}</Text>
                    </View>
                </View>
                
                <Text style={styles.scholarshipTitle} numberOfLines={3}>
                    {displayName}
                </Text>
                
                <View style={styles.cardFooter}>
                    <View style={styles.detailsBadge}>
                        <Text style={styles.detailsText}>Details</Text>
                        <Ionicons name="chevron-forward" size={12} color="#FFFFFF" />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Scholarships</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading scholarships...</Text>
                </View>
            ) : (
                <FlatList
                    data={scholarships}
                    numColumns={2}
                    keyExtractor={(item, index) => (item._id || item.id || index).toString()}
                    renderItem={renderScholarshipItem}
                    contentContainerStyle={styles.listContainer}
                    columnWrapperStyle={styles.columnWrapper}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialCommunityIcons name="trophy-outline" size={52} color="#CBD5E1" />
                            <Text style={styles.emptyTitle}>No Scholarships</Text>
                            <Text style={styles.emptyText}>No programs available at the moment</Text>
                        </View>
                    }
                    ListHeaderComponent={
                        scholarships.length > 0 && (
                            <View style={styles.listHeader}>
                                <Text style={styles.scholarshipCount}>
                                    Available Programs ({scholarships.length})
                                </Text>
                            </View>
                        )
                    }
                />
            )}
        </SafeAreaView>
    );
}

// ... styles remain the same as your previous version
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.white,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
        flex: 1,
        textAlign: 'center',
        marginLeft: -40,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: COLORS.text,
        opacity: 0.7,
    },
    emptyContainer: {
        marginTop: 100,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        gap: 12,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
        marginTop: 12,
    },
    emptyText: {
        fontSize: 14,
        color: '#888888',
        textAlign: 'center',
        lineHeight: 20,
    },
    listHeader: {
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    scholarshipCount: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    listContainer: { 
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 24,
    },
    columnWrapper: { 
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    scholarshipCard: {
        borderRadius: 20,
        padding: 20,
        justifyContent: 'space-between',
        height: 190,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    numberBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        borderRadius: 8,
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    numberText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    scholarshipTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        lineHeight: 24,
        marginVertical: 16,
        flex: 1,
    },
    cardFooter: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.3)',
        paddingTop: 12,
    },
    detailsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
        alignSelf: 'flex-start',
        gap: 6,
    },
    detailsText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});