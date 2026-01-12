import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, StatusBar, TextInput, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';

const COLORS = {
    bg: '#F8FAFD',
    primary: '#769FCD',
    primaryLight: 'rgba(118, 159, 205, 0.1)',
    white: '#FFFFFF',
    textPrimary: '#2D3748',
    textSecondary: '#718096',
    border: '#EEF2F7',
    cardBg: '#FFFFFF',
    searchBg: '#FFFFFF',
};

export default function MentorList() {
    const router = useRouter();
    const { userToken } = useAuth();

    const [mentors, setMentors] = useState([]);
    const [filteredMentors, setFilteredMentors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadMentors();
    }, [userToken]);

    useEffect(() => {
        filterMentors();
    }, [searchQuery, mentors]);

    const loadMentors = async () => {
        try {
            setLoading(true);
            const res = await fetch(`https://edu-agent-backend-nine.vercel.app/api/v1/mentors`, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });

            if (res.ok) {
                const json = await res.json();
                const mentorsData = json.mentors || json.data || [];
                setMentors(mentorsData);
                setFilteredMentors(mentorsData);
            } else {
                // Fallback Data
                const fallbackMentors = [
                    {
                        id: '1',
                        name: 'Karma Dema',
                        experience: '2+ years of mentoring students for higher education abroad',
                        image: 'https://i.pravatar.cc/150?img=1',
                        specialization: 'Study Abroad Guidance',
                    },
                    {
                        id: '2',
                        name: 'Pema Dema',
                        experience: '3+ years of mentoring students for higher education abroad',
                        image: 'https://i.pravatar.cc/150?img=2',
                        specialization: 'Visa & Documentation',
                    },
                    {
                        id: '3',
                        name: 'Sonam Dorji',
                        experience: '4+ years of mentoring students for higher education abroad',
                        image: 'https://i.pravatar.cc/150?img=3',
                        specialization: 'Scholarship Applications',
                    },
                    {
                        id: '4',
                        name: 'Pema Dorji',
                        experience: '2+ years of mentoring students for higher education abroad',
                        image: 'https://i.pravatar.cc/150?img=4',
                        specialization: 'University Selection',
                    },
                    {
                        id: '5',
                        name: 'Tashi Wangchuk',
                        experience: '5+ years of mentoring students for higher education abroad',
                        image: 'https://i.pravatar.cc/150?img=5',
                        specialization: 'Career Counseling',
                    },
                ];
                setMentors(fallbackMentors);
                setFilteredMentors(fallbackMentors);
            }
        } catch (e) {
            console.error("Fetch error:", e);
            setMentors([
                {
                    id: '1',
                    name: 'Karma Dema',
                    experience: '2+ years of mentoring students for higher education abroad',
                    image: 'https://via.placeholder.com/100',
                    specialization: 'Study Abroad Guidance'
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const filterMentors = () => {
        if (searchQuery.trim() === '') {
            setFilteredMentors(mentors);
            return;
        }

        const filtered = mentors.filter(mentor =>
            mentor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (mentor.specialization && mentor.specialization.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        setFilteredMentors(filtered);
    };

    const renderMentorItem = ({ item }) => (
        <TouchableOpacity
            style={styles.mentorCard}
            onPress={() => {
                router.push({
                    pathname: 'agency/selected/mentors/details',
                    params: {
                        mentorId: item.id,
                        name: item.name
                    }
                });
            }}
        >
            <Image
                source={{ uri: item.image || 'https://via.placeholder.com/100' }}
                style={styles.avatar}
            />
            <View style={styles.mentorInfo}>
                <Text style={styles.mentorName}>{item.name}</Text>
                {item.specialization && (
                    <View style={styles.specializationBadge}>
                        <Text style={styles.specializationText}>{item.specialization}</Text>
                    </View>
                )}
                <Text style={styles.mentorExp}>{item.experience}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
    );

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
                    <Text style={styles.headerTitle}>Mentors</Text>
                    <View style={{ width: 40 }} />
                </View>
                <Text style={styles.headerSubtitle}>
                    Expert Guidance for Your Journey
                </Text>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchCard}>
                    <Feather name="search" size={18} color={COLORS.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        placeholder="Search mentors by name or specialization..."
                        placeholderTextColor={COLORS.textSecondary}
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Content */}
            <View style={styles.content}>
                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Loading mentors...</Text>
                    </View>
                ) : filteredMentors.length > 0 ? (
                    <>
                        <View style={styles.countContainer}>
                            <View style={styles.countBadge}>
                                <Text style={styles.countText}>
                                    {filteredMentors.length} {filteredMentors.length === 1 ? 'Mentor' : 'Mentors'} Available
                                </Text>
                            </View>
                        </View>
                        
                        <FlatList
                            data={filteredMentors}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={renderMentorItem}
                            showsVerticalScrollIndicator={false}
                            ListFooterComponent={<View style={styles.listFooter} />}
                        />
                    </>
                ) : (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIcon}>
                            <Ionicons name="search-outline" size={60} color={COLORS.border} />
                        </View>
                        <Text style={styles.emptyStateTitle}>No mentors found</Text>
                        <Text style={styles.emptyStateText}>
                            Try searching with a different name or specialization
                        </Text>
                        <TouchableOpacity
                            style={styles.resetBtn}
                            onPress={() => setSearchQuery('')}
                        >
                            <Text style={styles.resetBtnText}>Clear Search</Text>
                        </TouchableOpacity>
                    </View>
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
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        color: COLORS.textSecondary,
        fontSize: 16,
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
    searchContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
    },
    searchCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.searchBg,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 52,
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        color: COLORS.textPrimary,
        fontSize: 16,
        height: '100%',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    countContainer: {
        paddingVertical: 10,
        marginBottom: 8,
    },
    countBadge: {
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
    countText: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '600',
    },
    mentorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.cardBg,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.primaryLight,
    },
    mentorInfo: {
        flex: 1,
        marginLeft: 16,
    },
    mentorName: {
        fontSize: 17,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 6,
    },
    specializationBadge: {
        backgroundColor: COLORS.primaryLight,
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 6,
    },
    specializationText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.primary,
    },
    mentorExp: {
        fontSize: 13,
        color: COLORS.textSecondary,
        lineHeight: 18,
    },
    listFooter: {
        height: 40,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    emptyStateTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyStateText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
        paddingHorizontal: 40,
    },
    resetBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    resetBtnText: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: '600',
    },
});