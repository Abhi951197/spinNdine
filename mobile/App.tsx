import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
  Platform,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import * as Location from 'expo-location';

// Change this to your backend URL
// For testing: use your machine's IP address
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:5000';
const shadow = (ios: Record<string, any>, elevation: number, boxShadow: string) =>
  (Platform.select({
    ios,
    android: { elevation },
    web: { boxShadow },
    default: {},
  }) as Record<string, any>);

interface Restaurant {
  name: string;
  rating: number | null;
  address: string;
  photoUrl: string | null;
  website: string | null;
  mapsUrl: string | null;
  fsqId: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
}

export default function App() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [cityLabel, setCityLabel] = useState<string | null>(null);

  const wheelRotation = useRef(new Animated.Value(0)).current;
  const absoluteRotation = useRef(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const { width, height } = Dimensions.get('window');
  const wheelSize = Math.min(Math.min(width, height) * 0.62, 320);

  useEffect(() => {
    getLocation();
    const useNative = Platform.OS !== 'web';
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: useNative,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: useNative,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (location) {
      fetchRestaurants(location.latitude, location.longitude);
    }
  }, [location]);

  const formatPlace = (primary?: string | null, secondary?: string | null) => {
    const parts = [primary, secondary].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Current area';
  };

  const setPlaceFromCoords = async (lat: number, lng: number) => {
    try {
      if (Platform.OS !== 'web') {
        const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        const primary =
          place?.name ||
          place?.suburb ||
          place?.subregion ||
          place?.district ||
          place?.city ||
          place?.town ||
          place?.village ||
          place?.region ||
          null;
        const secondary = place?.city || place?.region || place?.country || null;
        setCityLabel(formatPlace(primary, secondary));
      }
    } catch {
      // ignore reverse geocode failures
    }
  };

  const setPlaceFromWeb = async (lat: number, lng: number) => {
    try {
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
      const resp = await fetch(url);
      const j = await resp.json();
      const primary =
        j?.locality ||
        j?.city ||
        j?.principalSubdivision ||
        j?.localityInfo?.administrative?.[0]?.name ||
        null;
      const secondary = j?.city || j?.principalSubdivision || j?.countryName || null;
      setCityLabel(formatPlace(primary, secondary));
    } catch {
      // ignore
    }
  };

  const getLocation = async () => {
    try {
      setLocationLoading(true);
      setError(null);
      if (Platform.OS !== 'web') {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Permission to access location was denied');
          setLocationLoading(false);
          setLocation({ latitude: 40.7128, longitude: -74.006 });
          return;
        }

        const locationData = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const { latitude, longitude } = locationData.coords;
        setLocation({ latitude, longitude });
        setPlaceFromCoords(latitude, longitude);
        setLocationLoading(false);
        return;
      }

      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords as any;
            setLocation({ latitude, longitude });
            setLocationLoading(false);
            try {
              await setPlaceFromWeb(latitude, longitude);
            } catch {
              setCityLabel('Current area');
            }
          },
          async (err) => {
            console.warn('Browser geolocation failed, falling back to IP lookup', err);
            try {
              const resp = await fetch('https://ipapi.co/json/');
              const j = await resp.json();
              setLocation({ latitude: j.latitude, longitude: j.longitude });
              if (j.latitude && j.longitude) {
                await setPlaceFromWeb(j.latitude, j.longitude);
              } else {
                setCityLabel(formatPlace(j.city, j.region));
              }
            } catch (e) {
              setLocation({ latitude: 40.7128, longitude: -74.006 });
              setCityLabel('New York, NY');
            }
            setLocationLoading(false);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
        return;
      }
    } catch (err) {
      console.error('Error getting location:', err);
      setError('Failed to get location');
      setLocationLoading(false);
      setLocation({ latitude: 40.7128, longitude: -74.006 });
      setCityLabel('New York, NY');
    }
  };

  const fetchRestaurants = async (lat: number, lng: number) => {
    try {
      setLoadingList(true);
      setError(null);

      const res = await fetch(`${BACKEND_URL}/api/restaurants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ latitude: lat, longitude: lng, radius: 5000, limit: 10 }),
      });

      const data = await res.json();

      if (data.success) {
        setRestaurants(data.restaurants || []);
        setSelectedIndex(null);
        setSelectedRestaurant(null);
        absoluteRotation.current = 0;
        wheelRotation.setValue(0);
      } else {
        setError(data.error || 'Failed to fetch restaurants');
      }
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || "Failed to connect to backend. Make sure it's running.");
    } finally {
      setLoadingList(false);
    }
  };

  const openLink = (url: string | null) => {
    if (!url) {
      Alert.alert('Not Available', 'This link is not available');
      return;
    }
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open the link');
    });
  };

  const shortName = (name: string, max = 16) => (name.length > max ? name.slice(0, max - 1) + '...' : name);
  const getLabelMaxWidth = (n: number, radius: number) => {
    const arc = (2 * Math.PI * radius) / n;
    return Math.max(44, Math.min(90, arc - 10));
  };

  const getLabelFontSize = (name: string, n: number) => {
    const base = n >= 12 ? 9 : n >= 10 ? 10 : n >= 8 ? 11 : 12;
    if (name.length > 18) return Math.max(8, base - 2);
    if (name.length > 14) return Math.max(9, base - 1);
    return base;
  };

  const spinWheel = () => {
    if (spinning || restaurants.length === 0) return;
    setSpinning(true);

    const n = restaurants.length;
    const segment = 360 / n;
    const fullTurns = 6;
    const randomOffset = Math.random() * 360;
    const totalRotation = fullTurns * 360 + randomOffset;

    const start = absoluteRotation.current;
    const end = start + totalRotation;

    Animated.timing(wheelRotation, {
      toValue: end,
      duration: 4200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      absoluteRotation.current = end;
      const rotationMod = ((end % 360) + 360) % 360;
      const adjusted = (360 - rotationMod) % 360;
      const landedIndex = Math.floor(adjusted / segment) % n;
      setSelectedIndex(landedIndex);
      setSelectedRestaurant(restaurants[landedIndex]);
      setSpinning(false);
    });
  };

  const rotationInterpolate = wheelRotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const colors = [
    '#FF6B6B', '#4ECDC4', '#FFD93D', '#6BCF7F', '#A78BFA',
    '#FB7185', '#60A5FA', '#F97316', '#10B981', '#EC4899',
  ];

  return (
    <View style={styles.container}>
      <View style={styles.gradientBg}>
        <View style={styles.bgBlob1} />
        <View style={styles.bgBlob2} />
        <View style={styles.bgBlob3} />
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.brandContainer}>
                <View style={styles.logoCircle}>
                  <Text style={styles.logoEmoji}>🎡</Text>
                </View>
                <Text style={styles.brandText}>SpinDine</Text>
              </View>
            </View>

            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>Where should{'\n'}we eat tonight?</Text>
              <Text style={styles.heroSubtitle}>
                Spin the wheel and let fate decide your next culinary adventure
              </Text>
            </View>

            {/* Location Card */}
            <View style={styles.locationCard}>
              <View style={styles.locationCardHeader}>
                <View style={styles.locationIconContainer}>
                  <Text style={styles.locationIcon}>📍</Text>
                </View>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationLabel}>Your Location</Text>
                  <Text style={styles.locationValue}>
                    {locationLoading ? 'Locating...' : cityLabel || 'Unknown'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.refreshButton} onPress={getLocation}>
                <Text style={styles.refreshIcon}>🔄</Text>
              </TouchableOpacity>
            </View>

            {/* Stats */}
            {restaurants.length > 0 && (
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>{restaurants.length}</Text>
                  <Text style={styles.statLabel}>Nearby Options</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>5km</Text>
                  <Text style={styles.statLabel}>Search Radius</Text>
                </View>
              </View>
            )}
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Wheel Section */}
          <View style={styles.wheelSection}>
            {loadingList ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6B6B" />
                <Text style={styles.loadingText}>Finding amazing places...</Text>
              </View>
            ) : restaurants.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🍽️</Text>
                <Text style={styles.emptyTitle}>Ready to explore</Text>
                <Text style={styles.emptyText}>
                  Tap refresh to load nearby restaurants
                </Text>
              </View>
            ) : (
              <View style={styles.wheelContainer}>
                {/* Info Text */}
                <View style={styles.wheelInfo}>
                  <Text style={styles.wheelInfoText}>
                    {spinning ? '🎲 Spinning...' : selectedRestaurant ? '🎉 Your pick is ready!' : '👆 Tap spin to choose'}
                  </Text>
                </View>

                {/* Wheel with Pointer */}
                <View style={[styles.wheelWrapper, { width: wheelSize, height: wheelSize + 40 }]}>
                  {/* Top Pointer - pointing DOWN into the wheel */}
                  <View style={styles.pointerContainer}>
                    <View style={styles.pointerOuter}>
                      <View style={styles.pointer} />
                    </View>
                  </View>

                  {/* Spinning Wheel */}
                  <Animated.View
                    style={[
                      styles.wheelAnimated,
                      {
                        transform: [{ rotate: rotationInterpolate }],
                        width: wheelSize,
                        height: wheelSize,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.wheel,
                        {
                          width: wheelSize,
                          height: wheelSize,
                          borderRadius: wheelSize / 2,
                        },
                      ]}
                    >
                      {/* Draw colored segments */}
                      {restaurants.map((restaurant, i) => {
                        const n = restaurants.length;
                        const segmentAngle = 360 / n;
                        const startAngle = i * segmentAngle - 90; // Start from top

                        return (
                          <View
                            key={`segment-${i}`}
                            style={[
                              styles.segment,
                              {
                                width: wheelSize,
                                height: wheelSize,
                                transform: [{ rotate: `${startAngle}deg` }],
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.segmentSlice,
                                {
                                  width: wheelSize / 2,
                                  height: wheelSize / 2,
                                  backgroundColor: colors[i % colors.length],
                                  borderTopRightRadius: wheelSize / 2,
                                  transform: [{ rotate: `${segmentAngle}deg` }],
                                  transformOrigin: '0% 100%',
                                },
                              ]}
                            />
                          </View>
                        );
                      })}

                      {/* Segment dividers */}
                      {restaurants.map((_, i) => {
                        const n = restaurants.length;
                        const angle = (360 / n) * i - 90;
                        return (
                          <View
                            key={`divider-${i}`}
                            style={[
                              styles.dividerLine,
                              {
                                width: wheelSize,
                                height: wheelSize,
                                transform: [{ rotate: `${angle}deg` }],
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.divider,
                                {
                                  width: 3,
                                  height: wheelSize / 2,
                                  marginLeft: wheelSize / 2 - 1.5,
                                },
                              ]}
                            />
                          </View>
                        );
                      })}

                      {/* Restaurant labels */}
                      {restaurants.map((r, i) => {
                        const n = restaurants.length;
                        const segmentAngle = 360 / n;
                        const angle = i * segmentAngle + segmentAngle / 2 - 90;
                        const rad = (angle * Math.PI) / 180;
                        const labelRadius = wheelSize / 2.6;
                        const x = Math.cos(rad) * labelRadius;
                        const y = Math.sin(rad) * labelRadius;
                        const maxWidth = getLabelMaxWidth(n, labelRadius);
                        const fontSize = getLabelFontSize(r.name, n);

                        return (
                          <View
                            key={r.fsqId || i}
                            style={[
                              styles.labelWrapper,
                              {
                                left: wheelSize / 2 + x,
                                top: wheelSize / 2 + y,
                                transform: [
                                  { translateX: -maxWidth / 2 },
                                  { translateY: -16 },
                                  { rotate: `${angle + 90}deg` },
                                ],
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.label,
                                { maxWidth },
                                selectedIndex === i && styles.labelSelected,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.labelText,
                                  { fontSize },
                                  selectedIndex === i && styles.labelTextSelected,
                                ]}
                                numberOfLines={2}
                              >
                                {shortName(r.name, 20)}
                              </Text>
                            </View>
                          </View>
                        );
                      })}

                      {/* Center circle */}
                      <View style={styles.centerCircle}>
                        <Text style={styles.centerText}>SPIN</Text>
                      </View>
                    </View>
                  </Animated.View>
                </View>

                {/* Spin Button */}
                <TouchableOpacity
                  style={[styles.spinButton, spinning && styles.spinButtonDisabled]}
                  onPress={spinWheel}
                  disabled={spinning}
                  activeOpacity={0.85}
                >
                  <Text style={styles.spinButtonText}>
                    {spinning ? 'Spinning...' : 'Spin the Wheel'}
                  </Text>
                </TouchableOpacity>

                {/* Result Card */}
                {selectedRestaurant && !spinning && (
                  <Animated.View style={styles.resultCard}>
                    <View style={styles.resultBadge}>
                      <Text style={styles.resultBadgeText}>🎉 Your Pick!</Text>
                    </View>

                    {selectedRestaurant.photoUrl && (
                      <View style={styles.photoContainer}>
                        <Image
                          source={{ uri: selectedRestaurant.photoUrl }}
                          style={styles.restaurantPhoto}
                          resizeMode="cover"
                        />
                      </View>
                    )}

                    <View style={styles.resultContent}>
                      <Text style={styles.restaurantName}>{selectedRestaurant.name}</Text>

                      {selectedRestaurant.rating && (
                        <View style={styles.ratingRow}>
                          <View style={styles.ratingContainer}>
                            <Text style={styles.ratingStars}>⭐️</Text>
                            <Text style={styles.ratingText}>{selectedRestaurant.rating.toFixed(1)}</Text>
                            <Text style={styles.ratingMax}>/10</Text>
                          </View>
                        </View>
                      )}

                      <View style={styles.addressContainer}>
                        <Text style={styles.addressIcon}>📍</Text>
                        <Text style={styles.addressText}>{selectedRestaurant.address}</Text>
                      </View>

                      <View style={styles.actionButtons}>
                        {selectedRestaurant.mapsUrl && (
                          <TouchableOpacity
                            style={[styles.actionButton, styles.primaryButton]}
                            onPress={() => openLink(selectedRestaurant.mapsUrl)}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.primaryButtonText}>Get Directions</Text>
                          </TouchableOpacity>
                        )}
                        {selectedRestaurant.website && (
                          <TouchableOpacity
                            style={[styles.actionButton, styles.secondaryButton]}
                            onPress={() => openLink(selectedRestaurant.website)}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.secondaryButtonText}>Visit Website</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </Animated.View>
                )}
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Made with ❤️ for food lovers</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  bgBlob1: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(255, 107, 107, 0.06)',
    top: -150,
    left: -100,
  },
  bgBlob2: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(78, 205, 196, 0.06)',
    top: 100,
    right: -120,
  },
  bgBlob3: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 217, 61, 0.06)',
    bottom: -80,
    left: -60,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow(
      { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      4,
      '0px 8px 18px rgba(0,0,0,0.08)'
    ),
  },
  logoEmoji: {
    fontSize: 26,
  },
  brandText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1A1A1A',
    letterSpacing: -0.8,
  },
  heroContent: {
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#1A1A1A',
    lineHeight: 40,
    letterSpacing: -1.2,
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 20,
    marginTop: 4,
    ...shadow(
      { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12 },
      3,
      '0px 8px 20px rgba(0,0,0,0.06)'
    ),
  },
  locationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  locationIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationIcon: {
    fontSize: 22,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshIcon: {
    fontSize: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    ...shadow(
      { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      2,
      '0px 6px 14px rgba(0,0,0,0.04)'
    ),
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FF6B6B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  errorBanner: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorIcon: {
    fontSize: 20,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#991B1B',
    fontWeight: '500',
  },
  wheelSection: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: '#FFF',
    borderRadius: 24,
    marginBottom: 20,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
  },
  wheelContainer: {
    alignItems: 'center',
  },
  wheelInfo: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 24,
    ...shadow(
      { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      2,
      '0px 6px 14px rgba(0,0,0,0.06)'
    ),
  },
  wheelInfoText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  wheelWrapper: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 28,
  },
  pointerContainer: {
    position: 'absolute',
    top: 0,
    zIndex: 10,
    alignItems: 'center',
  },
  pointerOuter: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 8,
    ...shadow(
      { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      6,
      '0px 10px 22px rgba(0,0,0,0.15)'
    ),
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderTopWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#1A1A1A',
  },
  wheelAnimated: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  wheel: {
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadow(
      { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 30 },
      15,
      '0px 18px 40px rgba(0,0,0,0.15)'
    ),
    borderWidth: 8,
    borderColor: '#FFF',
  },
  segment: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSlice: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  dividerLine: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  divider: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  labelWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  label: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    alignItems: 'center',
    ...shadow(
      { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      3,
      '0px 4px 10px rgba(0,0,0,0.1)'
    ),
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  labelSelected: {
    backgroundColor: '#1A1A1A',
    borderColor: '#FFD93D',
    borderWidth: 2,
    transform: [{ scale: 1.1 }],
  },
  labelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    lineHeight: 13,
  },
  labelTextSelected: {
    color: '#FFF',
  },
  centerCircle: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow(
      { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
      10,
      '0px 10px 22px rgba(0,0,0,0.3)'
    ),
    borderWidth: 5,
    borderColor: '#FFF',
  },
  centerText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
  },
  spinButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 30,
    marginBottom: 28,
    ...shadow(
      { shadowColor: '#FF6B6B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20 },
      8,
      '0px 14px 28px rgba(255,107,107,0.4)'
    ),
    minWidth: 200,
  },
  spinButtonDisabled: {
    opacity: 0.6,
  },
  spinButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  resultCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    overflow: 'hidden',
    width: '100%',
    ...shadow(
      { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24 },
      12,
      '0px 18px 36px rgba(0,0,0,0.15)'
    ),
  },
  resultBadge: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    alignItems: 'center',
  },
  resultBadgeText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
  },
  photoContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#F3F4F6',
  },
  restaurantPhoto: {
    width: '100%',
    height: '100%',
  },
  resultContent: {
    padding: 20,
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 12,
    lineHeight: 30,
  },
  ratingRow: {
    marginBottom: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  ratingStars: {
    fontSize: 16,
    marginRight: 6,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F59E0B',
  },
  ratingMax: {
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 2,
    fontWeight: '600',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
  },
  addressIcon: {
    fontSize: 16,
    marginTop: 2,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    fontWeight: '500',
  },
  actionButtons: {
    gap: 10,
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#1A1A1A',
    ...shadow(
      { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 },
      4,
      '0px 8px 18px rgba(0,0,0,0.2)'
    ),
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  footer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
