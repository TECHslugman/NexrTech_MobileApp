import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Pressable,
  Animated,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Feather, AntDesign } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Easing } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Config } from "../config";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const scale = (size) => (SCREEN_WIDTH / 375) * size;
const verticalScale = (size) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

const COLORS = {
  bg: '#F6F9FC',
  headerText: '#87A1C5',
  accent: '#769FCD',
  cardBg: '#FFFFFF',
  cardBorder: '#E6EEF7',
  inputBg: '#F7FBFC',
  inputBorder: '#D6E6F2',
  text: '#1E1E1E',
  textMuted: '#7B7B7B',
  link: '#9AA7BC',
  star: '#F2C265',
  starEmpty: '#DCE6F5',
  listBg: '#F7FBFF',
  success: '#57C785',
};

const CARD_HEIGHT = Math.min(verticalScale(172), SCREEN_HEIGHT * 0.22);

function ProgressBar({ value, height = 5, color = COLORS.success }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={{
      width: '100%',
      height,
      backgroundColor: '#E9F3ED',
      borderRadius: 50,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#DAE9E1'
    }}>
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color }} />
    </View>
  );
}

function StatTile({ label, value, suffix, icon }) {
  return (
    <View style={styles.statTile}>
      <View style={styles.statTileHeader}>
        {icon}
        <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}{suffix || ''}
      </Text>
    </View>
  );
}

