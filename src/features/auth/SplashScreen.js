// Splash / welcome screen - matches the approved SchulLoop landing design
import { Image, StatusBar, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { topPad } from '../../shared/ui/kit';

const LOGO = require('../../../assets/images/schulloop-logo-mark.png');
const GLOBE = require('../../../assets/images/schulloop-globe.png');
const GLOBE_RATIO = 846 / 672;

export const SplashScreen = ({ navigation }) => {
  const { width, height } = useWindowDimensions();
  const contentWidth = Math.min(width, 480);
  const globeWidth = Math.min(contentWidth * 0.96, height * 0.42 * GLOBE_RATIO);
  const logoSize = height < 700 ? 76 : 96;

  return (
    <LinearGradient colors={['#1B6FE6', '#0E5BD0', '#0A45AC']} locations={[0, 0.5, 1]} style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.column, { width: contentWidth }]}>
        <View style={styles.top}>
          <Image source={LOGO} style={{ width: logoSize, height: logoSize }} resizeMode="contain" />
          <Text style={styles.brand}>SchulLoop</Text>
          <Text style={styles.tagline}>Connect   •   Learn   •   Grow</Text>
          <Text style={styles.caption}>Your Global Education &{'\n'}Career Platform</Text>
        </View>

        <View style={styles.globeArea}>
          <View style={[styles.glow, { width: globeWidth * 0.8, height: globeWidth * 0.8, borderRadius: globeWidth * 0.4 }]} />
          <Image source={GLOBE} style={{ width: globeWidth, height: globeWidth / GLOBE_RATIO }} resizeMode="contain" />
        </View>

        <View style={styles.bottom}>
          <TouchableOpacity style={styles.startBtn} activeOpacity={0.85} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.startText}>Get Started</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 18 }}>
            <Text style={styles.already}>Already have an account? <Text style={styles.alreadyBold}>Log In</Text></Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },
  column: { flex: 1, paddingTop: topPad + 18 },
  top: { alignItems: 'center', paddingHorizontal: 24 },
  brand: { color: '#fff', fontSize: 42, fontWeight: '800', marginTop: 14, letterSpacing: 0.4 },
  tagline: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 12 },
  caption: { color: '#E3EEFF', fontSize: 15, fontWeight: '500', textAlign: 'center', marginTop: 20, lineHeight: 22 },
  globeArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', backgroundColor: 'rgba(80,160,255,0.28)', shadowColor: '#6CB4FF', shadowOpacity: 0.9, shadowRadius: 60, shadowOffset: { width: 0, height: 0 } },
  bottom: { paddingHorizontal: 26, paddingBottom: 38, alignItems: 'center' },
  startBtn: { backgroundColor: '#fff', borderRadius: 30, height: 56, width: '100%', alignItems: 'center', justifyContent: 'center', shadowColor: '#06245F', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  startText: { color: '#1565D8', fontSize: 17, fontWeight: '800' },
  already: { color: '#fff', fontSize: 14 },
  alreadyBold: { fontWeight: '800' },
});
