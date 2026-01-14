import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

const COLORS = {
  primary: '#769FCD',
  textMain: '#2D3436',
  textLight: '#95A5A6',
  background: '#F8FAFD',
  white: '#FFFFFF',
  border: '#EEF2F7',
  online: '#4CD964',
};

export default function MessagesScreen() {
    const params = useLocalSearchParams();
    const agencyId = params.id || params.agencyId; 

    console.log('=== MESSAGES PAGE ===');
    console.log('   All params:', params);
    console.log('   Agency ID:', agencyId);
    console.log('=== END DEBUG ===');
  // Mock data for your messages
  const chats = [
    {
      id: '1',
      name: 'Admissions Office',
      lastMessage: 'Your offer letter has been processed.',
      time: '10:30 AM',
      unread: 2,
      online: true,
    },
    {
      id: '2',
      name: 'Visa Consultant',
      lastMessage: 'Please upload your bank statement.',
      time: 'Yesterday',
      unread: 0,
      online: false,
    },
    {
      id: '3',
      name: 'Support Team',
      lastMessage: 'How can we help you today?',
      time: 'Monday',
      unread: 0,
      online: true,
    },
  ];

  const renderChatItem = ({ item }) => (
    <TouchableOpacity style={styles.chatCard}>
      <View style={styles.avatarContainer}>
        {/* Placeholder for Profile Image */}
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
        </View>
        {item.online && <View style={styles.onlineBadge} />}
      </View>

      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>{item.name}</Text>
          <Text style={styles.chatTime}>{item.time}</Text>
        </View>
        
        <View style={styles.messageRow}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.searchIcon}>
          <Ionicons name="search" size={20} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: COLORS.white,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  searchIcon: {
    position: 'absolute',
    right: 20,
  },
  listContent: {
    paddingBottom: 100, // Extra space so last chat isn't behind NavBar
  },
  chatCard: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: '#E1E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  onlineBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.online,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  chatInfo: {
    flex: 1,
    marginLeft: 15,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  chatTime: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: COLORS.textLight,
    flex: 1,
    marginRight: 10,
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 85, // Aligns separator with text instead of avatar
  },
});