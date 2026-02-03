import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';

// Change this to your backend URL
// For testing: use your machine's IP address
const BACKEND_URL = 'http://localhost:5000';

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
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get user's location on app start
  useEffect(() => {
    getLocation();
  }, []);

  // Fetch restaurant when location changes
  useEffect(() => {
    if (location) {
      fetchRandomRestaurant(location.latitude, location.longitude);
    }
  }, [location]);

  /**
   * Get device's GPS location
   */
  const getLocation = async () => {
    try {
      setLocationLoading(true);
      setError(null);
      // Use Expo Location on native platforms
      if (Platform.OS !== 'web') {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Permission to access location was denied');
          setLocationLoading(false);
          // Use NYC as default for testing
          setLocation({ latitude: 40.7128, longitude: -74.0060 });
          return;
        }

        const locationData = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const { latitude, longitude } = locationData.coords;
        setLocation({ latitude, longitude });
        setLocationLoading(false);
        return;
      }

      // Web: try browser geolocation first, then fallback to IP-based lookup
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords as any;
            setLocation({ latitude, longitude });
            setLocationLoading(false);
          },
          async (err) => {
            console.warn('Browser geolocation failed, falling back to IP lookup', err);
            // fallback to IP-based location service
            try {
              const resp = await fetch('https://ipapi.co/json/');
              const j = await resp.json();
              setLocation({ latitude: j.latitude, longitude: j.longitude });
            } catch (e) {
              setLocation({ latitude: 40.7128, longitude: -74.0060 });
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
      // Use NYC as default for testing
      setLocation({ latitude: 40.7128, longitude: -74.0060 });
    }
  };

  /**
   * Fetch random restaurant from backend
   */
  const fetchRandomRestaurant = async (lat: number, lng: number) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${BACKEND_URL}/api/random-restaurant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ latitude: lat, longitude: lng, radius: 5000 }),
      });

      const data = await res.json();

      if (data.success) {
        setRestaurant(data.restaurant);
      } else {
        setError(data.error || 'Failed to fetch restaurant');
      }
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Failed to connect to backend. Make sure it\'s running.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Spin to get another random restaurant
   */
  const getAnotherRestaurant = () => {
    if (location) {
      fetchRandomRestaurant(location.latitude, location.longitude);
    }
  };

  /**
   * Open website or maps
   */
  const openLink = (url: string | null) => {
    if (!url) {
      Alert.alert('Not Available', 'This link is not available');
      return;
    }

    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open the link');
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🍽️ SpinDine</Text>
        <Text style={styles.subtitle}>Spin to find your next meal!</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Location Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 Your Location</Text>
          {locationLoading ? (
            <ActivityIndicator size="large" color="#FF6B6B" />
          ) : location ? (
            <>
              <Text style={styles.cardText}>
                Latitude: {location.latitude.toFixed(4)}
              </Text>
              <Text style={styles.cardText}>
                Longitude: {location.longitude.toFixed(4)}
              </Text>
              <TouchableOpacity
                style={styles.button}
                onPress={getLocation}
              >
                <Text style={styles.buttonText}>📍 Refresh Location</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        {/* Restaurant Section */}
        {error && (
          <View style={[styles.card, styles.errorCard]}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.card}>
            <ActivityIndicator size="large" color="#FF6B6B" />
            <Text style={styles.loadingText}>Finding your next restaurant...</Text>
          </View>
        ) : restaurant ? (
          <View style={styles.card}>
            {/* Restaurant Photo */}
            {restaurant.photoUrl && (
              <Image
                source={{ uri: restaurant.photoUrl }}
                style={styles.restaurantPhoto}
                onError={() => console.log('Failed to load image')}
              />
            )}

            {/* Restaurant Details */}
            <Text style={styles.restaurantName}>{restaurant.name}</Text>

            {restaurant.rating && (
              <Text style={styles.rating}>
                ⭐ {restaurant.rating.toFixed(1)}/10
              </Text>
            )}

            <Text style={styles.address}>📍 {restaurant.address}</Text>

            {/* Action Buttons */}
            <View style={styles.buttonGroup}>
              {restaurant.mapsUrl && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.mapsButton]}
                  onPress={() => openLink(restaurant.mapsUrl)}
                >
                  <Text style={styles.actionButtonText}>📍 Open Maps</Text>
                </TouchableOpacity>
              )}

              {restaurant.website && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.websiteButton]}
                  onPress={() => openLink(restaurant.website)}
                >
                  <Text style={styles.actionButtonText}>🌐 Website</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : null}

        {/* Spin Button */}
        {!loading && location && (
          <TouchableOpacity
            style={styles.spinButton}
            onPress={getAnotherRestaurant}
          >
            <Text style={styles.spinButtonText}>🎯 SPIN FOR NEW RESTAURANT</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F5',
  },
  header: {
    backgroundColor: '#FF6B6B',
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  cardText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  errorCard: {
    backgroundColor: '#FFE5E5',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  restaurantPhoto: {
    width: '100%',
    height: 250,
    borderRadius: 10,
    marginBottom: 15,
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  rating: {
    fontSize: 16,
    color: '#FF6B6B',
    marginBottom: 10,
    fontWeight: '600',
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  mapsButton: {
    backgroundColor: '#FF6B6B',
  },
  websiteButton: {
    backgroundColor: '#4ECDC4',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  spinButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  spinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
