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
const GAP = 12;
const CARD_WIDTH = (width - (GAP * 3)) / COLUMN_COUNT;

const COLORS = {
  bg: '#FFFFFF',
  primary: '#3B82F6',
  text: '#769FCD',
  textMuted: '#64748B',
  border: '#E2E8F0',
};

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
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <Image 
          source={item.logo ? { uri: item.logo } : null} 
          style={styles.logoImage} 
          resizeMode="contain" 
          defaultSource={require('../../../../assets/images/agencies/default.png')}
        />
        {item.name && (
          <Text style={styles.partnerName} numberOfLines={2}>
            {item.name}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="chevron-left" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Partner Universities</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading partners...</Text>
        </View>
      ) : partners.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="university" size={48} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No partners found</Text>
        </View>
      ) : (
        <FlatList
          data={partners}
          keyExtractor={(item, index) => item._id || index.toString()}
          renderItem={renderPartnerItem}
          numColumns={COLUMN_COUNT}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.countText}>
              {partners.length} partner{partners.length !== 1 ? 's' : ''}
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: COLORS.bg 
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  
  backBtn: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  headerTitle: { 
    flex: 1,
    fontSize: 18, 
    fontWeight: '500', 
    color: COLORS.text,
    textAlign: 'center',
  },
  
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  
  emptyTitle: {
    color: COLORS.textMuted,
    fontSize: 16,
    fontWeight: '500',
  },
  
  listContainer: { 
    paddingHorizontal: GAP, 
    paddingTop: 16,
    paddingBottom: 20,
  },
  
  columnWrapper: { 
    gap: GAP,
    marginBottom: GAP,
  },
  
  countText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  
  partnerCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    aspectRatio: 1, // Makes it square
  },
  
  cardContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  logoImage: { 
    width: '100%', 
    height: '70%', 
    marginBottom: 12,
  },
  
  partnerName: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 'auto',
  },
});