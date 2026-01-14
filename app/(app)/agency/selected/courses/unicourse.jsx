import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
// Import from the correct context-aware library
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { Ionicons } from '@expo/vector-icons';

export default function CourseList() {
    const router = useRouter();
    const { courses, uniName, agencyId } = useLocalSearchParams();
    const availableCourses = courses ? JSON.parse(courses) : [];

    const getCourseColor = (index) => {
        const colors = ['#A0A4FF', '#90BE90', '#FF6B6B', '#6A679E', '#C2A700'];
        return colors[index % colors.length];
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity 
                    onPress={() => router.back()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="close" size={28} color="#769FCD" />
                </TouchableOpacity>
                
                <Text style={styles.headerTitle}>
                    Choose a course you want {"\n"} to pursue
                </Text>
                
                {/* Visual spacer to keep title centered */}
                <View style={{ width: 28 }} /> 
            </View>

            {/* COURSE LIST */}
            <FlatList
                data={availableCourses}
                keyExtractor={(item) => item._id || item.id || Math.random().toString()}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                renderItem={({ item, index }) => (
                    <TouchableOpacity 
                        style={[styles.courseCard, { backgroundColor: getCourseColor(index) }]}
                        activeOpacity={0.8}
                        onPress={() => {
                            router.push({
                                pathname: "agency/selected/courses/details", 
                                params: { 
                                    courseId: item._id || item.id,
                                    agencyId: agencyId, 
                                    courseName: item.title 
                                }
                            });
                        }}
                    >
                        <Text style={styles.courseText}>
                            {item.title.startsWith('Bachelors') ? item.title : `Bachelors of ${item.title}`}
                        </Text>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No courses available for</Text>
                        <Text style={styles.emptyUniName}>{uniName}</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#F8FAFD' 
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFD',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#769FCD',
        textAlign: 'center',
        lineHeight: 28,
    },
    listContent: { 
        padding: 20,
        paddingBottom: 40 
    },
    courseCard: {
        height: 100,
        borderRadius: 16, 
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
    },
    courseText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        paddingHorizontal: 15,
    },
    emptyContainer: {
        marginTop: 100,
        alignItems: 'center',
    },
    emptyText: { 
        fontSize: 16,
        color: '#718096' 
    },
    emptyUniName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#769FCD',
        marginTop: 4
    }
});