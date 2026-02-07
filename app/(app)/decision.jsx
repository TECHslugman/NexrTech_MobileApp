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

// Responsive sizing helper
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

// Responsive card height based on screen size
const CARD_HEIGHT = Math.min(verticalScale(172), SCREEN_HEIGHT * 0.22);

function ProgressBar({ value, height = 5, color = COLORS.success }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={{
      width: '100%',
      height,
      backgroundColor: '#E9F3ED',
      borderRadius: height / 2,
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
        {value}
        {suffix || ''}
      </Text>
    </View>
  );
}

function StatVisaFull({ percent, rate }) {
  return (
    <View style={styles.statCardFull}>
      <View style={styles.statCardFullHeader}>
        <View style={styles.statTileHeader}>
          <Feather name="shield" size={moderateScale(14)} color={COLORS.accent} />
          <Text style={styles.statLabel}>Visa Success</Text>
        </View>
        <Text style={[styles.statValue, { fontSize: moderateScale(15) }]}>{percent}%</Text>
      </View>
      <View style={{ marginTop: moderateScale(6) }}>
        <ProgressBar value={rate || 0} />
      </View>
    </View>
  );
}

function DropSection({ icon, title, children, open, onToggle }) {
  const anim = useRef(new Animated.Value(open ? 1 : 0)).current;
  const [contentH, setContentH] = useState(0);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [open]);

  const height = anim.interpolate({ inputRange: [0, 1], outputRange: [0, contentH] });
  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] });

  return (
    <View style={{ marginBottom: moderateScale(10) }}>
      <TouchableOpacity onPress={onToggle} style={styles.filterRow} activeOpacity={0.85}>
        <View style={styles.filterRowLeft}>
          <Feather name={icon} size={moderateScale(16)} color={COLORS.accent} />
          <Text style={styles.filterRowText}>{title}</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Feather name="chevron-down" size={moderateScale(18)} color="#6B7280" />
        </Animated.View>
      </TouchableOpacity>

      <Animated.View
        style={{
          height,
          overflow: 'hidden',
          backgroundColor: COLORS.listBg,
          borderRadius: moderateScale(10),
          borderWidth: 1,
          borderColor: COLORS.cardBorder,
        }}
      >
        <View
          style={{ paddingVertical: moderateScale(6) }}
          onLayout={(e) => setContentH(e.nativeEvent.layout.height)}
        >
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

function OptionRow({ label, selected, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.optionRow}>
      <View style={styles.optionRowContent}>
        <Feather
          name={selected ? 'check-circle' : 'circle'}
          size={moderateScale(18)}
          color={selected ? COLORS.accent : '#C6CFDA'}
        />
        <Text style={styles.optionRowText}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut, userToken } = useAuth();

  // --- STATE ---
  const [dynamicOptions, setDynamicOptions] = useState({ countries: [], levels: [], cities: [] });
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [openCardId, setOpenCardId] = useState(null);
  const slideAnimRefs = useRef({});

  // Filter States
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [selectedLevels, setSelectedLevels] = useState([]);
  const [selectedCities, setSelectedCities] = useState([]);
  const [minRating, setMinRating] = useState(0);

  // Dropdown States
  const [openCountry, setOpenCountry] = useState(true);
  const [openLevel, setOpenLevel] = useState(false);
  const [openCity, setOpenCity] = useState(false);

  // Sheet States
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const overlayOpacity = sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] });
  const sheetTranslateY = sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_HEIGHT, 0] });

  // --- DATA FETCHING ---
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
        console.log(`Fetch failed with status: ${response.status}`);
        const errorText = await response.text();
        console.log("DECISION PAGE ERROR RAW:", errorText);
        throw new Error(`Server Error: ${response.status}`);
      }

      const jsonResponse = await response.json();
      const rawData = jsonResponse.agency;
      const agenciesArray = Array.isArray(rawData) ? rawData : [rawData];

      const formattedData = agenciesArray.map((item) => ({
        ...item,
        id: item._id,
        name: item.organizationName || "Unknown Agency",
        imageUri: item.logo || null,
        stats: {
          placed: item.studentsPlaced || 0,
          visaRate: item.visaRate || 0.90,
          partners: item.partnerUniversities?.length || 0,
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
    if (userToken) {
      fetchAgencies();
    }
  }, [userToken]);

  useEffect(() => {
    if (agencies.length > 0) {
      const uniqueCountries = [...new Set(agencies.map(a => a.country).filter(Boolean))];
      const uniqueCities = [...new Set(agencies.map(a => a.city).filter(Boolean))];
      const uniqueLevels = [...new Set(agencies.flatMap(a => a.levels || []).filter(Boolean))];

      setDynamicOptions({
        countries: uniqueCountries.sort(),
        cities: uniqueCities.sort(),
        levels: uniqueLevels.sort(),
      });
    }
  }, [agencies]);

  const openSheet = () => {
    setSheetOpen(true);
    Animated.spring(sheetAnim, {
      toValue: 1,
      damping: 25,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  };

  const closeSheet = () => {
    Animated.timing(sheetAnim, {
      toValue: 0,
      duration: 280,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(({ finished }) => finished && setSheetOpen(false));
  };

  const toggleIn = (arr, setArr, value) => {
    setArr((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return agencies.filter((a) => {
      const matchesText = !q || a.name.toLowerCase().includes(q) || (a.subtitle || '').toLowerCase().includes(q);
      const matchesCountry = selectedCountries.length === 0 || selectedCountries.includes(a.country);
      const matchesLevel = selectedLevels.length === 0 || selectedLevels.some((lvl) => (a.levels || []).includes(lvl));
      const matchesCity = selectedCities.length === 0 || selectedCities.includes(a.city);
      const matchesRating = (a.rating || 0) >= (minRating || 0);
      return matchesText && matchesCountry && matchesLevel && matchesCity && matchesRating;
    });
  }, [agencies, query, selectedCountries, selectedLevels, selectedCities, minRating]);

  const handleLearnMore = (item) => {
    router.push({
      pathname: `/agency/${item.id}`,
      params: {
        id: item.id,
        name: item.name,
        heroUri: item.imageUri || ''
      },
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
        toValue: 0,
        duration: 100,
        useNativeDriver: true
      }).start(() => setOpenCardId(null));
    } else {
      if (openCardId) {
        Animated.timing(getSlideAnim(openCardId), {
          toValue: 0,
          duration: 100,
          useNativeDriver: true
        }).start();
      }
      setOpenCardId(id);
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }).start();
    }
  };

  const closeAllCards = () => {
    if (openCardId) {
      Animated.timing(getSlideAnim(openCardId), {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }).start(() => setOpenCardId(null));
    }
  };

  const Front = ({ item }) => {
    const source = item.imageUri ? { uri: item.imageUri } : item.image;

    return (
      <View style={styles.frontFill}>
        {source ? (
          <Image
            source={source}
            style={styles.fullImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Feather name="image" size={moderateScale(30)} color="#CCC" />
          </View>
        )}
      </View>
    );
  };

  const Back = ({ item }) => {
    const s = item.stats || { placed: 0, visaRate: 0, partners: 0 };
    const visaPct = s.visaRate <= 1
      ? Math.round(s.visaRate * 100)
      : Math.round(s.visaRate);
    const barRate = s.visaRate > 1 ? s.visaRate / 100 : s.visaRate;

    return (
      <Pressable style={styles.backContainer} onPress={() => handleCardPress(item)}>
        <View style={styles.statsContent}>
          <View style={styles.statsGrid}>
            <StatTile
              label="Students Placed"
              value={s.placed || 0}
              icon={<Feather name="users" size={moderateScale(14)} color={COLORS.accent} />}
            />

            <StatTile
              label="Partner Unis"
              value={s.partners || 0}
              icon={<Feather name="award" size={moderateScale(14)} color={COLORS.accent} />}
            />

            <StatVisaFull percent={visaPct} rate={barRate} />
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
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingTop: moderateScale(16),
              paddingBottom: Math.max(insets.bottom + moderateScale(8), moderateScale(16)),
              transform: [{ translateY: sheetTranslateY }]
            }
          ]}
        >
          {/* Handle bar */}
          <View style={styles.sheetHandle} />
          
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Filter Options</Text>
              <Text style={styles.sheetSubtitle}>Find the perfect agency for you</Text>
            </View>
            <TouchableOpacity
              onPress={closeSheet}
              style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={moderateScale(22)} color="#52606B" />
            </TouchableOpacity>
          </View>

          {/* Search Box */}
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

          {/* Clear All Button */}
          <TouchableOpacity
            onPress={() => {
              setSelectedCountries([]);
              setSelectedLevels([]);
              setSelectedCities([]);
              setMinRating(0);
              closeAllCards();
            }}
            style={styles.clearAllButton}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Feather name="rotate-ccw" size={moderateScale(14)} color="#9AA7BC" />
            <Text style={styles.clearAll}>Clear all filters</Text>
          </TouchableOpacity>

          {/* Scrollable Filter Content */}
          <View style={styles.sheetScrollContent}>
            <DropSection
              icon="globe"
              title="Country"
              open={openCountry}
              onToggle={() => setOpenCountry(!openCountry)}
            >
              {dynamicOptions.countries.map((c, index) => (
                <OptionRow
                  key={`country-${c}-${index}`}
                  label={c}
                  selected={selectedCountries.includes(c)}
                  onPress={() => toggleIn(selectedCountries, setSelectedCountries, c)}
                />
              ))}
            </DropSection>

            <DropSection
              icon="book-open"
              title="Level"
              open={openLevel}
              onToggle={() => setOpenLevel(!openLevel)}
            >
              {dynamicOptions.levels.map((lv) => (
                <OptionRow
                  key={lv}
                  label={lv}
                  selected={selectedLevels.includes(lv)}
                  onPress={() => toggleIn(selectedLevels, setSelectedLevels, lv)}
                />
              ))}
            </DropSection>

            <DropSection
              icon="map-pin"
              title="City"
              open={openCity}
              onToggle={() => setOpenCity(!openCity)}
            >
              {dynamicOptions.cities.map((ct) => (
                <OptionRow
                  key={ct}
                  label={ct}
                  selected={selectedCities.includes(ct)}
                  onPress={() => toggleIn(selectedCities, setSelectedCities, ct)}
                />
              ))}
            </DropSection>
          </View>

          {/* Apply Button */}
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
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg
  },
  header: {
    paddingHorizontal: '4%',
    paddingBottom: moderateScale(8)
  },
  headerTitle: {
    textAlign: 'center',
    color: COLORS.headerText,
    fontSize: moderateScale(18),
    lineHeight: moderateScale(26),
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: moderateScale(12),
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: moderateScale(21),
    paddingHorizontal: '3%',
    height: moderateScale(42),
    gap: moderateScale(8),
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: moderateScale(14),
  },
  filterBtn: {
    height: moderateScale(42),
    width: moderateScale(42),
    borderRadius: moderateScale(21),
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: moderateScale(12),
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: moderateScale(14),
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: '20%',
    gap: moderateScale(8),
  },
  emptyText: {
    color: COLORS.text,
    fontSize: moderateScale(16),
    fontWeight: '600',
    marginTop: moderateScale(12),
  },
  emptySubtext: {
    color: COLORS.textMuted,
    fontSize: moderateScale(13),
  },
  cardContainer: {
    marginBottom: moderateScale(14),
    position: 'relative',
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: moderateScale(14),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
    height: CARD_HEIGHT,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  statsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.cardBg,
    borderRadius: moderateScale(14),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: '3%',
    zIndex: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  backContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
  },
  statsContent: {
    flex: 1,
  },
  frontFill: {
    width: '100%',
    height: '100%'
  },
  fullImage: {
    width: '100%',
    height: '100%'
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#EEE',
    justifyContent: 'center',
    alignItems: 'center'
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(8),
  },
  statTile: {
    width: '48%',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.listBg,
    borderRadius: moderateScale(10),
    paddingVertical: '4%',
    paddingHorizontal: '3%',
  },
  statTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6),
  },
  statCardFull: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.cardBg,
    borderRadius: moderateScale(10),
    paddingVertical: '4%',
    paddingHorizontal: '3%',
  },
  statCardFullHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLabel: {
    color: COLORS.headerText,
    fontWeight: '700',
    fontSize: moderateScale(11),
    flexShrink: 1,
  },
  statValue: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: moderateScale(16),
    marginTop: moderateScale(4),
  },
  viewProfileButton: {
    alignSelf: 'flex-end',
    marginTop: moderateScale(8),
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
  },
  viewProfileText: {
    color: COLORS.link,
    fontWeight: '700',
    fontSize: moderateScale(14),
  },
  listContent: {
    paddingHorizontal: '4%',
    paddingTop: moderateScale(12),
    paddingBottom: moderateScale(18),
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#000'
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: SCREEN_HEIGHT * 0.85,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: moderateScale(24),
    borderTopRightRadius: moderateScale(24),
    paddingHorizontal: '5%',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  sheetHandle: {
    width: moderateScale(40),
    height: moderateScale(4),
    backgroundColor: '#E5E7EB',
    borderRadius: moderateScale(2),
    alignSelf: 'center',
    marginBottom: moderateScale(16),
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: moderateScale(16),
  },
  closeBtn: {
    height: moderateScale(36),
    width: moderateScale(36),
    borderRadius: moderateScale(18),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  sheetTitle: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: moderateScale(20),
    marginBottom: moderateScale(2),
  },
  sheetSubtitle: {
    color: COLORS.textMuted,
    fontSize: moderateScale(13),
    fontWeight: '500',
  },
  sheetSearchContainer: {
    marginBottom: moderateScale(12),
  },
  sheetScrollContent: {
    flex: 1,
    marginBottom: moderateScale(12),
  },
  sheetFooter: {
    paddingTop: moderateScale(12),
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: moderateScale(12),
    paddingVertical: moderateScale(16),
    gap: moderateScale(8),
    elevation: 3,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(16),
    fontWeight: '700',
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginBottom: moderateScale(12),
    gap: moderateScale(6),
  },
  clearAll: {
    color: '#9AA7BC',
    fontWeight: '600',
    fontSize: moderateScale(13),
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: moderateScale(12),
    paddingVertical: '3.5%',
    paddingHorizontal: '3%',
  },
  filterRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
  },
  filterRowText: {
    color: COLORS.text,
    fontSize: moderateScale(13),
    fontWeight: '600',
  },
  optionRow: {
    paddingVertical: '2.5%',
    paddingHorizontal: '3%',
  },
  optionRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(10),
  },
  optionRowText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: moderateScale(13),
    flexShrink: 1,
  },
});