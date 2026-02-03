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

const PORT = 5000;

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

app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
});
