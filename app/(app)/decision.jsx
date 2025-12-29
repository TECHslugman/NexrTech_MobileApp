import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  StyleSheet,  
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const AGENCIES = [
  { id: '1', name: 'BODHI5', image: require('../../assets/images/decision_page/bodhi5.png') },
  { id: '2', name: 'Education Pro', image: require('../../assets/images/decision_page/edupro.png') },
  { id: '3', name: 'YARAB GLOBAL', image: require('../../assets/images/decision_page/yarab.png') },
  { id: '4', name: 'GLOBAL REACH', image: require('../../assets/images/decision_page/globalreach.png') },
];

export default function AgencySelection() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const router = useRouter();

  const handleSelect = (id) => {
    setSelectedId(id);
  };

  const proceedToDashboard = () => {
    // Navigates to your protected dummydash route
    router.replace("/(app)/decision"); 
  };

  const renderAgencyCard = ({ item }) => {
    const isSelected = selectedId === item.id;

    return (
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={() => handleSelect(item.id)}
        style={[styles.card, isSelected && styles.selectedCard]}
      >
        <Image source={item.image} style={styles.agencyLogo} resizeMode="contain" />
        
        {isSelected && (
          <View style={styles.overlay}>
            <TouchableOpacity 
              style={styles.selectButton}
              onPress={proceedToDashboard}
            >
              <Text style={styles.selectButtonText}>SELECT AGENCY</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaProvider style={styles.container}>
      {/* Header text from your image */}
      <View style={styles.headerSection}>
        <Text style={styles.titleText}>
          Choose an Agency before {"\n"}proceeding with your{"\n"}application.</Text> 
      </View>

      {/* Search and Filter Row */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#769FCD" />
          <TextInput
            placeholder="Search"
            placeholderTextColor="#A0AEC0"
            style={styles.input}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterText}>Filter</Text>
          <Ionicons name="options-outline" size={20} color="#769FCD" />
        </TouchableOpacity>
      </View>

      {/* Agency List */}
      <FlatList
        data={AGENCIES}
        renderItem={renderAgencyCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <TouchableOpacity style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        }
      />
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  headerSection: {
    paddingHorizontal: 50,
    paddingVertical: 30,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#769FCD',
    textAlign: 'center',
    lineHeight: 26,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 15,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 30,
    paddingHorizontal: 15,
    height: 48,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 15,
  },
  filterText: {
    color: '#A0AEC0',
    marginRight: 4,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    height: 170,
    marginBottom: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  selectedCard: {
    borderColor: '#769FCD',
    borderWidth: 2,
  },
  agencyLogo: {
    width: '75%',
    height: '65%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectButton: {
    backgroundColor: '#5D5D5D',
    paddingVertical: 14,
    paddingHorizontal: 35,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  selectButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 1,
  },
  viewAllButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 30,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  viewAllText: {
    color: '#769FCD',
    fontSize: 16,
    fontWeight: '500',
  },
});