function CityButton({ label, selected, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.cityButton, selected && styles.cityButtonSelected]}
    >
      <Text style={[styles.cityButtonText, selected && styles.cityButtonTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // FIX: Add isLoading to the destructuring
  const { signOut, userToken, activeAgency, isLoading } = useAuth();

  // --- EARLY REDIRECT: if student already has an agency, skip this page ---
  useEffect(() => {
    // FIX: Don't redirect while auth is still loading
    if (isLoading) {
      console.log('[DECISION] Auth is loading, waiting...');
      return;
    }
    
    if (activeAgency?.id) {
      console.log('[DECISION] Agency already selected — redirecting to', activeAgency.name);
      router.replace({
        pathname: `/agency/selected/${activeAgency.id}`,
        params: { name: activeAgency.name, agencyLogo: activeAgency.logo },
      });
    } else {
      console.log('[DECISION] No agency selected, showing decision page');
    }
    // FIX: Add isLoading to dependencies
  }, [activeAgency, isLoading]);

  // --- STATE ---
  const [dynamicOptions, setDynamicOptions] = useState({ countries: [], levels: [], cities: [] });
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [openCardId, setOpenCardId] = useState(null);
  const slideAnimRefs = useRef({});

  const [selectedCities, setSelectedCities] = useState([]);
  const [minRating, setMinRating] = useState(0);

  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const overlayOpacity = sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] });
  const sheetTranslateY = sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_HEIGHT, 0] });

  const fetchAgencies = async (isRefresh = false) => {
    if (!userToken) return;

    try {
      isRefresh ? setRefreshing(true) : setLoading(true);

      console.log("DEBUG: Sending Token ->", userToken);
      const response = await fetch(`${Config.API_BASE_URL}/agency`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log("DECISION PAGE ERROR RAW:", errorText);
        throw new Error(`Server Error: ${response.status}`);
      }

      const jsonResponse = await response.json();
      const rawData = jsonResponse.agencies || jsonResponse.agency;
      const agenciesArray = Array.isArray(rawData) ? rawData : [rawData];

      const formattedData = agenciesArray.map((item) => ({
        ...item,
        id: item._id,
        name: item.organizationName || item.name || "Unknown Agency",
        imageUri: item.logo || null,
        stats: {
          students: item.studentCount || 0,
          courses: item.courseCount || 0,
          universities: item.uniCount || 0,
        },
        city: item.address ? item.address.split(',')[0].trim() : 'Bhutan',
        country: item.country || 'Bhutan',
        rating: item.rating || 5.0,
        levels: item.levels || ['Undergraduate'],
      }));

      setAgencies(formattedData);

    } catch (error) {
      console.error('Fetch Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (userToken) fetchAgencies();
  }, [userToken]);

  useEffect(() => {
    if (agencies.length > 0) {
      const uniqueCities = [...new Set(agencies.map(a => a.city).filter(Boolean))];
      setDynamicOptions({ countries: [], cities: uniqueCities.sort(), levels: [] });
    }
  }, [agencies]);

  const openSheet = () => {
    setSheetOpen(true);
    Animated.spring(sheetAnim, {
      toValue: 1, damping: 25, stiffness: 200, useNativeDriver: true,
    }).start();
  };

  const closeSheet = () => {
    Animated.timing(sheetAnim, {
      toValue: 0, duration: 280, easing: Easing.in(Easing.ease), useNativeDriver: true,
    }).start(({ finished }) => finished && setSheetOpen(false));
  };

  const toggleCity = (city) => {
    setSelectedCities((prev) =>
      prev.includes(city) ? prev.filter((v) => v !== city) : [...prev, city]
    );
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return agencies.filter((a) => {
      const matchesText = !q || a.name.toLowerCase().includes(q) || (a.subtitle || '').toLowerCase().includes(q);
      const matchesCity = selectedCities.length === 0 || selectedCities.includes(a.city);
      const matchesRating = (a.rating || 0) >= (minRating || 0);
      return matchesText && matchesCity && matchesRating;
    });
  }, [agencies, query, selectedCities, minRating]);

  const handleLearnMore = (item) => {
    router.push({
      pathname: `/agency/${item.id}`,
      params: { id: item.id, name: item.name, heroUri: item.imageUri || '' },
    });
  };

  const getSlideAnim = (id) => {
    if (!slideAnimRefs.current[id]) {
      slideAnimRefs.current[id] = new Animated.Value(0);
    }
    return slideAnimRefs.current[id];
  };

  const handleCardPress = (item) => {
    const id = item.id;
    const slideAnim = getSlideAnim(id);
    if (openCardId === id) {
      Animated.timing(slideAnim, {
        toValue: 0, duration: 100, useNativeDriver: true
      }).start(() => setOpenCardId(null));
    } else {
      if (openCardId) {
        Animated.timing(getSlideAnim(openCardId), {
          toValue: 0, duration: 100, useNativeDriver: true
        }).start();
      }
      setOpenCardId(id);
      Animated.timing(slideAnim, {
        toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true
      }).start();
    }
  };

  const closeAllCards = () => {
    if (openCardId) {
      Animated.timing(getSlideAnim(openCardId), {
        toValue: 0, duration: 200, useNativeDriver: true
      }).start(() => setOpenCardId(null));
    }
  };

  // FIX: Show loading spinner while auth is loading
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={{ marginTop: moderateScale(12), color: COLORS.textMuted }}>Loading your session...</Text>
      </View>
    );
  }

  const Front = ({ item }) => {
    const source = item.imageUri ? { uri: item.imageUri } : null;
    return (
      <View style={styles.frontFill}>
        {source ? (
          <Image source={source} style={styles.fullImage} resizeMode="contain" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Feather name="image" size={moderateScale(30)} color="#CCC" />
          </View>
        )}
      </View>
    );
  };

  const Back = ({ item }) => {
    const s = item.stats || { students: 0, courses: 0, universities: 0 };
    return (
      <Pressable style={styles.backContainer} onPress={() => handleCardPress(item)}>
        <View style={styles.statsContent}>
          <View style={styles.statsGridBalanced}>
            <StatTile
              label="Students" value={s.students || 0}
              icon={<Feather name="users" size={moderateScale(14)} color={COLORS.accent} />}
            />
            <StatTile
              label="Courses" value={s.courses || 0}
              icon={<Feather name="book-open" size={moderateScale(14)} color={COLORS.accent} />}
            />
          </View>
          <View style={styles.universitiesTile}>
            <View style={styles.statTileHeader}>
              <Feather name="award" size={moderateScale(14)} color={COLORS.accent} />
              <Text style={styles.statLabel}>Universities</Text>
            </View>
            <Text style={styles.statValue}>{s.universities || 0}</Text>
          </View>
          <TouchableOpacity
            style={styles.viewProfileButton}
            onPress={() => handleLearnMore(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.viewProfileText}>View profile</Text>
            <Feather name="arrow-right" size={moderateScale(14)} color={COLORS.link} />
          </TouchableOpacity>
        </View>
      </Pressable>
    );
  };

  const renderItem = ({ item }) => {
    if (!item || !item.id) return null;
    const slideAnim = getSlideAnim(item.id);
    const isOpen = openCardId === item.id;
    const translateX = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_WIDTH, 0] });

    return (
      <View style={styles.cardContainer}>
        <Pressable style={styles.card} onPress={() => handleCardPress(item)}>
          <Front item={item} />
        </Pressable>
        <Animated.View
          style={[styles.statsOverlay, { transform: [{ translateX }], opacity: slideAnim }]}
          pointerEvents={isOpen ? 'auto' : 'none'}
        >
          <Back item={item} />
        </Animated.View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.header, { paddingTop: Math.max(insets.top + moderateScale(8), moderateScale(16)) }]}>
        <Text style={styles.headerTitle}>
          Choose an Agency before{'\n'}proceeding with your application
        </Text>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Feather name="search" size={moderateScale(18)} color="#9CA3AF" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search agencies..."
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={openSheet}>
            <Feather name="sliders" size={moderateScale(18)} color={COLORS.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading agencies...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, index) => item?.id?.toString() || index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={() => fetchAgencies(true)}
          refreshing={refreshing}
          onScrollBeginDrag={closeAllCards}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="search" size={moderateScale(48)} color={COLORS.cardBorder} />
              <Text style={styles.emptyText}>No agencies found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
            </View>
          }
          ListFooterComponent={<View style={{ height: moderateScale(8) }} />}
        />
      )}

      {sheetOpen && (
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <Pressable style={{ flex: 1 }} onPress={closeSheet} />
        </Animated.View>
      )}

      {sheetOpen && (
        <Animated.View style={[
          styles.sheet,
          {
            paddingTop: moderateScale(20),
            paddingBottom: Math.max(insets.bottom + moderateScale(12), moderateScale(20)),
            transform: [{ translateY: sheetTranslateY }]
          }
        ]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Filter Options</Text>
              <Text style={styles.sheetSubtitle}>Find the perfect agency for you</Text>
            </View>
            <TouchableOpacity onPress={closeSheet} style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={moderateScale(22)} color="#52606B" />
            </TouchableOpacity>
          </View>

          <View style={styles.sheetSearchContainer}>
            <View style={styles.searchBox}>
              <Feather name="search" size={moderateScale(18)} color="#9CA3AF" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search agencies..."
                placeholderTextColor="#9CA3AF"
                style={styles.searchInput}
                returnKeyType="search"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <Feather name="x-circle" size={moderateScale(16)} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <TouchableOpacity
            onPress={() => { setSelectedCities([]); setMinRating(0); closeAllCards(); }}
            style={styles.clearAllButton}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Feather name="rotate-ccw" size={moderateScale(14)} color="#9AA7BC" />
            <Text style={styles.clearAll}>Clear all filters</Text>
          </TouchableOpacity>

          <View style={styles.cityFilterSection}>
            <Text style={styles.filterSectionTitle}>City</Text>
            <View style={styles.cityButtonsContainer}>
              {dynamicOptions.cities.map((city, index) => (
                <CityButton
                  key={`city-${city}-${index}`}
                  label={city}
                  selected={selectedCities.includes(city)}
                  onPress={() => toggleCity(city)}
                />
              ))}
            </View>
          </View>

          <View style={styles.sheetFooter}>
            <TouchableOpacity style={styles.applyButton} onPress={closeSheet}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
              <Feather name="check" size={moderateScale(18)} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: '5%', paddingBottom: moderateScale(12) },
  headerTitle: {
    textAlign: 'center', color: COLORS.headerText, fontSize: moderateScale(18),
    lineHeight: moderateScale(26), fontWeight: '700', letterSpacing: 0.2,
    marginBottom: moderateScale(16),
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(12) },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBg,
    borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: moderateScale(21),
    paddingHorizontal: '4%', height: moderateScale(44), gap: moderateScale(10),
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: moderateScale(14) },
  filterBtn: {
    height: moderateScale(44), width: moderateScale(44), borderRadius: moderateScale(22),
    borderWidth: 1, borderColor: COLORS.inputBorder, backgroundColor: COLORS.cardBg,
    alignItems: 'center', justifyContent: 'center',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: moderateScale(12) },
  loadingText: { color: COLORS.textMuted, fontSize: moderateScale(14), fontWeight: '500' },
  emptyContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: '20%', gap: moderateScale(12),
  },
  emptyText: { color: COLORS.text, fontSize: moderateScale(16), fontWeight: '600', marginTop: moderateScale(12) },
  emptySubtext: { color: COLORS.textMuted, fontSize: moderateScale(13) },
  cardContainer: { marginBottom: moderateScale(16), position: 'relative' },
  card: {
    backgroundColor: COLORS.cardBg, borderRadius: moderateScale(14),
    borderWidth: 1, borderColor: COLORS.cardBorder, overflow: 'hidden', height: CARD_HEIGHT,
  },
  statsOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.cardBg, borderRadius: moderateScale(14),
    borderWidth: 1, borderColor: COLORS.cardBorder,
    paddingVertical: moderateScale(12), paddingHorizontal: moderateScale(12), zIndex: 10,
  },
  backContainer: { width: '100%', height: '100%', justifyContent: 'space-between' },
  statsContent: { flex: 1 },
  frontFill: { width: '100%', height: '100%' },
  fullImage: { width: '100%', height: '100%' },
  imagePlaceholder: { width: '100%', height: '100%', backgroundColor: '#EEE', justifyContent: 'center', alignItems: 'center' },
  statsGridBalanced: { flexDirection: 'row', gap: moderateScale(8), marginBottom: moderateScale(8) },
  universitiesTile: {
    width: '100%', borderWidth: 1, borderColor: COLORS.cardBorder, backgroundColor: COLORS.listBg,
    borderRadius: moderateScale(10), paddingVertical: moderateScale(8),
    paddingHorizontal: moderateScale(8), marginBottom: moderateScale(8),
  },
  statTile: {
    flex: 1, borderWidth: 1, borderColor: COLORS.cardBorder, backgroundColor: COLORS.listBg,
    borderRadius: moderateScale(10), paddingVertical: moderateScale(8), paddingHorizontal: moderateScale(8),
  },
  statTileHeader: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(6) },
  statLabel: { color: COLORS.headerText, fontWeight: '700', fontSize: moderateScale(11), flexShrink: 1 },
  statValue: { color: COLORS.text, fontWeight: '700', fontSize: moderateScale(16), marginTop: moderateScale(6) },
  viewProfileButton: {
    alignSelf: 'flex-end', marginTop: moderateScale(4),
    flexDirection: 'row', alignItems: 'center', gap: moderateScale(6),
  },
  viewProfileText: { color: COLORS.link, fontWeight: '700', fontSize: moderateScale(14) },
  listContent: { paddingHorizontal: '5%', paddingTop: moderateScale(12), paddingBottom: moderateScale(20) },
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#000' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    maxHeight: SCREEN_HEIGHT * 0.75, backgroundColor: '#FFFFFF',
    borderTopLeftRadius: moderateScale(20), borderTopRightRadius: moderateScale(20),
    paddingHorizontal: '5%',
  },
  sheetHandle: {
    width: moderateScale(40), height: moderateScale(4), backgroundColor: '#E5E7EB',
    borderRadius: moderateScale(2), alignSelf: 'center', marginBottom: moderateScale(20),
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: moderateScale(20),
  },
  closeBtn: {
    height: moderateScale(36), width: moderateScale(36), borderRadius: moderateScale(18),
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6',
  },
  sheetTitle: { color: COLORS.text, fontWeight: '700', fontSize: moderateScale(20), marginBottom: moderateScale(4) },
  sheetSubtitle: { color: COLORS.textMuted, fontSize: moderateScale(13), fontWeight: '500' },
  sheetSearchContainer: { marginBottom: moderateScale(16) },
  sheetFooter: { paddingTop: moderateScale(16), borderTopWidth: 1.5, borderTopColor: COLORS.cardBorder, marginTop: moderateScale(16) },
  applyButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.accent, borderRadius: moderateScale(12),
    paddingVertical: moderateScale(16), gap: moderateScale(8),
  },
  applyButtonText: { color: '#FFFFFF', fontSize: moderateScale(16), fontWeight: '700' },
  clearAllButton: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end',
    marginBottom: moderateScale(16), gap: moderateScale(6),
  },
  clearAll: { color: '#9AA7BC', fontWeight: '600', fontSize: moderateScale(13) },
  cityFilterSection: { marginBottom: moderateScale(16) },
  filterSectionTitle: { color: COLORS.text, fontSize: moderateScale(15), fontWeight: '700', marginBottom: moderateScale(12) },
  cityButtonsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: moderateScale(10) },
  cityButton: {
    paddingVertical: moderateScale(10), paddingHorizontal: moderateScale(16),
    borderRadius: moderateScale(20), borderWidth: 1,
    borderColor: COLORS.cardBorder, backgroundColor: COLORS.cardBg,
  },
  cityButtonSelected: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  cityButtonText: { color: COLORS.text, fontSize: moderateScale(13), fontWeight: '600' },
  cityButtonTextSelected: { color: '#FFFFFF' },
});