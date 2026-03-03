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
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';
import { Config } from '../../../../config';

const COLORS = {
    bg: '#F8FAFD',
    primary: '#769FCD',
    white: '#FFFFFF',
    textPrimary: '#2D3748',
    textSecondary: '#718096',
    border: '#EDF2F7',
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
    const [imageErrors, setImageErrors] = useState({});

    const fetchUniversities = async (query = '') => {
        if (!userToken || !id) return;
        
        try {
            let url;
            if (query.trim().length > 0) {
                setIsSearching(true);
                url = `${Config.API_BASE_URL}/students/universities/query/${id}/search?q=${query}`;
            } else {
                setLoading(true);
                url = `${Config.API_BASE_URL}/agency/universities/agency/${id}`;
            }

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });

            const json = await response.json();
            console.log('Full API Response:', JSON.stringify(json, null, 2));

            if (response.ok) {
                const results = query.trim().length > 0 
                    ? (json.universities?.partnerUniversities || []) 
                    : (json.university?.partnerUniversities || []);
                
                setUniversities(results);
                setImageErrors({});
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

    const handleImageError = (itemId) => {
        setImageErrors(prev => ({ ...prev, [itemId]: true }));
    };

    const renderUniItem = ({ item }) => {
        const cardWidth = (width - 48) / 2;
        const hasImageError = imageErrors[item._id];
        
        return (
            <TouchableOpacity 
                style={[styles.universityCard, { width: cardWidth }]}
                activeOpacity={0.7}
                onPress={() => {
                    router.push({
                        pathname: '/agency/selected/universities/details',
                        params: { 
                            id: item._id,
                            uniLogo: item.profileUrl
                        }
                    });
                }}
            >
                <View style={styles.imageContainer}>
                    {item.profileUrl && !hasImageError ? (
                        <Image 
                            source={{ uri: item.profileUrl }} 
                            style={styles.universityImage} 
                            resizeMode="contain"
                            onError={() => handleImageError(item._id)}
                        />
                    ) : (
                        <View style={styles.logoPlaceholder}>
                            <Ionicons name="school-outline" size={38} color={COLORS.primary} style={{ opacity: 0.6 }} />
                            <Text style={styles.logoPlaceholderText}>UNIVERSITY</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
            
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{agencyName || 'Partner Universities'}</Text>
                    <View style={{ width: 40 }} />
                </View>
                
                <Text style={styles.headerSubtitle}>Browse our partner institutions</Text>

                <View style={styles.searchContainer}>
                    <Feather name="search" size={18} color={COLORS.textSecondary} style={styles.searchIcon} />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="Search universities..."
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
                <View style={styles.center}>
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
                        universities.length > 0 ? (
                            <View style={styles.countContainer}>
                                <Text style={styles.countText}>
                                    {universities.length} {universities.length === 1 ? 'University' : 'Universities'}
                                </Text>
                            </View>
                        ) : null
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconContainer}>
                                <Feather name="book-open" size={32} color={COLORS.primary} />
                            </View>
                            <Text style={styles.emptyTitle}>
                                {isSearching ? 'No results found' : 'No universities yet'}
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                {isSearching 
                                    ? `No matches for "${searchQuery}"` 
                                    : 'Partner universities will appear here'}
                            </Text>
                            {isSearching && (
                                <TouchableOpacity 
                                    style={styles.clearButton}
                                    onPress={() => { setSearchQuery(''); fetchUniversities(''); }}
                                >
                                    <Text style={styles.clearButtonText}>Clear search</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { 
        flex: 1, 
        backgroundColor: COLORS.bg 
    },
    
    center: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    
    header: { 
        backgroundColor: COLORS.primary, 
        paddingBottom: 25, 
        borderBottomLeftRadius: 30, 
        borderBottomRightRadius: 30, 
        paddingHorizontal: 20 
    },
    
    headerContent: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginTop: 10 
    },
    
    backButton: { 
        width: 40, 
        height: 40, 
        borderRadius: 12, 
        backgroundColor: 'rgba(255,255,255,0.2)', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    
    headerTitle: { 
        color: COLORS.white, 
        fontSize: 18, 
        fontWeight: '700', 
        flex: 1, 
        textAlign: 'center' 
    },
    
    headerSubtitle: { 
        color: 'rgba(255,255,255,0.9)', 
        textAlign: 'center', 
        marginTop: 4, 
        marginBottom: 16,
        fontSize: 14 
    },
    
    searchContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 48,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    
    searchIcon: { 
        marginRight: 10 
    },
    
    searchInput: { 
        flex: 1, 
        fontSize: 15, 
        color: COLORS.textPrimary,
        paddingVertical: 0
    },
    
    listContainer: { 
        paddingHorizontal: 16, 
        paddingBottom: 24 
    },
    
    columnWrapper: { 
        justifyContent: 'space-between', 
        marginBottom: 16 
    },
    
    countContainer: {
        paddingVertical: 16,
        paddingHorizontal: 4,
    },
    
    countText: { 
        fontSize: 14, 
        color: COLORS.textSecondary, 
        fontWeight: '500' 
    },
    
    universityCard: { 
        backgroundColor: COLORS.cardBg, 
        borderRadius: 20, 
        borderWidth: 1, 
        borderColor: COLORS.border,
        overflow: 'hidden',
        height: 140,
    },
    
    imageContainer: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FBFD',
        overflow: 'hidden',
    },
    
    universityImage: { 
        width: '100%', 
        height: '100%',
    },
    
    logoPlaceholder: { 
        width: '100%',
        height: '100%',
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: 'rgba(118, 159, 205, 0.08)',
        gap: 6,
    },
    
    logoPlaceholderText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.primary,
        letterSpacing: 1,
        opacity: 0.7,
    },
    
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        paddingHorizontal: 32,
    },
    
    emptyIconContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(118, 159, 205, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 8,
    },
    
    emptySubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 20,
    },
    
    clearButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: COLORS.primary,
        borderRadius: 12,
    },
    
    clearButtonText: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: '600',
    },
});