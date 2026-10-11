# Google Maps Integration Setup Guide

## Overview
The app now integrates with **Google Maps Distance Matrix API** for accurate, real-world distance calculations and pricing based on actual road networks instead of simple coordinate distance estimates.

## Features

### ✅ What's New
1. **Real Distance Calculation**: Uses Google Maps API to get actual road distances
2. **Dynamic Pricing**: Prices are now calculated based on:
   - Real road distance (not straight-line distance)
   - Distance-based rate tiers (short/medium/long/extra-long routes)
   - Bus type multipliers (Premium buses cost more)
   - Market-realistic pricing

3. **Fallback Mechanism**: If Google API is unavailable:
   - Automatically falls back to Haversine distance calculation
   - Uses reasonable default prices
   - No service interruption

4. **Caching**: Distances are cached for 24 hours to reduce API calls and costs

## Setup Instructions

### Step 1: Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable these APIs:
   - **Distance Matrix API**
   - **Maps JavaScript API** (optional, for frontend maps)
   - **Geocoding API** (optional, for address lookup)

4. Create an API key:
   - Go to "Credentials" → "Create Credentials" → "API Key"
   - Restrict the key to your server IP (optional but recommended)
   - Copy the API key

### Step 2: Configure Environment Variables

1. In the `server` folder, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Google Maps API key:
   ```
   GOOGLE_MAPS_API_KEY=AIza...your_key...
   MONGODB_URI=mongodb://localhost:27017/bus-booking
   PORT=5000
   NODE_ENV=development
   ```

### Step 3: Install Dependencies (if needed)

The Google Maps service uses the native `fetch` API (Node.js 18+). No additional packages needed!

```bash
cd server
npm install
```

### Step 4: Start the Server

```bash
npm start
```

The server will now use Google Maps for distance and pricing calculations.

## Pricing Formula

### Distance-Based Rate Tiers
```
- Up to 100 km:           ₹3.5/km
- 101-300 km:             ₹3.0/km
- 301-600 km:             ₹2.8/km
- 600+ km:                ₹2.5/km
```

### Bus Type Multipliers
```
- A/C Sleeper (2+1):      1.8x (Premium)
- A/C Seater (2+2):       1.4x
- Electric A/C Seater:    1.6x (Premium)
- Non A/C Seater:         0.9x (Economy)
- Non A/C Sleeper:        1.0x
- Standard/Default:       1.2x
```

### Final Price Calculation
```
Final Price = Distance (km) × Rate by Distance × Bus Type Multiplier
Minimum Price: ₹300
```

**Example:**
- Route: Mumbai to Pune (120 km, A/C Seater)
- Price = 120 km × ₹3.0/km × 1.4 = ₹504

## Testing the Integration

### 1. Check Cache Status
The service maintains an in-memory cache. To view cache stats:

```javascript
// In your route handler or test script
const googleMapsService = require('./services/googleMapsService');
console.log(googleMapsService.getCacheStats());
```

### 2. Clear Cache
If needed, manually clear the cache:

```javascript
const googleMapsService = require('./services/googleMapsService');
googleMapsService.clearCache();
```

### 3. Test a Specific Route
```bash
curl "http://localhost:5000/api/buses/search?from=Mumbai&to=Bangalore&date=2026-04-25"
```

Check the prices in the response - they should now be based on real distances!

## Troubleshooting

### Issue: "GOOGLE_MAPS_API_KEY not configured"
**Solution**: Add the API key to your `.env` file in the server folder

### Issue: Prices seem too high/low
**Possible causes:**
1. Check the distance calculation - is it realistic?
2. Verify the bus type is correctly identified
3. Check if a different multiplier is being used (fallback values)

### Issue: API quota exceeded
**Solution:**
1. Set usage limits in Google Cloud Console
2. The service automatically caches results for 24 hours
3. Consider upgrading your API plan

### Issue: Service is slow
**Possible causes:**
1. First request for a route-bus combination will call Google API (slower)
2. Subsequent requests use cache (faster)
3. Check your internet connection
4. Verify Google Cloud API is responding normally

## Files Modified

- **Created**: `server/src/services/googleMapsService.js` - Google Maps integration
- **Updated**: `server/src/utils/busData.js` - Added async pricing function
- **Updated**: `server/src/services/syntheticRouteService.js` - Uses real distances
- **Created**: `server/.env.example` - Environment variables template
- **Created**: `GOOGLE_MAPS_SETUP.md` - This file

## API Rate Limits

Google Maps Distance Matrix API has these limits (free tier):
- **25 requests per second**
- **2,500 elements per day** (1 route = 1 element)

With caching, actual API calls are minimal. The app will work fine for thousands of searches!

## Pricing in the Frontend

Users will now see accurate prices that reflect:
1. **Real distance** between locations
2. **Bus quality** (A/C vs Non-A/C)
3. **Market rates** for different route distances

Example price comparison:
```
Route: Mumbai → Bangalore (580 km)

Before: 580 × 2.8 × 1.0 = ₹1,624 (generic)
After:  580 × 2.5 × 1.4 = ₹2,030 (A/C Seater, realistic market rate)
```

## Support

For issues with:
- **Google API**: Check [Google Cloud Documentation](https://developers.google.com/maps/documentation/distance-matrix)
- **App Implementation**: Check `server/src/services/googleMapsService.js`
- **Environment Setup**: Verify `.env` file configuration

---

**Status**: ✅ Ready to deploy with real pricing!
