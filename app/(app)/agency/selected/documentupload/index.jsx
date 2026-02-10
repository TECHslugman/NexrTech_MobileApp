import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useAuth } from '../../../../context/AuthContext';
import { Config } from '../../../../config';

import SurveySection from './SurveySection';
import DocumentUpload from './uploads';

export default function DocumentUploadController() {
    const { userToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [showSurvey, setShowSurvey] = useState(false);
    const [currentStage, setCurrentStage] = useState('admission');

    const checkStatus = useCallback(async () => {
        console.log("--- 🔄 Controller: Syncing with Student Profile ---");
        try {
            setLoading(true);
            const res = await fetch(`${Config.API_BASE_URL}/students/profile`, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });

            const json = await res.json();
            console.log("📥 Full Profile Response:", JSON.stringify(json, null, 2));
            
            if (res.ok && json.profile) {
                const profile = json.profile;
                const visaData = profile.visaProfile;
                
                console.log("🔍 VisaProfile Check:", {
                    exists: !!visaData,
                    hasSpouse: visaData?.hasSpouse,
                    hasChildren: visaData?.hasChildren,
                    objectKeys: visaData ? Object.keys(visaData) : []
                });

                // Survey completion logic:
                // - Survey is INCOMPLETE if visaProfile doesn't exist
                // - Survey is INCOMPLETE if both hasSpouse and hasChildren are false (default state)
                // - Survey is COMPLETE if at least one is true OR there are additional fields
                
                const hasVisaProfile = visaData && typeof visaData === 'object';
                
                // Check if both are explicitly false (meaning not filled/default)
                const bothAreFalse = visaData?.hasSpouse === false && visaData?.hasChildren === false;
                
                // Check if there are more fields than just these two booleans
                const hasAdditionalFields = visaData && Object.keys(visaData).length > 2;
                
                // Survey is complete if:
                // 1. At least one field is true (user has spouse or children), OR
                // 2. Profile has additional fields beyond the two booleans
                const isSurveyComplete = hasVisaProfile && 
                    (!bothAreFalse || hasAdditionalFields);

                console.log("📊 Survey Status:", {
                    hasVisaProfile,
                    bothAreFalse,
                    hasAdditionalFields,
                    isSurveyComplete,
                    decision: isSurveyComplete ? "SHOW DOCUMENTS" : "SHOW SURVEY"
                });

                if (isSurveyComplete) {
                    console.log("✅ Survey completed - Proceeding to document stages");
                    setShowSurvey(false);
                    
                    const serverStage = profile.currentProcessStage || 'admission';
                    console.log(`📍 Current Backend Stage: [${serverStage.toUpperCase()}]`);
                    setCurrentStage(serverStage);
                } else {
                    console.log("📝 Survey incomplete - Showing survey page");
                    setShowSurvey(true);
                }
            } else {
                console.log("⚠️ No profile found - Showing survey");
                setShowSurvey(true);
            }
        } catch (e) {
            console.error("❌ Controller Sync Error:", e.message);
            setShowSurvey(true);
        } finally {
            setLoading(false);
            console.log("--- 🏁 Controller: Sync Finished ---");
        }
    }, [userToken]);

    useEffect(() => { checkStatus(); }, [checkStatus]);

    const handleStageTransition = (next) => {
        console.log(`🔄 Transitioning UI to stage: ${next}`);
        setCurrentStage(next);
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#769FCD" />
                <Text style={styles.loadingText}>Syncing application state...</Text>
            </View>
        );
    }

    if (showSurvey) {
        return <SurveySection onComplete={checkStatus} />;
    }

    return (
        <DocumentUpload 
            stage={currentStage} 
            onStageChange={handleStageTransition} 
        />
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FBFF' },
    loadingText: { marginTop: 12, color: '#769FCD', fontWeight: '600' }
});