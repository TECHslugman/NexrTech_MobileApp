import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, Image, 
    TouchableOpacity, ActivityIndicator, StatusBar, TextInput 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';

const DEFAULT_IMAGE = 'https://i.pravatar.cc/300';
const BASE_URL = 'https://edu-agent-backend-nine.vercel.app/api/v1';

const COLORS = {
    bg: '#F8FAFD',
    primary: '#769FCD',
    white: '#FFFFFF',
    textPrimary: '#1E293B',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    cardBg: '#FFFFFF',
};

export default function MentorListPage() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { userToken } = useAuth();
    
    const [loading, setLoading] = useState(true);
    const [mentors, setMentors] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchMentors = async () => {
            if (!userToken || !id) return;
            try {
                const response = await fetch(`${BASE_URL}/students/mentors/${id}`, {
                    headers: {
                        'Authorization': `Bearer ${userToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                const json = await response.json();
                if (response.ok) {
                    const formattedMentors = (json.mentors || []).map(m => ({
                        id: m._id,
                        name: m.name,
                        profilepic: m.profilepic,
                        experience: m.experiences && m.experiences.length > 0 
                            ? m.experiences[0] 
                            : "Professional mentor for higher education",
                        isVerified: m.isVerified
                    }));
                    setMentors(formattedMentors);
                }
            } catch (error) {
                console.error("❌ Mentor Fetch Error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMentors();
    }, [id, userToken]);

    const filteredMentors = mentors.filter(m => 
        m.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderMentorCard = ({ item }) => (
        <TouchableOpacity 
            style={styles.mentorCard}
            onPress={() => router.push({
                pathname: `/agency/selected/mentors/details`,
                params: { id: item.id, agencyId: id }
            })}
            activeOpacity={0.7}
        >
            <Image 
                source={item.profilepic ? { uri: item.profilepic } : { uri: DEFAULT_IMAGE }} 
                style={styles.avatar} 
            />
            
            <View style={styles.mentorInfo}>
                <View style={styles.nameRow}>
                    <Text style={styles.mentorName} numberOfLines={1}>{item.name}</Text>
                    {item.isVerified && (
                        <MaterialIcons name="verified" size={16} color={COLORS.primary} style={{marginLeft: 4}} />
                    )}
                </View>
                <Text style={styles.mentorExp} numberOfLines={2}>
                    {item.experience}
                </Text>
            </View>
            
            <View style={styles.arrowCircle}>
                <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
            
            {/* Unified Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Find a Mentor</Text>
                    <View style={{ width: 40 }} />
                </View>
                <Text style={styles.headerSubtitle}>
                    Get expert guidance for your education journey
                </Text>
            </View>

            {/* Floating Search Bar */}
            <View style={styles.searchWrapper}>
                <View style={styles.searchContainer}>
                    <Feather name="search" size={20} color={COLORS.textSecondary} />
                    <TextInput 
                        placeholder="Search by name..."
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor={COLORS.textSecondary}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View style={styles.content}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={filteredMentors}
                        keyExtractor={(item) => item.id}
                        renderItem={renderMentorCard}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                        ListHeaderComponent={
                            <Text style={styles.resultsCount}>
                                {filteredMentors.length} {filteredMentors.length === 1 ? 'Mentor' : 'Mentors'} Available
                            </Text>
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Feather name="user-x" size={50} color={COLORS.textSecondary} />
                                <Text style={styles.emptyTitle}>No mentors found</Text>
                                <Text style={styles.emptyText}>Try searching for another name.</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 40,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    backButton: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.white },
    headerSubtitle: { fontSize: 14, color: 'rgba(255, 255, 255, 0.8)', textAlign: 'center', marginTop: 5 },
    searchWrapper: { paddingHorizontal: 20, marginTop: -25 },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 50,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: COLORS.textPrimary },
    content: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center' },
    listContent: { padding: 20, paddingBottom: 100 },
    resultsCount: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 15, textTransform: 'uppercase', letterSpacing: 0.5 },
    mentorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        padding: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    avatar: { width: 65, height: 65, borderRadius: 32.5, backgroundColor: COLORS.bg },
    mentorInfo: { flex: 1, marginLeft: 15, marginRight: 10 },
    nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    mentorName: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
    mentorExp: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
    arrowCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F0F7FF', justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginTop: 15 },
    emptyText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 5 }
});