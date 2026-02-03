# SpinDine Backend - Testing Guide (Foursquare)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Get Foursquare Places API Key:**
   - Go to [Foursquare Developer Console](https://developer.foursquare.com/)
   - Sign up or log in
   - Create a new app
   - Copy your API key
   - Add the key to `.env` file:
     ```
     FOURSQUARE_API_KEY=your_foursquare_api_key_here
     FOURSQUARE_API_VERSION=2025-06-17
     ```

3. **Start the backend:**
   ```bash
   npm start
   ```
   The server will run on `http://localhost:5000`

## Testing the API

### Health Check
```bash
curl http://localhost:5000/health
```

### Get Random Restaurant (NYC Example)
```bash
curl -X POST http://localhost:5000/api/random-restaurant \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 40.7128,
    "longitude": -74.0060,
    "radius": 5000
  }'
```

### Test with Different Locations

**San Francisco:**
```bash
curl -X POST http://localhost:5000/api/random-restaurant \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 37.7749,
    "longitude": -122.4194,
    "radius": 3000
  }'
```

**Los Angeles:**
```bash
curl -X POST http://localhost:5000/api/random-restaurant \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 34.0522,
    "longitude": -118.2437,
    "radius": 5000
  }'
```

**Delhi, India:**
```bash
curl -X POST http://localhost:5000/api/random-restaurant \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 28.6139,
    "longitude": 77.2090,
    "radius": 5000
  }'
```

## Expected Response

```json
{
  "success": true,
  "restaurant": {
    "name": "Restaurant Name",
    "rating": 4.5,
    "address": "123 Main St, City, State",
    "photoUrl": "https://igx.4sqi.net/img/...",
    "website": "https://restaurantwebsite.com",
    "mapsUrl": "https://www.google.com/maps/search/...",
    "fsqId": "4d1234567890abcdef"
  }
}
```

## Using Postman

1. Create a new POST request
2. URL: `http://localhost:5000/api/random-restaurant`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
   ```json
   {
     "latitude": 40.7128,
     "longitude": -74.0060,
     "radius": 5000
   }
   ```
5. Click Send

## API Endpoints

### POST /api/random-restaurant
Gets a random restaurant near the provided coordinates using Foursquare Places API.

**Request Parameters:**
- `latitude` (required): User's latitude
- `longitude` (required): User's longitude
- `radius` (optional): Search radius in meters (default: 5000)

**Response:**
- `success`: Boolean
- `restaurant`: Object with:
  - `name`: Restaurant name
  - `rating`: Star rating (0-10)
  - `address`: Formatted address
  - `photoUrl`: URL to restaurant photo
  - `website`: Restaurant website URL
  - `mapsUrl`: Google Maps URL
  - `fsqId`: Foursquare place ID

## Troubleshooting

- **"Foursquare API key not configured"**: Make sure you've added your Foursquare API key to `.env`
- **"No restaurants found"**: The location exists but has no restaurants nearby. Try:
  - Increasing the `radius` parameter
  - Using a more central location
- **CORS errors**: The backend has CORS enabled for all origins
- **401 Unauthorized**: Check that your Foursquare API key is correct and hasn't expired
- **429 Too Many Requests**: You've hit the rate limit. Wait a moment and retry.

## API Documentation

- [Foursquare Places API Docs](https://location.foursquare.com/developer/reference)
- [Categories Reference](https://location.foursquare.com/developer/reference/place-search) - 13000 = Restaurants
