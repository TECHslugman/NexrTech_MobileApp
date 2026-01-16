// app/agency/selected/_layout.jsx
import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import BottomNavBar from '../../../components/BottomNavBar';
import { usePathname } from 'expo-router';

export default function AgencyLayout() {
  const pathname = usePathname();
  
  // Debug: Log the full path
  console.log('=== LAYOUT DEBUG ===');
  console.log('Full pathname:', pathname);
  console.log('Path segments:', pathname.split('/'));
  
  // Define which routes should NOT show BottomNavBar
  const hideNavBarRoutes = [
    'details',
    'courses/details',
    'courses/unicourse',
    'events/details', 
    'scholarships/details',
    'universities/details',
    'mentors/details',
    'documentupload/uploads',
    'chat'
  ];
  
  // Check if current route should hide nav bar
  const shouldShowNavBar = () => {
    const segments = pathname.split('/');
    const currentRoute = segments[segments.length - 1];
    const secondLastRoute = segments[segments.length - 2];
    
    console.log('Current route:', currentRoute);
    console.log('Second last route:', secondLastRoute);
    
    // Hide for detail pages
    if (currentRoute === 'details' || hideNavBarRoutes.includes(currentRoute)) {
      console.log('Hiding nav bar - matches hide list');
      return false;
    }
    
    if (secondLastRoute && hideNavBarRoutes.includes(`${secondLastRoute}/${currentRoute}`)) {
      console.log('Hiding nav bar - matches combined route');
      return false;
    }
    
    console.log('Showing nav bar');
    return true;
  };
  
  const showNavBar = shouldShowNavBar();
  console.log('Show NavBar:', showNavBar);
  console.log('=== END DEBUG ===');

  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
      {showNavBar && <BottomNavBar />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});