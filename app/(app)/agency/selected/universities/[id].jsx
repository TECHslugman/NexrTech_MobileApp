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
    useWindowDimensions,
    TextInput
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
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    // Function to fetch data (Handles both initial load and search)
    const fetchUniversities = async (query = '') => {
        if (!userToken || !id) return;
        
        try {
            let url;
            if (query.trim().length > 0) {
                setIsSearching(true);
                // Matches your Postman screenshot: students/universities/query/[agencyId]/search?q=...
                url = `${BASE_URL}/students/universities/query/${id}/search?q=${query}`;
            } else {
                setLoading(true);
                url = `${BASE_URL}/agency/universities/agency/${id}`;
            }

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });

            const json = await response.json();

            if (response.ok) {
                // Handling the data structure from your Postman screenshot
                // If searching, data is in json.universities.partnerUniversities
                // If initial load, data is in json.university.partnerUniversities
                const results = query.trim().length > 0 
                    ? (json.universities?.partnerUniversities || []) 
                    : (json.university?.partnerUniversities || []);
                
                setUniversities(results);
            }
        } catch (error) {
            console.error("Fetch Error:", error);
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    };

    useEffect(() => {
        fetchUniversities();
    }, [id, userToken]);

    const renderUniItem = ({ item }) => {
        const cardWidth = (width - 48) / 2;
        return (
            <TouchableOpacity 
                style={[styles.universityCard, { width: cardWidth }]}
                activeOpacity={0.85}
                onPress={() => {
                    router.push({
                        pathname: '/agency/selected/universities/details',
                        params: { 
                            id: item._id,
                            uniName: item.name,
                            uniLogo: item.logo,
                            uniCountry: item.country
                        }
                    });
                }}
            >
                <View style={styles.cardContent}>
                    {item.logo ? (
                        <Image source={{ uri: item.logo }} style={styles.universityLogo} resizeMode="contain" />
                    ) : (
                        <View style={styles.logoPlaceholder}>
                            <Text style={styles.logoPlaceholderText}>
                                {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
                            </Text>
                        </View>
                    )}
                    <Text style={styles.universityName} numberOfLines={2}>{item.name || "University"}</Text>
                    <View style={styles.countryRow}>
                        <MaterialIcons name="location-on" size={12} color={COLORS.textSecondary} />
                        <Text style={styles.countryText} numberOfLines={1}>{item.country || "Global"}</Text>
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
                    <Text style={styles.headerTitle}>{agencyName || 'Partner Universities'}</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Search Input field - Consistent with Courses/Scholarships */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="Search for a university..."
                        placeholderTextColor="#A0AEC0"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={() => fetchUniversities(searchQuery)}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearchQuery(''); fetchUniversities(''); }}>
                            <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {loading && !isSearching ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={universities}
                    numColumns={2}
                    keyExtractor={(item) => item._id}
                    renderItem={renderUniItem}
                    contentContainerStyle={styles.listContainer}
                    columnWrapperStyle={styles.columnWrapper}
                    ListHeaderComponent={
                        <View style={styles.badgeContainer}>
                            <View style={styles.countBadge}>
                                <Text style={styles.countText}>
                                    {isSearching ? 'Searching...' : `${universities.length} Universities Found`}
                                </Text>
                            </View>
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={styles.centerContainer}>
                            <Ionicons name="school-outline" size={60} color={COLORS.border} />
                            <Text style={styles.emptyText}>No results found for "{searchQuery}"</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 25,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        elevation: 5,
    },
    headerContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.white, textAlign: 'center', flex: 1 },
    searchContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        borderRadius: 15,
        paddingHorizontal: 15,
        height: 50,
        alignItems: 'center',
    },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, fontSize: 15, color: COLORS.textPrimary },
    listContainer: { paddingHorizontal: 20, paddingBottom: 40 },
    columnWrapper: { justifyContent: 'space-between', marginBottom: 16 },
    badgeContainer: { paddingVertical: 20 },
    countBadge: { backgroundColor: COLORS.white, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', borderWidth: 1, borderColor: COLORS.border },
    countText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
    universityCard: { backgroundColor: COLORS.cardBg, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, elevation: 2 },
    cardContent: { padding: 15, alignItems: 'center' },
    universityLogo: { width: 60, height: 60, marginBottom: 10 },
    logoPlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    logoPlaceholderText: { fontSize: 24, fontWeight: '700', color: COLORS.primary },
    universityName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center', height: 40 },
    countryRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
    countryText: { fontSize: 12, color: COLORS.textSecondary },
    centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 50 },
    emptyText: { marginTop: 10, color: COLORS.textSecondary, fontSize: 16 }
});