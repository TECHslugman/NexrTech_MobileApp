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
  Platform,
} from 'react-native';
import { Feather, AntDesign } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Easing } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Config } from '../config';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive scaling functions
const scaleWidth = (size) => (SCREEN_WIDTH / 375) * size;
const scaleHeight = (size) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scaleWidth(size) - size) * factor;

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

const CARD_HEIGHT = scaleHeight(172);
const CARD_ASPECT_RATIO = 1.78; // Width/Height ratio

function ProgressBar({ value, height = scaleHeight(5), color = COLORS.success }) {
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
      <View style={{ 
        width: `${pct}%`, 
        height: '100%', 
        backgroundColor: color,
        borderRadius: height / 2 
      }} />
    </View>
  );
}

function StatTile({ label, value, suffix, icon }) {
  return (
    <View style={styles.statTile}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleWidth(6) }}>
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
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        width: '100%'
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleWidth(6) }}>
          <Feather name="shield" size={scaleWidth(14)} color={COLORS.accent} />
          <Text style={styles.statLabel} numberOfLines={1}>Visa Success</Text>
        </View>
        <Text style={[styles.statValue, { fontSize: scaleWidth(15) }]} numberOfLines={1}>
          {percent}%
        </Text>
      </View>
      <View style={{ marginTop: scaleHeight(6), width: '100%' }}>
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
    <View style={styles.dropSectionContainer}>
      <TouchableOpacity 
        onPress={onToggle} 
        style={styles.filterRow} 
        activeOpacity={0.85}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleWidth(8) }}>
          <Feather name={icon} size={scaleWidth(16)} color={COLORS.accent} />
          <Text style={styles.filterRowText}>{title}</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Feather name="chevron-down" size={scaleWidth(18)} color="#6B7280" />
        </Animated.View>
      </TouchableOpacity>

      <Animated.View
        style={{
          height,
          overflow: 'hidden',
          backgroundColor: COLORS.listBg,
          borderRadius: scaleWidth(10),
          borderWidth: 1,
          borderColor: COLORS.cardBorder,
          marginBottom: scaleHeight(10),
        }}
      >
        <View 
          style={{ paddingVertical: scaleHeight(6) }} 
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
    <TouchableOpacity 
      onPress={onPress} 
      activeOpacity={0.85} 
      style={styles.optionRow}
      hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleWidth(10) }}>
        <Feather
          name={selected ? 'check-circle' : 'circle'}
          size={scaleWidth(18)}
          color={selected ? COLORS.accent : '#C6CFDA'}
        />
        <Text style={styles.optionLabel} numberOfLines={1}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();
  const { userToken } = useAuth();

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
  const overlayOpacity = sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] });
  const sheetTranslateX = sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_WIDTH, 0] });

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

      if (!response.ok) throw new Error('Could not connect to database');

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
    Animated.timing(sheetAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeSheet = () => {
    Animated.timing(sheetAnim, {
      toValue: 0,
      duration: 240,
      easing: Easing.in(Easing.cubic),
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
    const source = item.imageUri
      ? { uri: item.imageUri } : item.image;

    return (
      <View style={styles.frontFill}>
        {source ? (
          <Image
            source={source}
            style={styles.fullImage}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.fullImage, styles.imagePlaceholder]}>
            <Feather name="image" size={scaleWidth(30)} color="#CCC" />
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
              icon={<Feather name="users" size={scaleWidth(14)} color={COLORS.accent} />}
            />
            <StatTile
              label="Partner Unis"
              value={s.partners || 0}
              icon={<Feather name="award" size={scaleWidth(14)} color={COLORS.accent} />}
            />
            <StatVisaFull percent={visaPct} rate={barRate} />
          </View>

          <TouchableOpacity
            style={styles.viewProfileButton}
            onPress={() => handleLearnMore(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.viewProfileText}>View profile →</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    );
  };

  const renderItem = ({ item, index }) => {
    if (!item || !item.id) return null;
    const slideAnim = getSlideAnim(item.id);
    const isOpen = openCardId === item.id;
    const translateX = slideAnim.interpolate({ 
      inputRange: [0, 1], 
      outputRange: [SCREEN_WIDTH, 0] 
    });
    
    return (
      <View style={[
        styles.cardContainer,
        index % 2 === 0 ? styles.cardContainerLeft : styles.cardContainerRight
      ]}>
        <Pressable 
          style={styles.card} 
          onPress={() => handleCardPress(item)}
          android_ripple={{ color: 'rgba(118, 159, 205, 0.1)', borderless: false }}
        >
          <Front item={item} />
        </Pressable>
        <Animated.View 
          style={[
            styles.statsOverlay, 
            { 
              transform: [{ translateX }], 
              opacity: slideAnim,
              elevation: isOpen ? 8 : 0,
              shadowOpacity: isOpen ? 0.1 : 0,
            }
          ]} 
          pointerEvents={isOpen ? 'auto' : 'none'}
        >
          <Back item={item} />
        </Animated.View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      
      <View style={[
        styles.header, 
        { 
          paddingTop: Math.max(insets.top + scaleHeight(8), scaleHeight(16)),
          paddingBottom: scaleHeight(8),
        }
      ]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            Choose an Agency before{'\n'}proceeding with your application.
          </Text>
          
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Feather 
                name="search" 
                size={scaleWidth(18)} 
                color="#9CA3AF" 
                style={{ marginRight: scaleWidth(8) }} 
              />
              <TextInput 
                value={query} 
                onChangeText={setQuery} 
                placeholder="Search agencies..." 
                placeholderTextColor="#9CA3AF" 
                style={styles.searchInput} 
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
            </View>
            <TouchableOpacity 
              style={styles.filterBtn} 
              onPress={openSheet}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="sliders" size={scaleWidth(18)} color={COLORS.accent} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading agencies...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="search" size={scaleWidth(48)} color={COLORS.headerText} />
          <Text style={styles.emptyText}>No agencies found</Text>
          <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
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
          ListFooterComponent={<View style={{ height: scaleHeight(20) }} />}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          initialNumToRender={6}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      )}

      {sheetOpen && (
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <Pressable style={styles.overlayPressable} onPress={closeSheet} />
        </Animated.View>
      )}

      {sheetOpen && (
        <Animated.View 
          style={[
            styles.sheet, 
            { 
              paddingTop: Math.max(insets.top + scaleHeight(6), scaleHeight(12)), 
              transform: [{ translateX: sheetTranslateX }],
              maxWidth: scaleWidth(380),
            }
          ]}
        >
          <View style={styles.sheetTopRow}>
            <TouchableOpacity 
              onPress={closeSheet} 
              style={styles.backBtn} 
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="chevron-left" size={scaleWidth(22)} color="#52606B" />
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>Filters</Text>
            <View style={styles.sheetHeaderSpacer} />
          </View>
          
          <View style={styles.sheetSearchRow}>
            <View style={styles.searchBox}>
              <Feather name="search" size={scaleWidth(18)} color="#9CA3AF" style={{ marginRight: scaleWidth(8) }} />
              <TextInput 
                value={query} 
                onChangeText={setQuery} 
                placeholder="Search agencies..." 
                placeholderTextColor="#9CA3AF" 
                style={styles.searchInput} 
                returnKeyType="search"
              />
            </View>
            <TouchableOpacity 
              style={styles.sheetApply} 
              onPress={closeSheet}
              activeOpacity={0.9}
            >
              <Text style={styles.applyText}>Apply</Text>
            </TouchableOpacity>
          </View>
          
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
            <Text style={styles.clearAllText}>Clear all filters</Text>
          </TouchableOpacity>

          <View style={styles.filtersContainer}>
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
              onToggle={() => setOpenCity((s) => !s)}
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
    paddingHorizontal: scaleWidth(16), 
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  headerContent: {
    width: '100%',
  },
  headerTitle: {
    textAlign: 'center',
    color: COLORS.headerText,
    fontSize: scaleWidth(18),
    lineHeight: scaleHeight(26),
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: scaleHeight(12),
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(8),
    width: '100%',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: scaleWidth(21),
    paddingHorizontal: scaleWidth(12),
    height: scaleHeight(42),
    minHeight: 42,
  },
  searchInput: { 
    flex: 1, 
    color: COLORS.text, 
    fontSize: scaleWidth(14),
    height: '100%',
    paddingVertical: 0,
  },
  filterBtn: {
    height: scaleHeight(42),
    width: scaleHeight(42),
    minWidth: 42,
    minHeight: 42,
    borderRadius: scaleWidth(21),
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: scaleHeight(12),
  },
  loadingText: {
    color: COLORS.headerText,
    fontSize: scaleWidth(14),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: scaleHeight(12),
    paddingHorizontal: scaleWidth(20),
  },
  emptyText: {
    color: COLORS.headerText,
    fontSize: scaleWidth(18),
    fontWeight: '600',
  },
  emptySubtext: {
    color: COLORS.textMuted,
    fontSize: scaleWidth(14),
    textAlign: 'center',
  },
  listContent: { 
    paddingHorizontal: scaleWidth(8),
    paddingBottom: scaleHeight(18),
    paddingTop: scaleHeight(8),
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: scaleWidth(8),
    marginBottom: scaleHeight(8),
  },
  cardContainer: {
    width: '48%',
    position: 'relative',
    marginBottom: scaleHeight(8),
  },
  cardContainerLeft: {
    marginRight: '2%',
  },
  cardContainerRight: {
    marginLeft: '2%',
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: scaleWidth(14),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
    height: CARD_HEIGHT,
    elevation: 3,
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
    borderRadius: scaleWidth(14),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: scaleWidth(12),
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  backContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
  },
  statsContent: {
    flex: 1,
    justifyContent: 'space-between',
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
    backgroundColor: '#EEE', 
    justifyContent: 'center', 
    alignItems: 'center'
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaleWidth(8),
    justifyContent: 'space-between',
  },
  statTile: {
    width: '48%',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.listBg,
    borderRadius: scaleWidth(10),
    paddingVertical: scaleHeight(8),
    paddingHorizontal: scaleWidth(8),
    minHeight: scaleHeight(70),
  },
  statCardFull: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.cardBg,
    borderRadius: scaleWidth(10),
    paddingVertical: scaleHeight(8),
    paddingHorizontal: scaleWidth(8),
    marginTop: scaleHeight(8),
    minHeight: scaleHeight(70),
  },
  statLabel: { 
    color: COLORS.headerText, 
    fontWeight: '700', 
    fontSize: scaleWidth(11),
    flexShrink: 1,
  },
  statValue: { 
    color: COLORS.text, 
    fontWeight: '700', 
    fontSize: scaleWidth(16), 
    marginTop: scaleHeight(4) 
  },
  viewProfileButton: {
    alignSelf: 'flex-end',
    marginTop: scaleHeight(8),
    paddingVertical: scaleHeight(6),
    paddingHorizontal: scaleWidth(12),
    backgroundColor: 'rgba(118, 159, 205, 0.1)',
    borderRadius: scaleWidth(8),
  },
  viewProfileText: {
    color: COLORS.link,
    fontWeight: '700',
    fontSize: scaleWidth(12),
  },
  overlay: { 
    position: 'absolute', 
    left: 0, 
    right: 0, 
    top: 0, 
    bottom: 0, 
    backgroundColor: '#000' 
  },
  overlayPressable: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '85%',
    backgroundColor: '#F7FBFF',
    borderLeftWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: scaleWidth(14),
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sheetTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleHeight(12),
  },
  backBtn: {
    height: scaleHeight(32),
    width: scaleHeight(32),
    borderRadius: scaleWidth(16),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDF2FF',
  },
  sheetTitle: { 
    color: COLORS.headerText, 
    fontWeight: '700', 
    fontSize: scaleWidth(16) 
  },
  sheetHeaderSpacer: { 
    width: scaleWidth(32) 
  },
  sheetSearchRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: scaleWidth(10), 
    marginBottom: scaleHeight(8),
    width: '100%',
  },
  sheetApply: {
    height: scaleHeight(42),
    minHeight: 42,
    paddingHorizontal: scaleWidth(16),
    borderRadius: scaleWidth(21),
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  applyText: { 
    color: '#fff', 
    fontWeight: '700', 
    fontSize: scaleWidth(14) 
  },
  clearAllButton: {
    alignSelf: 'flex-end', 
    marginBottom: scaleHeight(8),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(6),
    backgroundColor: 'rgba(155, 167, 188, 0.1)',
    borderRadius: scaleWidth(8),
  },
  clearAllText: { 
    color: '#9AA7BC', 
    fontWeight: '700', 
    fontSize: scaleWidth(12) 
  },
  filtersContainer: {
    flex: 1,
  },
  dropSectionContainer: {
    marginBottom: scaleHeight(12),
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: scaleWidth(12),
    paddingVertical: scaleHeight(14),
    paddingHorizontal: scaleWidth(12),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  filterRowText: { 
    color: COLORS.text, 
    fontSize: scaleWidth(13), 
    fontWeight: '600' 
  },
  optionRow: { 
    paddingVertical: scaleHeight(10), 
    paddingHorizontal: scaleWidth(12) 
  },
  optionLabel: { 
    color: COLORS.text, 
    fontWeight: '600', 
    fontSize: scaleWidth(13),
    flex: 1,
  },
});