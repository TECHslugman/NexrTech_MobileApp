import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';

const { width } = Dimensions.get('window');

const COLORS = {
  bg: '#F6F9FC',
  primary: '#769FCD',
  accent: '#769FCD',
  heading: '#87A1C5',
  cardBg: '#FFFFFF',
  cardBorder: '#E6EEF7',
  text: '#2E2E2E',
};

// Placeholder for when partner has no logo
const DEFAULT_UNI_IMAGE = require('../../../../assets/images/agencies/default.png'); 

// Provision for API URL
const API_URL = 'https://edu-agent-backend-nine.vercel.app/api/v1/agency/profile';

export default function AgencyPartners() {
  const { id, name: paramName } = useLocalSearchParams();
  const router = useRouter();
  const { userToken } = useAuth();

  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [agencyName, setAgencyName] = useState(paramName || "Our Partners");

  useEffect(() => {
    const fetchPartners = async () => {
      if (!userToken) return;
      try {
        setLoading(true);
        // Using GET request similar to your decision/details page
        const response = await fetch(API_URL, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) throw new Error('Failed to fetch partners');

        const json = await response.json();
        
        // Mapping based on your backend structure: json.profile.partnerUniversities
        if (json.profile) {
          setPartners(json.profile.partnerUniversities || []);
          setAgencyName(json.profile.organizationName || paramName);
        }

      } catch (error) {
        console.error("Partners Fetch Error:", error);
        // Fallback to empty state or local mock data if needed
      } finally {
        setLoading(false);
      }
    };

    fetchPartners();
  }, [id, userToken]);

  const renderPartnerItem = ({ item }) => {
    // Check if API returns a logo URL, otherwise use default image
    const logoSource = item.logo ? { uri: item.logo } : DEFAULT_UNI_IMAGE;

    return (
      <View style={styles.partnerCard}>
        <View style={styles.logoContainer}>
          <Image 
            source={logoSource} 
            style={styles.uniLogo} 
            resizeMode="contain" 
          />
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.uniName} numberOfLines={2}>{item.name}</Text>
          <View style={styles.locationRow}>
            <Feather name="globe" size={12} color="#9AA7BC" />
            <Text style={styles.uniLocation}>{item.country || 'Global'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.arrowBtn}>
          <Feather name="external-link" size={16} color={COLORS.accent} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="chevron-left" size={22} color="#52606B" />
        </TouchableOpacity>
        <View style={styles.titleWrapper}>
          <Text style={styles.topTitle} numberOfLines={1}>{agencyName}</Text>
          <Text style={styles.subTitle}>Partner Institutions</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading partners...</Text>
        </View>
      ) : (
        <FlatList
          data={partners}
          keyExtractor={(item, index) => item._id || index.toString()}
          renderItem={renderPartnerItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="info" size={40} color="#DCE6F5" />
              <Text style={styles.emptyText}>No partners found for this agency.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#EDEFF2',
  },
  backBtn: {
    height: 36,
    width: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F6FF',
  },
  titleWrapper: { flex: 1, alignItems: 'center' },
  topTitle: { fontSize: 16, fontWeight: '700', color: '#2E2E2E' },
  subTitle: { fontSize: 11, color: COLORS.heading, textTransform: 'uppercase', letterSpacing: 0.5 },

  listContent: { padding: 16, paddingBottom: 40 },
  
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    // Soft shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  logoContainer: {
    width: 60,
    height: 60,
    backgroundColor: '#F8FAFD',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F4F8',
  },
  uniLogo: { width: 45, height: 45 },
  infoContainer: { flex: 1, marginLeft: 14, justifyContent: 'center' },
  uniName: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  uniLocation: { fontSize: 12, color: '#9AA7BC' },
  arrowBtn: {
    padding: 8,
    backgroundColor: '#F7FBFC',
    borderRadius: 10,
  },

  loadingText: { marginTop: 12, color: COLORS.heading, fontSize: 13 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 12, color: '#9AA7BC', fontSize: 14 },
});