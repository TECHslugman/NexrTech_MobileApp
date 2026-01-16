// app/components/BottomNavBar.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname, useLocalSearchParams } from 'expo-router';

const COLORS = {
  primary: '#769FCD',
  white: '#FFFFFF',
  border: '#EEF2F7',
  textInactive: '#BFC7D1',
};

export default function BottomNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams();
  const [agencyId, setAgencyId] = useState(null);

  useEffect(() => {
    console.log('BottomNavBar - Pathname:', pathname);
    console.log('BottomNavBar - Params:', params);

    let foundAgencyId = null;

    // Check for agencyId OR id in params
    if (params.agencyId) {
      foundAgencyId = params.agencyId;
      console.log('Found agencyId in params:', foundAgencyId);
    } else if (params.id) {
      foundAgencyId = params.id;
      console.log('Found id in params (using as agencyId):', foundAgencyId);
    }

    // If not in params, try to extract from URL path
    if (!foundAgencyId) {
      const segments = pathname.split('/');
      console.log('URL Segments:', segments);

      if (segments.includes('selected')) {
        const selectedIndex = segments.indexOf('selected');

        if (selectedIndex + 1 < segments.length) {
          const potentialId = segments[selectedIndex + 1];
          const routeNames = ['profile', 'updates', 'messages', 'events', 'courses',
            'scholarships', 'universities', 'mentors', 'profile-settings'];

          if (potentialId && !routeNames.includes(potentialId)) {
            foundAgencyId = potentialId;
            console.log('Extracted agencyId from URL:', foundAgencyId);
          }
        }
      }
    }

    console.log('Final agencyId to use:', foundAgencyId);
    setAgencyId(foundAgencyId);
  }, [pathname, params]);

  // Define navigation items - ALL STATIC ROUTES
  const navItems = [
    {
      name: 'Home',
      route: 'home',
      icon: 'home',
      getScreen: () => {
        if (agencyId) {
          // Dynamic route for home
          return `/agency/selected/${agencyId}`;
        }
        console.warn('No agencyId found, cannot navigate to home');
        return null;
      }
    },
    {
      name: 'Updates',
      route: 'updates',
      icon: 'refresh-outline',
      getScreen: () => '/agency/selected/updates', // STATIC ROUTE
    },
    {
      name: 'Messages',
      route: 'messages',
      icon: 'mail-outline',
      getScreen: () => '/agency/selected/messages', // STATIC ROUTE (if you create this)
    },
    {
      name: 'Profile',
      route: 'profile',
      icon: 'person-outline',
      getScreen: () => '/agency/selected/profile', // STATIC ROUTE
    },
  ];

  // Check if current route is active
  const isActive = (route) => {
    const segments = pathname.split('/');
    const currentRoute = segments[segments.length - 1];

    console.log('isActive check:', { route, currentRoute, agencyId });

    // For home route
    if (route === 'home') {
      // Check if we're on the agency ID page
      if (agencyId && currentRoute === agencyId) {
        return true;
      }
      return false;
    }

    // For other routes, check if current route matches
    return currentRoute === route;
  };

  const handleNavigation = (screen, itemName) => {
    console.log(`Attempting to navigate to ${itemName}:`, screen);

    if (!screen) {
      console.warn(`Cannot navigate to ${itemName}: No screen defined`);
      return;
    }

    const itemsWithAgencyId = ['Updates', 'Profile', 'Messages'];

    if (itemsWithAgencyId.includes(itemName) && agencyId) {
      console.log(`Navigating to ${itemName} with agencyId:`, agencyId);
      router.push({
        pathname: screen,
        params: {
          agencyId: agencyId,
        }
      });
      return;
    }
    router.push(screen);
  };

  return (
    <View style={styles.navBar}>
      {navItems.map((item) => {
        const active = isActive(item.route);
        const screen = item.getScreen();
        const canNavigate = screen !== null;

        return (
          <TouchableOpacity
            key={item.name}
            style={styles.navItem}
            onPress={() => handleNavigation(screen, item.name)}
            disabled={!canNavigate}
          >
            {active ? (
              <View style={styles.navIconActive}>
                <Ionicons name={item.icon} size={22} color={COLORS.white} />
              </View>
            ) : (
              <Ionicons
                name={item.icon}
                size={22}
                color={!canNavigate ? '#CCCCCC' : COLORS.textInactive}
              />
            )}
            <Text
              style={[
                styles.navLabel,
                active && styles.navLabelActive,
                !canNavigate && { color: '#CCCCCC' }
              ]}
            >
              {item.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    height: 75,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: 20,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconActive: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 11,
    color: COLORS.textInactive,
    fontWeight: '500',
  },
  navLabelActive: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
  },
});