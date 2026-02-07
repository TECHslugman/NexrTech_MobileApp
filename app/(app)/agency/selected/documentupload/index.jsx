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
            
            if (res.ok && json.profile) {
                const visaData = json.profile.visaProfile;
                console.log("📥 Profile Data Found. VisaProfile:", visaData);

                const isSurveyDone = visaData && typeof visaData.hasSpouse !== 'undefined';

                if (isSurveyDone) {
                    setShowSurvey(false);
                    // Stage priority: Backend status > Default admission
                    const serverStage = json.profile.currentProcessStage || 'admission';
                    console.log(`📍 Current Backend Stage: [${serverStage.toUpperCase()}]`);
                    setCurrentStage(serverStage);
                } else {
                    setShowSurvey(true);
                }
            } else {
                setShowSurvey(true);
            }
        } catch (e) {
            console.error("❌ Controller Sync Error:", e.message);
        } finally {
            setLoading(false);
            console.log("--- 🏁 Controller: Sync Finished ---");
        }
    }, [userToken]);

    useEffect(() => { checkStatus(); }, [checkStatus]);

    // This handles moving the student forward locally
    const handleStageTransition = (next) => {
        console.log(` Transitioning UI to stage: ${next}`);
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