import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';

export default function AgencyCourseList() {
    // Get ALL parameters from navigation
    const { id, courses: coursesParam, agencyName } = useLocalSearchParams();
    const router = useRouter();
    const { userToken } = useAuth();

    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log('=== COURSE LIST PAGE DEBUG ===');
        console.log('Agency ID from route [id]:', id);
        console.log('Courses parameter received:', coursesParam);
        console.log('Agency Name:', agencyName);
        console.log('==============================');

        // First try to use courses passed from home page
        if (coursesParam) {
            try {
                // Parse the courses if they were passed as JSON string
                let parsedCourses = coursesParam;
                if (typeof coursesParam === 'string') {
                    parsedCourses = JSON.parse(coursesParam);
                }
                
                console.log('Parsed courses from home page:', parsedCourses);
                
                if (Array.isArray(parsedCourses) && parsedCourses.length > 0) {
                    // Use courses from home page immediately
                    setCourses(parsedCourses);
                    setLoading(false);
                    return; // Don't fetch from API
                }
            } catch (error) {
                console.log('Error parsing courses param:', error);
                // Continue to fetch from API
            }
        }

        // If no courses were passed or parsing failed, fetch from API
        const loadCourses = async () => {
            try {
                console.log('Fetching courses from API for agency:', id);
                
                // Fetching courses for this specific Agency ID
                const res = await fetch(`https://edu-agent-backend-nine.vercel.app/api/v1/agency/courses/agency/${id}`, {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                });

                console.log('API Response Status:', res.status);
                
                if (res.ok) {
                    const json = await res.json();
                    console.log('API Response Data:', json);
                    
                    // Handle different response structures
                    const coursesData = json.courses || json.data || [];
                    console.log('Courses data from API:', coursesData);
                    setCourses(coursesData);
                } else {
                    console.log('API failed, using fallback');
                    // Fallback Provisionary Data
                    setCourses([
                        { id: 'c1', name: "Bachelors of Nursing", title: "Bachelors of Nursing" },
                        { id: 'c2', name: "Bachelors of Political Sci.", title: "Bachelors of Political Sci." },
                        { id: 'c3', name: "Business Management", title: "Business Management" },
                        { id: 'c4', name: "IT & Computer Science", title: "IT & Computer Science" },
                        { id: 'c5', name: "Architecture", title: "Architecture" },
                        { id: 'c6', name: "Public Health", title: "Public Health" }
                    ]);
                }
            } catch (e) {
                console.log("Fetch error:", e);
                setCourses([{ id: 'c1', name: "Nursing", title: "Nursing" }, { id: 'c2', name: "Politics", title: "Politics" }]);
            } finally {
                setLoading(false);
            }
        };
        
        loadCourses();
    }, [id, userToken, coursesParam]); // Add coursesParam to dependencies

    // Helper function to get course display name
    const getCourseDisplayName = (course) => {
        return course.title || course.name || 'Unnamed Course';
    };

    // Helper function to get course ID
    const getCourseId = (course) => {
        return course._id || course.id || Math.random().toString();
    };

    const renderCourseItem = ({ item, index }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: index % 2 === 0 ? '#FF6B6B' : '#949BFF' }]}
            onPress={() => {
                // Debug log
                console.log('Course clicked:', item);
                console.log('Course ID to pass:', getCourseId(item));
                console.log('Course Name to pass:', getCourseDisplayName(item));

                // Navigate WITHOUT course ID in the URL path
                router.push({
                    pathname: '/agency/selected/courses/details', // Just the path, no ID
                    params: {
                        courseId: getCourseId(item),      // Pass as parameter
                        agencyId: id,                    // Agency ID
                        courseName: getCourseDisplayName(item)  // Course name
                    }
                });
            }}
        >
            <Text style={styles.cardText}>{getCourseDisplayName(item)}</Text>
            <Ionicons name="arrow-forward-circle-outline" size={20} color="rgba(255,255,255,0.7)" style={styles.icon} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>
                    {agencyName ? `${agencyName} Courses` : 'Available Courses'}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#769FCD" />
                    <Text style={{ marginTop: 10, color: '#666' }}>Loading courses...</Text>
                </View>
            ) : (
                <>
                    <View style={styles.courseCount}>
                        <Text style={styles.courseCountText}>
                            {courses.length} {courses.length === 1 ? 'Course' : 'Courses'} Available
                        </Text>
                    </View>
                    <FlatList
                        data={courses}
                        numColumns={2}
                        keyExtractor={(item, index) => getCourseId(item) || index.toString()}
                        renderItem={renderCourseItem}
                        columnWrapperStyle={styles.row}
                        contentContainerStyle={styles.listPadding}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="book-outline" size={60} color="#CCC" />
                                <Text style={styles.emptyText}>No courses available</Text>
                                <Text style={styles.emptySubtext}>Check back later or contact the agency</Text>
                            </View>
                        }
                    />
                </>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFD' },
    center: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        alignItems: 'center',
        backgroundColor: '#F8FAFD',
        borderBottomWidth: 1,
        borderBottomColor: '#EEF2F7',
    },
    backBtn: { 
        padding: 5,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: { 
        fontSize: 18, 
        fontWeight: 'bold', 
        color: '#769FCD',
        textAlign: 'center',
        flex: 1,
    },
    courseCount: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#F0F4F8',
        marginTop: 10,
    },
    courseCountText: {
        fontSize: 14,
        color: '#718096',
        fontWeight: '500',
    },
    listPadding: { 
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 10,
    },
    row: { 
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    card: {
        width: '48%',
        height: 120,
        borderRadius: 16,
        padding: 15,
        justifyContent: 'space-between',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
    },
    cardText: { 
        color: '#FFF', 
        fontWeight: 'bold', 
        fontSize: 14,
        lineHeight: 18,
    },
    icon: { 
        alignSelf: 'flex-end',
        marginTop: 8,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#718096',
        marginTop: 20,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#9AA7BC',
        textAlign: 'center',
    },
});