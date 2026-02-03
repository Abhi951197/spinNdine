const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Simple request logger to help debugging (prints method and url)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ success: true, uptime: process.uptime() });
});

// Quick test endpoint for deployment verification
app.get('/api', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

// Helpful GET handler for /api/restaurants when someone hits it from a browser
app.get('/api/restaurants', (req, res) => {
  res.status(405).json({ success: false, error: "Use POST with JSON body: { latitude, longitude }" });
});

const PORT = process.env.PORT || 5000;

/**
 * POST /api/random-restaurant
 */
app.post('/api/random-restaurant', async (req, res) => {
  const { latitude, longitude, radius = 5000 } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({
      success: false,
      error: 'Latitude and longitude required',
    });
  }

  try {
    const response = await axios.get(
      'https://places-api.foursquare.com/places/search',
      {
        params: {
          ll: `${latitude},${longitude}`,
          radius,
          categories: '13065', // Restaurants
          limit: 10,
        },
        headers: {
          Authorization: `Bearer ${process.env.FOURSQUARE_SERVICE_TOKEN}`,
          'X-Places-Api-Version': '2025-06-17',
          Accept: 'application/json',
        },
      }
    );

    const places = response.data.results || [];

    if (places.length === 0) {
      return res.json({
        success: false,
        error: 'No restaurants found',
      });
    }

    // Pick random restaurant
    const random = places[Math.floor(Math.random() * places.length)];

    // Normalize response for mobile app
    const restaurant = {
      fsqId: random.fsq_id,
      name: random.name,
      rating: random.rating ?? null,
      address: random.location?.formatted_address ?? 'Address not available',
      website: random.website ?? null,
      photoUrl:
        random.photos?.length > 0
          ? `${random.photos[0].prefix}original${random.photos[0].suffix}`
          : null,
      mapsUrl: random.geocodes?.main
        ? `https://www.google.com/maps/search/?api=1&query=${random.geocodes.main.latitude},${random.geocodes.main.longitude}`
        : null,
    };

    res.json({ success: true, restaurant });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch restaurants',
    });
  }
});

// POST /api/restaurants - return a list of nearby restaurants (normalized)
app.post('/api/restaurants', async (req, res) => {
  const { latitude, longitude, radius = 5000, limit = 10 } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({
      success: false,
      error: 'Latitude and longitude required',
    });
  }

  try {
    const response2 = await axios.get('https://places-api.foursquare.com/places/search', {
      params: {
        ll: `${latitude},${longitude}`,
        radius,
        categories: '13065', // Restaurants
        limit,
      },
      headers: {
        Authorization: `Bearer ${process.env.FOURSQUARE_SERVICE_TOKEN}`,
        'X-Places-Api-Version': '2025-06-17',
        Accept: 'application/json',
      },
    });

    const places2 = response2.data.results || [];

    const restaurants = places2.map((p) => ({
      fsqId: p.fsq_id,
      name: p.name,
      rating: p.rating ?? null,
      address: p.location?.formatted_address ?? 'Address not available',
      website: p.website ?? null,
      photoUrl:
        p.photos?.length > 0 ? `${p.photos[0].prefix}original${p.photos[0].suffix}` : null,
      mapsUrl: p.geocodes?.main
        ? `https://www.google.com/maps/search/?api=1&query=${p.geocodes.main.latitude},${p.geocodes.main.longitude}`
        : null,
    }));

    res.json({ success: true, restaurants });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch restaurants',
    });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
  });
}

module.exports = app;
