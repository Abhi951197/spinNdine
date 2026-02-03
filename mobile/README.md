# SpinDine React Native App

A mobile app to discover random restaurants nearby using GPS location and Foursquare API.

## Features

✅ **Real-time GPS Location** - Uses device's GPS to get exact location
✅ **Random Restaurant Discovery** - Spin to get a random nearby restaurant
✅ **Rich Restaurant Details** - Name, rating, address, photo
✅ **Maps Integration** - Open restaurant in Google Maps
✅ **Website Link** - Visit restaurant's website
✅ **Beautiful UI** - Modern, user-friendly interface

## Prerequisites

- Node.js & npm
- React Native CLI
- Android Studio (for Android) or Xcode (for iOS)
- Your backend running (`npm start` in parent directory)

## Setup

### 1. Install Dependencies

```bash
cd mobile
npm install
```

### 2. Update Backend URL

Edit `mobile/App.tsx` and change the `BACKEND_URL` to match your backend:

```typescript
const BACKEND_URL = 'http://192.168.1.100:5000'; // Change to your IP/URL
```

For local testing:
- **Android Emulator**: Use `10.0.2.2:5000` instead of `localhost`
- **Physical Device**: Use your machine's IP address (e.g., `192.168.1.100:5000`)
- **iOS Simulator**: Use `localhost:5000` or your machine's IP

### 3. Add Location Permissions

#### Android (`android/app/src/main/AndroidManifest.xml`)
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

#### iOS (`ios/SpinDine/Info.plist`)
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to find nearby restaurants</string>
```

## Running the App

### Android
```bash
npx react-native run-android
```

### iOS
```bash
npx react-native run-ios
```

### Metro Bundler (Development Server)
```bash
npx react-native start
```

## How It Works

1. **App Starts** → Gets device's GPS location
2. **Fetches Location** → Sends coordinates to backend
3. **Backend Search** → Uses Foursquare API to find 10 nearby restaurants
4. **Random Selection** → Backend randomly picks 1 restaurant
5. **Display Info** → Shows restaurant details with photo, rating, address
6. **User Actions** → User can:
   - Open in Google Maps
   - Visit website
   - Spin for another restaurant

## Project Structure

```
mobile/
├── App.tsx              # Main app component with location & restaurant logic
├── Navigation.tsx       # Navigation setup (expandable for multiple screens)
├── package.json         # Dependencies
├── app.json             # App configuration
├── index.js             # App entry point
└── android/
    └── app/
        └── src/main/
            └── AndroidManifest.xml  # Android permissions
```

## Architecture

```
React Native App
    ↓
GPS Location (Geolocation)
    ↓
Backend API (http://your-backend:5000)
    ↓
Foursquare Places API
    ↓
Restaurant Data
    ↓
Display to User
```

## Environment Setup

Create a `.env` file in the `mobile` directory (optional):

```
REACT_APP_BACKEND_URL=http://192.168.1.100:5000
```

## Troubleshooting

### Location Permission Denied
- Grant location permission when prompted
- Check device settings → App Permissions
- For emulator, set location in emulator settings

### Backend Connection Failed
- Ensure backend is running (`npm start`)
- Check BACKEND_URL matches your IP
- For Android emulator, use `10.0.2.2` instead of `localhost`
- Check firewall settings

### No Restaurants Found
- Increase `radius` parameter (default 5000m)
- Check internet connection
- Verify Foursquare API key in backend

## Dependencies

- **react-native**: Mobile framework
- **@react-native-community/geolocation**: GPS location
- **axios**: HTTP requests
- **react-native-geolocation-service**: Enhanced geolocation

## Next Steps

1. Customize UI colors and fonts
2. Add favorites/bookmarks feature
3. Add restaurant filters (cuisine type, price range)
4. Add user authentication
5. Store favorite restaurants locally

## Support

For issues with backend, see the main project README.md
