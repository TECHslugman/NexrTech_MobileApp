//scholarships/[id]
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    TextInput
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';
import { Config } from '../../../../config';

const COLORS = {
    bg: '#F8FAFD',
    primary: '#769FCD',
    white: '#FFFFFF',
    textPrimary: '#2D3748',
    textSecondary: '#718096',
    border: '#EEF2F7',
    card1: '#769FCD',
    card2: '#769FCD',
    lightBlue: '#E8F1FF',
};

export default function AllScholarships() {
    const router = useRouter();
    const { id, agencyName } = useLocalSearchParams();
    const { userToken } = useAuth();

    const [scholarships, setScholarships] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState(null);

    const loadScholarships = async (query = '') => {
        try {
            if (query.length > 0) setIsSearching(true);
            else setLoading(true);
            
            setError(null);

            const url = query.trim().length > 0
                ? `${Config.API_BASE_URL}/students/scholarships/query/${id}/search?q=${query}`
                : `${Config.API_BASE_URL}/agency/scholarships/agency/${id}`;

            console.log('Fetching from:', url);
            
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });

            const json = await response.json();

            if (response.ok) {
                // Handle the response structure - scholarship array under 'scholarship' key
                const data = json.scholarship || json.scholarships || json.data || [];
                setScholarships(Array.isArray(data) ? data : []);
            } else {
                setError('Failed to load scholarships');
                setScholarships([]);
            }
        } catch (error) {
            console.log("Fetch Error:", error);
            setError('Network error. Please try again.');
            setScholarships([]);
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    };

    useEffect(() => {
        loadScholarships();
    }, [id]);

    const handleClearSearch = () => {
        setSearchQuery('');
        loadScholarships('');
    };

    const getScholarshipId = (item) => item._id || item.id || Math.random().toString();
    const getScholarshipDisplayName = (item) => item.title || item.name || 'Scholarship Program';
    const getScholarshipDeadline = (item) => {
        const deadline = item.applicationDateline || item.deadline || item.applicationDeadline;
        if (!deadline) return null;
        try {
            const date = new Date(deadline);
            if (isNaN(date.getTime())) return deadline;
            return date.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short'
            });
        } catch {
            return deadline;
        }
    };
    const getScholarshipAmount = (item) => {
        const amount = item.amount;
        if (!amount) return null;
        if (typeof amount === 'number') return `$${amount.toLocaleString()}`;
        if (typeof amount === 'string') {
            if (amount.startsWith('$')) return amount;
            const num = parseFloat(amount);
            if (!isNaN(num)) return `$${num.toLocaleString()}`;
        }
        return amount;
    };

    const renderScholarshipItem = ({ item, index }) => {
        const displayName = getScholarshipDisplayName(item);
        const deadline = getScholarshipDeadline(item);
        const amount = getScholarshipAmount(item);
        const isActive = item.status?.toLowerCase() === 'active' || item.status?.toLowerCase() === 'open';
        
        return (
            <TouchableOpacity
                style={[
                    styles.card,
                    { backgroundColor: index % 2 === 0 ? COLORS.card1 : COLORS.card2 }
                ]}
                onPress={() => {
                    router.push({
                        pathname: '/agency/selected/scholarships/details',
                        params: {
                            id: getScholarshipId(item),
                            agencyId: id,
                            scholarshipName: displayName
                        }
                    });
                }}
                activeOpacity={0.7}
            >
                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle} numberOfLines={2}>
                            {displayName}
                        </Text>
                        {isActive && (
                            <View style={styles.activeBadge}>
                                <View style={styles.activeDot} />
                                <Text style={styles.activeText}>Active</Text>
                            </View>
                        )}
                    </View>
                    
                    <View style={styles.cardFooter}>
                        <View style={styles.cardMeta}>
                            {deadline && (
                                <View style={styles.metaItem}>
                                    <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.8)" />
                                    <Text style={styles.metaText}>{deadline}</Text>
                                </View>
                            )}
                            {amount && (
                                <View style={styles.metaItem}>
                                    <Ionicons name="cash-outline" size={12} color="rgba(255,255,255,0.8)" />
                                    <Text style={styles.metaText}>{amount}</Text>
                                </View>
                            )}
                        </View>
                        <Ionicons 
                            name="arrow-forward-circle-outline" 
                            size={24} 
                            color="rgba(255,255,255,0.9)" 
                        />
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
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {agencyName || 'Scholarships'}
                    </Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.searchWrapper}>
                    <Ionicons name="search" size={18} color={COLORS.textSecondary} />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="Search scholarships..."
                        placeholderTextColor="#A0AEC0"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={() => loadScholarships(searchQuery)}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={handleClearSearch}>
                            <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading scholarships...</Text>
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Ionicons name="alert-circle-outline" size={60} color={COLORS.textSecondary} />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity 
                        style={styles.retryButton}
                        onPress={() => loadScholarships(searchQuery)}
                    >
                        <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    <View style={styles.countContainer}>
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>
                                {isSearching ? 'Searching...' : `${scholarships.length} ${scholarships.length === 1 ? 'Scholarship' : 'Scholarships'} Available`}
                            </Text>
                        </View>
                    </View>
                    
                    <FlatList
                        data={scholarships}
                        numColumns={2}
                        keyExtractor={(item, index) => getScholarshipId(item) || index.toString()}
                        renderItem={renderScholarshipItem}
                        columnWrapperStyle={styles.row}
                        contentContainerStyle={styles.listPadding}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="trophy-outline" size={60} color={COLORS.border} />
                                <Text style={styles.emptyTitle}>No Scholarships Found</Text>
                                <Text style={styles.emptySubtitle}>
                                    {isSearching ? 'Try a different search term' : 'No scholarships available at this time'}
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
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    errorText: {
        fontSize: 18,
        color: COLORS.textPrimary,
        marginTop: 16,
        marginBottom: 24,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 30,
        paddingVertical: 14,
        borderRadius: 25,
    },
    retryButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '600',
    },
    header: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 25,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
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
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        color: COLORS.textPrimary,
    },
    countContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
    },
    countBadge: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    countText: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '600',
    },
    listPadding: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 10,
    },
    row: {
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    card: {
        width: '48%',
        height: 160,
        borderRadius: 20,
        padding: 16,
    },
    cardContent: {
        flex: 1,
        justifyContent: 'space-between',
    },
    cardHeader: {
        flex: 1,
    },
    cardTitle: {
        color: COLORS.white,
        fontWeight: '700',
        fontSize: 16,
        lineHeight: 22,
        marginBottom: 8,
    },
    activeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
        gap: 4,
    },
    activeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#4CAF50',
    },
    activeText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    cardMeta: {
        flex: 1,
        marginRight: 8,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 4,
    },
    metaText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 11,
        fontWeight: '500',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginTop: 20,
    },
    emptySubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 8,
        textAlign: 'center',
        opacity: 0.8,
    },
});