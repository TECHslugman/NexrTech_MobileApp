import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
    ScrollView
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';
import { Config } from '../../../../config';

const COLORS = {
    bg: '#F8FBFF',
    primary: '#769FCD',
    white: '#FFFFFF',
    border: '#E0EBFF',
    textDark: '#2D3748',
    textLight: '#64748B',
    success: '#4ADE80'
};

export default function SurveySection({ onComplete }) {
    const insets = useSafeAreaInsets();
    const { userToken } = useAuth();
    const [loading, setLoading] = useState(false);
    
    // Survey state
    const [hasSpouse, setHasSpouse] = useState(null);
    const [hasChildren, setHasChildren] = useState(null);

    const handleSubmit = async () => {
        // Validation
        if (hasSpouse === null || hasChildren === null) {
            Toast.show({
                type: 'error',
                text1: 'Incomplete Survey',
                text2: 'Please answer all questions'
            });
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${Config.API_BASE_URL}/students/profile`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    visaProfile: {
                        hasSpouse,
                        hasChildren
                    }
                })
            });

            const json = await response.json();
            console.log("📤 Survey Submission Response:", json);

            if (response.ok) {
                Toast.show({
                    type: 'success',
                    text1: 'Survey Completed',
                    text2: 'Proceeding to document upload'
                });
                
                // Call onComplete to refresh and move to next stage
                setTimeout(() => {
                    onComplete();
                }, 1000);
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Submission Failed',
                    text2: json.message || 'Please try again'
                });
            }
        } catch (error) {
            console.error("❌ Survey Submission Error:", error);
            Toast.show({
                type: 'error',
                text1: 'Network Error',
                text2: 'Please check your connection'
            });
        } finally {
            setLoading(false);
        }
    };

    const QuestionCard = ({ question, value, onSelect, icon }) => (
        <View style={styles.questionCard}>
            <View style={styles.questionHeader}>
                <MaterialCommunityIcons name={icon} size={32} color={COLORS.primary} />
                <Text style={styles.questionText}>{question}</Text>
            </View>

            <View style={styles.optionsContainer}>
                <TouchableOpacity
                    style={[
                        styles.optionButton,
                        value === true && styles.optionButtonSelected
                    ]}
                    onPress={() => onSelect(true)}
                    activeOpacity={0.7}
                >
                    <MaterialCommunityIcons
                        name={value === true ? "check-circle" : "circle-outline"}
                        size={24}
                        color={value === true ? COLORS.success : COLORS.textLight}
                    />
                    <Text style={[
                        styles.optionText,
                        value === true && styles.optionTextSelected
                    ]}>
                        Yes
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.optionButton,
                        value === false && styles.optionButtonSelected
                    ]}
                    onPress={() => onSelect(false)}
                    activeOpacity={0.7}
                >
                    <MaterialCommunityIcons
                        name={value === false ? "check-circle" : "circle-outline"}
                        size={24}
                        color={value === false ? COLORS.success : COLORS.textLight}
                    />
                    <Text style={[
                        styles.optionText,
                        value === false && styles.optionTextSelected
                    ]}>
                        No
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const canSubmit = hasSpouse !== null && hasChildren !== null;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <MaterialCommunityIcons name="clipboard-text" size={40} color={COLORS.primary} />
                <Text style={styles.headerTitle}>Visa Profile Survey</Text>
                <Text style={styles.headerSubtitle}>
                    Please answer these questions to help us process your application
                </Text>
            </View>

            <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <QuestionCard
                    question="Do you have a spouse?"
                    value={hasSpouse}
                    onSelect={setHasSpouse}
                    icon="account-heart"
                />

                <QuestionCard
                    question="Do you have children?"
                    value={hasChildren}
                    onSelect={setHasChildren}
                    icon="account-child"
                />

                {/* Progress Indicator */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressDots}>
                        <View style={[
                            styles.progressDot,
                            hasSpouse !== null && styles.progressDotComplete
                        ]} />
                        <View style={[
                            styles.progressDot,
                            hasChildren !== null && styles.progressDotComplete
                        ]} />
                    </View>
                    <Text style={styles.progressText}>
                        {hasSpouse !== null && hasChildren !== null 
                            ? 'All questions answered ✓' 
                            : `${[hasSpouse, hasChildren].filter(v => v !== null).length} of 2 answered`}
                    </Text>
                </View>
            </ScrollView>

            {/* Submit Button */}
            <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity
                    style={[
                        styles.submitButton,
                        !canSubmit && styles.submitButtonDisabled
                    ]}
                    onPress={handleSubmit}
                    disabled={!canSubmit || loading}
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                        <>
                            <Text style={styles.submitButtonText}>
                                Complete Survey
                            </Text>
                            <MaterialCommunityIcons
                                name="arrow-right"
                                size={20}
                                color={COLORS.white}
                            />
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    header: {
        backgroundColor: COLORS.white,
        padding: 24,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.textDark,
        marginTop: 12,
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 14,
        color: COLORS.textLight,
        textAlign: 'center',
        lineHeight: 20,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 20,
    },
    questionCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    questionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    questionText: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textDark,
        marginLeft: 12,
        flex: 1,
    },
    optionsContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    optionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: COLORS.border,
        backgroundColor: COLORS.white,
    },
    optionButtonSelected: {
        borderColor: COLORS.success,
        backgroundColor: '#F0FDF4',
    },
    optionText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textLight,
        marginLeft: 8,
    },
    optionTextSelected: {
        color: COLORS.textDark,
    },
    progressContainer: {
        alignItems: 'center',
        marginTop: 20,
        padding: 20,
    },
    progressDots: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    progressDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.border,
    },
    progressDotComplete: {
        backgroundColor: COLORS.success,
    },
    progressText: {
        fontSize: 14,
        color: COLORS.textLight,
        fontWeight: '500',
    },
    bottomContainer: {
        padding: 20,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    submitButton: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.white,
    },
});