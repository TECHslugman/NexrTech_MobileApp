import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, Image, 
    TouchableOpacity, ActivityIndicator, StatusBar, TextInput 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';

const DEFAULT_IMAGE = require('../../../../../assets/images/agencies/default.png');
const BASE_URL = 'https://edu-agent-backend-nine.vercel.app/api/v1';

const COLORS = {
    bg: '#F8FAFD',
    primary: '#769FCD',
    white: '#FFFFFF',
    textPrimary: '#2D3748',
    textSecondary: '#718096',
    border: '#EEF2F7',
    searchBg: '#F1F5F9',
    cardBg: '#FFFFFF',
    accent: '#E8F1FF',
    lightGray: '#F8FAFD',
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
                            : "Professional mentor for higher education"
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
        >
            <View style={styles.avatarContainer}>
                <Image 
                    source={item.profilepic ? { uri: item.profilepic } : DEFAULT_IMAGE} 
                    style={styles.avatar} 
                />
            </View>
            
            <View style={styles.mentorInfo}>
                <Text style={styles.mentorName}>{item.name}</Text>
                <Text style={styles.mentorExp} numberOfLines={2}>
                    {item.experience}
                </Text>
            </View>
            
            <View style={styles.arrowContainer}>
                <Feather name="chevron-right" size={20} color={COLORS.textSecondary} />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="light-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Mentors</Text>
                    <View style={styles.placeholder} />
                </View>
                <Text style={styles.headerSubtitle}>
                    Connect with experienced education mentors
                </Text>
            </View>

            {/* Search Bar */}
            <View style={styles.searchWrapper}>
                <View style={styles.searchContainer}>
                    <Feather name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
                    <TextInput 
                        placeholder="Search mentors by name..."
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor={COLORS.textSecondary}
                    />
                </View>
            </View>

            {/* Content */}
            <View style={styles.content}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Loading mentors...</Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.resultsHeader}>
                            <Text style={styles.resultsCount}>
                                {filteredMentors.length} {filteredMentors.length === 1 ? 'mentor' : 'mentors'} available
                            </Text>
                        </View>

                        <FlatList
                            data={filteredMentors}
                            keyExtractor={(item) => item.id}
                            renderItem={renderMentorCard}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.listContent}
                            ItemSeparatorComponent={() => <View style={styles.separator} />}
                            ListFooterComponent={<View style={styles.footer} />}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Feather name="users" size={60} color={COLORS.border} />
                                    <Text style={styles.emptyTitle}>No mentors found</Text>
                                    <Text style={styles.emptyText}>
                                        {searchQuery ? 'Try a different search term' : 'No mentors available at this time'}
                                    </Text>
                                </View>
                            }
                        />
                    </>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    header: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 25,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
    placeholder: {
        width: 40,
    },
    headerSubtitle: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.85)',
        textAlign: 'center',
        fontWeight: '400',
        lineHeight: 20,
    },
    searchWrapper: {
        paddingHorizontal: 20,
        marginTop: -15,
        zIndex: 1,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 52,
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        color: COLORS.textPrimary,
        fontSize: 16,
        fontWeight: '400',
    },
    content: {
        flex: 1,
        paddingTop: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        color: COLORS.textSecondary,
        fontSize: 16,
        fontWeight: '500',
    },
    resultsHeader: {
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    resultsCount: {
        fontSize: 15,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    mentorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.accent,
    },
    mentorInfo: {
        flex: 1,
        marginLeft: 16,
        marginRight: 12,
    },
    mentorName: {
        fontSize: 17,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 6,
    },
    mentorExp: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 20,
    },
    arrowContainer: {
        padding: 4,
    },
    separator: {
        height: 12,
    },
    footer: {
        height: 40,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginTop: 20,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 15,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
});