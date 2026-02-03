# SpinDine Mobile App (Expo)

## Quick Start

1. **Install Expo globally:**
   ```bash
   npm install -g expo-cli
   ```

2. **Get your PC IP address:**
   - Open PowerShell and run: `ipconfig`
   - Look for IPv4 Address (e.g., `192.168.1.100`)

3. **Update backend URL in App.tsx:**
   ```typescript
   const BACKEND_URL = 'http://192.168.1.100:5000';
   ```

4. **Install dependencies:**
   ```bash
   npm install
   ```

5. **Start the app:**
   ```bash
   npm start
   ```

6. **Run on device/emulator:**
   - Press `a` for Android emulator
   - Press `i` for iOS simulator
   - Press `w` for web version
   - Or scan QR code with Expo Go app on your phone

## Troubleshooting

**Vulnerabilities error:**
```bash
npm audit fix
```

**Cannot find modules:**
```bash
npm install
npm start -- --clear
```

**Cannot connect to backend:**
1. Ensure backend is running (`npm start` in parent directory)
2. Use correct IP in BACKEND_URL
3. For Android emulator: use `10.0.2.2:5000`

**Location permission:**
- App will ask for permission - tap "Allow"
- Works best on physical device

## Files

- `App.tsx` - Main app logic (location, restaurant fetching)
- `app.json` - Expo configuration
- `package.json` - Dependencies

Done! Your React Native app is ready to run.
