# Quick Start: Deploying Real Pricing

## ⚡ 30-Second Setup

### Step 1: Get API Key
1. Go to https://console.cloud.google.com/
2. Create project → Enable "Distance Matrix API"
3. Credentials → Create API Key → Copy

### Step 2: Configure Server
```bash
cd server
cp .env.example .env
# Edit .env and add your Google Maps API key:
# GOOGLE_MAPS_API_KEY=AIza_YourKeyHere
```

### Step 3: Run Server
```bash
npm start
```

**Done!** Prices now use real data from Google Maps.

---

## 🎯 What Changed

| Feature | Before | After |
|---------|--------|-------|
| **Distance** | Straight-line (inaccurate) | Real road distance from Google |
| **Pricing** | Flat ₹2.8/km for all | Tiered pricing: ₹3.5→₹2.5/km |
| **Bus Types** | Same price | Multipliers: 0.9x - 1.8x |
| **Min Price** | ₹250 | ₹300 |
| **API** | None | Google Maps (cached) |

---

## 💰 Example Prices

**Mumbai ↔ Bangalore (580 km)**
```
A/C Seater:   580 × ₹2.8 × 1.4 = ₹2,273
A/C Sleeper:  580 × ₹2.8 × 1.8 = ₹2,923
Non A/C:      580 × ₹2.8 × 1.0 = ₹1,624
```

**Mumbai ↔ Pune (120 km)**
```
A/C Seater:   120 × ₹3.0 × 1.4 = ₹504
Non A/C:      120 × ₹3.0 × 1.0 = ₹360
```

---

## 📦 Files Changed

**New Files:**
- `server/src/services/googleMapsService.js` - Core Google integration
- `server/.env.example` - Config template
- `GOOGLE_MAPS_SETUP.md` - Detailed guide

**Modified Files:**
- `server/src/utils/busData.js` - New async pricing function
- `server/src/services/syntheticRouteService.js` - Uses real distances
- `server/src/routes/buses.js` - Awaits async pricing

---

## 🧪 Verify It Works

Search for buses:
```bash
curl "http://localhost:5000/api/buses/search?from=Mumbai&to=Bangalore&date=2026-04-25"
```

Prices should now be realistic and vary by bus type!

---

## ⚠️ Without API Key

- Service still works (uses fallback)
- Distances: Haversine calculation
- Prices: Default rates apply
- No errors, no interruption

---

## 💡 Pro Tips

1. **Cache**: Distances cached 24 hours → minimal API calls
2. **Cost**: ~$0-5/month (or free tier)
3. **Fallback**: Works offline, just less accurate
4. **Testing**: Same route twice → second is instant (cache)

---

## 🚀 Production Checklist

- [ ] Created `.env` file with API key
- [ ] Verified MONGO_URI is set
- [ ] Installed dependencies (`npm install`)
- [ ] Started server (`npm start`)
- [ ] Tested a search query
- [ ] Prices look realistic
- [ ] Different bus types have different prices
- [ ] Ready to deploy!

---

## 📞 Support

**Setup Issues?** Check `GOOGLE_MAPS_SETUP.md`
**Implementation Details?** Check `PRICING_IMPLEMENTATION.md`
**Code Details?** Check `server/src/services/googleMapsService.js`

---

✅ **Status**: Ready for production deployment!
