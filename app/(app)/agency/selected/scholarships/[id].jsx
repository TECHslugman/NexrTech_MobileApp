import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    StatusBar,
    useWindowDimensions,
    TextInput
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';
import { Config } from '../../../../config';

const COLORS = {
    bg: '#F8FAFD',
    primary: '#769FCD',
    primaryLight: 'rgba(118, 159, 205, 0.1)',
    white: '#FFFFFF',
    textPrimary: '#2D3748',
    textSecondary: '#718096',
    border: '#EEF2F7',
    cardLight: '#FF6B6B',
    cardDark: '#949BFF',
};

export default function AllScholarships() {
    const router = useRouter();
    const { id, initialData, agencyName } = useLocalSearchParams();
    const { userToken } = useAuth();
    const { width } = useWindowDimensions();

    const [loading, setLoading] = useState(true);
    const [scholarships, setScholarships] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    // Unified fetch function for both list and search
    const fetchScholarships = async (query = '') => {
        try {
            if (query.length > 0) setIsSearching(true);
            else setLoading(true);

            // Using the endpoint from your Postman screenshot for search
            const url = query.trim().length > 0
                ? `${Config.API_BASE_URL}/students/scholarships/query/${id}/search?q=${query}`
                : `${Config.API_BASE_URL}/agency/scholarships/agency/${id}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });

            const json = await response.json();
            if (response.ok) {
                // Mapping to 'scholarship' key as seen in Postman
                const data = json.scholarship || json.scholarships || json.data || [];
                setScholarships(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.log("Fetch Error:", error);
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    };

    useEffect(() => {
        fetchScholarships();
    }, [id]);

    const renderScholarshipItem = ({ item, index }) => {
        const scholarshipId = item._id || item.id;
        const cardWidth = (width - 48) / 2;
        const isLight = index % 2 === 0;
        const displayName = item.title || item.name || "Scholarship Program";
        
        return (
            <TouchableOpacity 
                style={[
                    styles.scholarshipCard, 
                    { 
                        width: cardWidth,
                        backgroundColor: isLight ? COLORS.cardLight : COLORS.cardDark,
                    }
                ]}
                activeOpacity={0.85}
                onPress={() => {
                    router.push({
                        pathname: '/agency/selected/scholarships/details',
                        params: { id: scholarshipId, agencyId: id, scholarshipName: displayName }
                    });
                }}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="trophy-outline" size={24} color="rgba(255,255,255,0.9)" />
                    </View>
                    <View style={styles.numberBadge}>
                        <Text style={styles.numberText}>#{index + 1}</Text>
                    </View>
                </View>
                
                <Text style={styles.scholarshipTitle} numberOfLines={3}>{displayName}</Text>
                
                <View style={styles.cardFooter}>
                    <View style={styles.detailsBadge}>
                        <Text style={styles.detailsText}>View Details</Text>
                        <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
            
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{agencyName || 'Agency'}</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Integrated Search Bar inside Header */}
                <View style={styles.searchWrapper}>
                    <Ionicons name="search" size={18} color={COLORS.textSecondary} />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="Search scholarships..."
                        placeholderTextColor="#A0AEC0"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={() => fetchScholarships(searchQuery)}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearchQuery(''); fetchScholarships(''); }}>
                            <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {loading && !isSearching ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <>
                    <View style={styles.scholarshipsCountContainer}>
                        <View style={styles.scholarshipsCountBadge}>
                            <Text style={styles.scholarshipsCountText}>
                                {isSearching ? 'Searching...' : `${scholarships.length} ${scholarships.length === 1 ? 'Program' : 'Programs'} Available`}
                            </Text>
                        </View>
                    </View>
                    
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
                                <MaterialCommunityIcons name="trophy-outline" size={60} color={COLORS.border} />
                                <Text style={styles.emptyTitle}>No Scholarships Found</Text>
                            </View>
                        }
                    />
                </>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 25,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        elevation: 4,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
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
    searchWrapper: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 45,
        alignItems: 'center',
    },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: COLORS.textPrimary },
    scholarshipsCountContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
    scholarshipsCountBadge: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    scholarshipsCountText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    listContainer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
    columnWrapper: { justifyContent: 'space-between', marginBottom: 16 },
    scholarshipCard: { borderRadius: 20, padding: 18, height: 180, justifyContent: 'space-between' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', alignItems: 'center', justifyContent: 'center' },
    numberBadge: { backgroundColor: 'rgba(255, 255, 255, 0.25)', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 },
    numberText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
    scholarshipTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', lineHeight: 22, marginVertical: 12 },
    cardFooter: { borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.3)', paddingTop: 12 },
    detailsBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start', gap: 6 },
    detailsText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.textSecondary, marginTop: 15 },
});