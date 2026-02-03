const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const FOURSQUARE_API_KEY = process.env.FOURSQUARE_API_KEY;
const FOURSQUARE_API_VERSION = process.env.FOURSQUARE_API_VERSION || '2025-06-17';

/**
 * Get user's location from IP address
 */
async function getUserLocation() {
  try {
    console.log('📍 Fetching your current location...');
    
    const response = await axios.get('https://ipapi.co/json/');
    
    const location = {
      latitude: response.data.latitude,
      longitude: response.data.longitude,
      city: response.data.city,
      region: response.data.region,
      country: response.data.country_name,
      ip: response.data.ip
    };
    
    return location;
    
  } catch (error) {
    console.error('❌ Error fetching location:', error.message);
    throw error;
  }
}

/**
 * Display location information
 */
function displayLocation(location) {
  console.log('\n' + '='.repeat(60));
  console.log('📌 YOUR CURRENT LOCATION');
  console.log('='.repeat(60));
  console.log(`📍 City: ${location.city}, ${location.region}`);
  console.log(`🌍 Country: ${location.country}`);
  console.log(`📊 Coordinates: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`);
  console.log(`🔌 IP Address: ${location.ip}`);
  console.log('='.repeat(60) + '\n');
}

/**
 * Fetch nearby restaurants from Foursquare
 */
async function fetchNearbyRestaurants(latitude, longitude, radius = 5000) {
  try {
    console.log('🔍 Fetching nearby restaurants...\n');

    const token = process.env.FOURSQUARE_SERVICE_TOKEN;

    if (!token) {
      throw new Error('Foursquare service token missing');
    }

    const response = await axios.get(
      'https://places-api.foursquare.com/places/search',
      {
        params: {
          ll: `${latitude},${longitude}`,
          radius,
          categories: '13065',
          limit: 10
        },
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Places-Api-Version': '2025-06-17',
          Accept: 'application/json'
        }
      }
    );

    return response.data.results || [];

  } catch (error) {
    console.error('❌ Status:', error.response?.status);
    console.error('❌ Response:', error.response?.data);
    throw error;
  }
}

/**
 * Display restaurants in a formatted way
 */
function displayRestaurants(restaurants) {
  console.log('\n' + '='.repeat(70));
  console.log(`🍽️  NEARBY RESTAURANTS (${restaurants.length} Found)`);
  console.log('='.repeat(70) + '\n');

  restaurants.forEach((restaurant, index) => {
    const photoUrl = restaurant.photos && restaurant.photos.length > 0
      ? `${restaurant.photos[0].prefix}original${restaurant.photos[0].suffix}`
      : 'No photo available';
    
    const rating = restaurant.rating 
      ? `${restaurant.rating}/10 ⭐` 
      : 'Not rated';
    
    const address = restaurant.location?.formatted_address || 'Address not available';
    
    const website = restaurant.website || 'No website';
    
    console.log(`${index + 1}. ${restaurant.name}`);
    console.log(`   Rating: ${rating}`);
    console.log(`   Address: ${address}`);
    console.log(`   Website: ${website}`);
    console.log(`   Photo: ${photoUrl}`);
    
    if (restaurant.geocodes?.main) {
      const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(restaurant.name)}/@${restaurant.geocodes.main.latitude},${restaurant.geocodes.main.longitude},17z`;
      console.log(`   Maps: ${mapsUrl}`);
    }
    
    console.log('');
  });

  console.log('='.repeat(70) + '\n');
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('\n🚀 Starting SpinDine Location & Restaurant Finder\n');
    
    // Get user's current location
    const userLocation = await getUserLocation();
    displayLocation(userLocation);
    
    // Fetch nearby restaurants
    const restaurants = await fetchNearbyRestaurants(
      userLocation.latitude,
      userLocation.longitude,
      5000
    );
    
    // Display restaurants
    displayRestaurants(restaurants);
    
    console.log('✅ Done! All restaurants displayed above.\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
