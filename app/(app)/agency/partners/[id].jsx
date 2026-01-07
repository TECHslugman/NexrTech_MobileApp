import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Linking,
  Dimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const GAP = 16;
const CARD_SIZE = (width - (GAP * 4)) / COLUMN_COUNT;

const COLORS = {
  bg: '#F8FAFD',      // Very light blue-gray background
  primary: '#769FCD',
  cardBg: '#FFFFFF',  // Keep card white but make the shadow/border pop
  cardBorder: '#EEF2F7',
};

const DEFAULT_UNI_IMAGE = require('../../../../assets/images/agencies/default.png'); 

export default function AgencyPartners() {
  const { id, name, partnersData } = useLocalSearchParams();
  const router = useRouter();
  const { userToken } = useAuth();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (partnersData) {
      setPartners(JSON.parse(partnersData));
      setLoading(false);
    }
    // Fallback fetch logic remains the same...
  }, [partnersData]);

  const handlePressCard = (url) => {
    if (url) Linking.openURL(url).catch(() => console.log("URL Error"));
  };

  const renderPartnerItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.partnerCard} 
      onPress={() => handlePressCard(item.websiteUrl)}
      activeOpacity={0.8}
    >
      <Image 
        source={item.logo ? { uri: item.logo } : DEFAULT_UNI_IMAGE} 
        style={styles.logoImage} 
        resizeMode="contain" 
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color="#52606B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Our Partners</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} />
      ) : (
        <FlatList
          data={partners}
          keyExtractor={(item, index) => item._id || index.toString()}
          renderItem={renderPartnerItem}
          numColumns={COLUMN_COUNT}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 60,
    backgroundColor: COLORS.bg,
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.primary },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  listContainer: { paddingHorizontal: GAP, paddingBottom: 30 },
  columnWrapper: { justifyContent: 'space-between' },
  partnerCard: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    backgroundColor: '#FFFFFF',
    borderRadius: 10, 
    marginBottom: GAP,
    padding: 10, 
    justifyContent: 'center',
    alignItems: 'center',
    
    // Minimalist border and shadow
    borderWidth: 1,
    borderColor: '#F0F4F8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  logoImage: { width: '100%', height: '100%' },
});