import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, 
    ActivityIndicator, StatusBar, TextInput 
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
    card1: '#FF6B6B',
    card2: '#949BFF',
    lightBlue: '#E8F1FF',
};

export default function AgencyCourseList() {
    const { id, agencyName, courses: coursesParam } = useLocalSearchParams();
    const router = useRouter();
    const { userToken } = useAuth();

    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    // Unified Load Function
    const loadCourses = async (query = '') => {
        try {
            if (query.length > 0) setIsSearching(true);
            else setLoading(true);

            // Toggle URL based on search input
            const url = query.trim().length > 0
                ? `${Config.API_BASE_URL}/students/courses/query/search?q=${query}`
                : `${Config.API_BASE_URL}/students/courses/` ;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });

            if (res.ok) {
                const json = await res.json();
                // Map to 'course' as seen in your Postman screenshot
                const coursesData = json.course || json.courses || json.data || [];
                setCourses(coursesData);
            }
        } catch (e) {
            console.log("Fetch error:", e);
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    };

    useEffect(() => {
        loadCourses();
    }, [id]);

    const getCourseDisplayName = (course) => course.title || course.name || 'Unnamed Course';
    const getCourseId = (course) => course._id || course.id || Math.random().toString();

    const renderCourseItem = ({ item, index }) => (
        <TouchableOpacity
            style={[
                styles.card, 
                { backgroundColor: index % 2 === 0 ? COLORS.card1 : COLORS.card2 }
            ]}
            onPress={() => {
                router.push({
                    pathname: '/agency/selected/courses/details',
                    params: {
                        courseId: getCourseId(item),
                        agencyId: id,
                        courseName: getCourseDisplayName(item)
                    }
                });
            }}
        >
            <Text style={styles.cardText}>{getCourseDisplayName(item)}</Text>
            <Ionicons 
                name="arrow-forward-circle-outline" 
                size={24} 
                color="rgba(255,255,255,0.8)" 
                style={styles.icon} 
            />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
            
            {/* Foundational UI Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{agencyName || 'Agency'}</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Search Bar built into Header */}
                <View style={styles.searchWrapper}>
                    <Ionicons name="search" size={18} color={COLORS.textSecondary} />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="Search for courses..."
                        placeholderTextColor="#A0AEC0"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={() => loadCourses(searchQuery)}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearchQuery(''); loadCourses(''); }}>
                            <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <>
                    <View style={styles.courseCountContainer}>
                        <View style={styles.courseCountBadge}>
                            <Text style={styles.courseCountText}>
                                {isSearching ? 'Searching...' : `${courses.length} ${courses.length === 1 ? 'Course' : 'Courses'} Available`}
                            </Text>
                        </View>
                    </View>
                    
                    <FlatList
                        data={courses}
                        numColumns={2}
                        keyExtractor={(item, index) => getCourseId(item) || index.toString()}
                        renderItem={renderCourseItem}
                        columnWrapperStyle={styles.row}
                        contentContainerStyle={styles.listPadding}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="book-outline" size={60} color={COLORS.border} />
                                <Text style={styles.emptyText}>No courses found</Text>
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
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
    courseCountContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
    courseCountBadge: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    courseCountText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
    listPadding: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 },
    row: { justifyContent: 'space-between', marginBottom: 15 },
    card: {
        width: '48%',
        height: 130,
        borderRadius: 20,
        padding: 18,
        justifyContent: 'space-between',
    },
    cardText: { color: COLORS.white, fontWeight: '700', fontSize: 15, lineHeight: 20 },
    icon: { alignSelf: 'flex-end', marginTop: 10 },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
    emptyText: { fontSize: 18, fontWeight: '600', color: COLORS.textSecondary, marginTop: 20 },
});