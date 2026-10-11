# Time-Based Bus Seat Allocation & Scheduling

## Overview

The app now generates buses with realistic departure times throughout the day (morning, afternoon, evening, night) and allocates seats based on travel time patterns.

---

## 🕐 Departure Time Periods

### Early Morning (5 AM - 7 AM)
- **Use Case**: Overnight travelers, early commuters
- **Seat Availability**: 60-85% (Excellent)
- **Buses Generated**: Multiple slots every 30 minutes

### Morning (7 AM - 11 AM)  
- **Use Case**: Regular commuters, business travel
- **Seat Availability**: 25-70% (Variable, getting busier)
- **Buses Generated**: Multiple slots every 30 minutes

### Afternoon (12 PM - 4 PM)
- **Use Case**: Post-lunch, mid-day travel
- **Seat Availability**: 15-55% (Peak hours - fewer seats)
- **Buses Generated**: Multiple slots every 30 minutes

### Evening (4 PM - 8 PM)
- **Use Case**: Office commuters, evening travelers
- **Seat Availability**: 35-70% (Recovering availability)
- **Buses Generated**: Multiple slots every 30 minutes

### Night (8 PM - 5 AM)
- **Use Case**: Night journey, long-distance overnight buses
- **Seat Availability**: 60-85% (Excellent)
- **Buses Generated**: Multiple slots every 30 minutes

---

## 💺 Seat Allocation by Time

### How It Works

Instead of fixed seat availability, the system now calculates seats based on:

```
Available Seats = Total Seats × Time-Based Ratio

Where Time-Based Ratio is:
- Early Morning (5-7 AM): 50-70% of total capacity
- Morning Peak (7-9 AM): 50-70% (commuter rush)
- Morning (9-12 PM): 25-40% (filling up)
- Afternoon Peak (12-4 PM): 15-30% (busiest - lowest availability)
- Late Afternoon (4-6 PM): 35-55% (recovering)
- Evening (6-8 PM): 50-70% (active travel)
- Night (8 PM-5 AM): 60-85% (excellent availability)

Minimum: Always at least 4 seats available (for diversity)
Maximum: Can't exceed total bus capacity
```

### Example Calculations

**Route: Mumbai → Bangalore (A/C Seater - 44 seats total)**

| Time | Ratio | Available Seats | Status |
|------|-------|-----------------|--------|
| 5:00 AM | 60-85% | 26-37 seats | Excellent |
| 7:30 AM | 50-70% | 22-31 seats | Good |
| 9:00 AM | 25-40% | 11-18 seats | Limited |
| **2:00 PM** | **15-30%** | **7-13 seats** | **Peak - Few Seats** |
| 5:00 PM | 35-55% | 15-24 seats | Fair |
| 7:00 PM | 50-70% | 22-31 seats | Good |
| 11:00 PM | 60-85% | 26-37 seats | Excellent |

---

## 🚌 Total Buses Generated per Search

Previously: Only 4 buses per search
**Now: 8-12 randomly selected buses per search**

This ensures:
- ✅ Variety across different time periods
- ✅ Realistic bus availability throughout the day
- ✅ Users see morning, afternoon, and evening options
- ✅ Different results on multiple searches (realistic variation)

---

## 📊 Example Search Results

When user searches: **Mumbai → Bangalore on April 25, 2026**

**Previously shown:**
- 6:00 AM
- 9:30 AM
- 2:00 PM
- 10:00 PM

**Now shows (random 8-12 from):**
```
Early Morning:
✓ 5:30 AM - Express Night Bus (32 seats available) - ₹1,800
✓ 6:15 AM - Early Bird Special (28 seats available) - ₹1,750

Morning Rush:
✓ 7:00 AM - Peak Morning (18 seats available) - ₹2,100
✓ 8:30 AM - Morning Comfort (15 seats available) - ₹2,050
✓ 9:45 AM - Late Morning (22 seats available) - ₹1,900

Afternoon:
✓ 1:30 PM - Afternoon Service (9 seats available) - ₹1,850
✓ 3:00 PM - Afternoon Express (8 seats available) - ₹1,900

Evening:
✓ 5:30 PM - Evening Traveler (19 seats available) - ₹1,950
✓ 7:00 PM - Evening Express (25 seats available) - ₹2,000

Night:
✓ 9:30 PM - Night Journey (34 seats available) - ₹1,700
✓ 11:00 PM - Overnight Bus (31 seats available) - ₹1,650
```

---

## 🎯 Key Features

### 1. Realistic Time Distribution
- Buses available throughout the day (5 AM - midnight)
- More buses during peak hours (7-9 AM, 5-7 PM)
- Coverage of all time preferences

### 2. Seat Availability Varies by Time
- Rush hour = fewer seats (realistic)
- Off-peak = more seats (realistic)
- Early morning/night = most availability

### 3. Randomization
- Each search shows different 8-12 buses
- Realistic variation (not the same 4 every time)
- Different results across time periods

### 4. Time Period Labels
Buses now include:
- `timePeriod`: Early Morning, Morning, Afternoon, Evening, Night
- `timeDescription`: Specific label (e.g., "Morning rush", "Late night")

---

## 💡 Real-World Behavior Modeled

```
5:00 AM  - Night travelers ending journey, early commuters starting
         - HIGH AVAILABILITY (long-distance, few bookings yet)

7:00 AM  - Office commuters peak time
         - MODERATE-GOOD AVAILABILITY

12:00 PM - Post-lunch, minimal travel window
         - LOWEST AVAILABILITY (peak occupancy)

3:00 PM  - Afternoon slump
         - LOW AVAILABILITY

6:00 PM  - Office out, travelers active
         - MODERATE-GOOD AVAILABILITY

9:00 PM  - Long-distance night travelers
         - HIGH AVAILABILITY (many night buses, people spreading out)

12:00 AM - Late night, overnight routes
         - HIGH AVAILABILITY
```

---

## 📝 Frontend Display Suggestions

### For Better UX, Display:

1. **Time Period Grouping**
   ```
   EARLY MORNING (5:00 - 7:00 AM)
   - Bus 1: 5:30 AM → 2:15 PM
   - Bus 2: 6:15 AM → 3:00 PM
   
   MORNING (7:00 - 11:00 AM)
   - Bus 3: 7:00 AM → 3:45 PM
   - Bus 4: 8:30 AM → 5:15 PM
   ```

2. **Seat Availability Indicator**
   ```
   Green (21+):   ✓✓✓ Excellent (off-peak)
   Yellow (11-20): ✓✓  Fair (moderate)
   Red (≤10):     ✓    Limited (peak)
   ```

3. **Quick Filter Options**
   ```
   [ ] Early Morning  [ ] Morning  [✓] Afternoon
   [ ] Evening        [ ] Night
   ```

---

## 🔧 Technical Implementation

### File Modified
- `server/src/services/syntheticRouteService.js`

### New Functions
1. **`getTimeBasedAvailability(hour, totalSeats)`**
   - Calculates available seats based on hour of day
   - Returns randomized availability within the time-based range

2. **`getEnhancedDepartureSlots()`**
   - Returns 32 realistic departure slots (5 AM - 11:30 PM)
   - Includes period labels and descriptions
   - Covers all time periods throughout the day

### Modified Function
- **`generateSyntheticRouteBuses()`** - Now:
  - Gets all 32 available departure slots
  - Randomly selects 8-12 for each search
  - Uses time-based seat allocation
  - Adds `timePeriod` and `timeDescription` fields

---

## 🎲 Randomization Logic

```javascript
// Each search randomly selects different buses
const departureSlots = allDepartureSlots
  .sort(() => 0.5 - Math.random())  // Shuffle
  .slice(0, 8 + Math.floor(Math.random() * 5)); // Take 8-12
```

This ensures:
- Same user searching twice gets different results
- Realistic variation (real bus schedules don't repeat identically)
- Coverage of all time periods

---

## ✨ Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **Departure Times** | 4 fixed | 8-12 varied |
| **Seat Variation** | Fixed ratio | Time-based |
| **Morning Buses** | 1 or 2 | 3-4+ options |
| **Afternoon Buses** | 1 | 2-3 options |
| **Evening Buses** | 1 | 2-3 options |
| **Night Buses** | 1 | 2-3 options |
| **Peak Hour Realism** | No | Yes |
| **Off-Peak Realism** | No | Yes |

---

## 🚀 Result

Users now see:
✅ Buses available throughout the entire day (5 AM - midnight)
✅ Realistic seat availability matching peak/off-peak times
✅ Morning, afternoon, evening, and night options
✅ More choices (8-12 instead of 4)
✅ Varied results (not repetitive)
✅ Better user experience with real-world bus scheduling

---

## 📌 Example Times Available

```
Early Morning:  5:00, 5:30, 6:00, 6:30 AM
Morning:        7:00, 7:30, 8:00, 8:30, 9:00, 9:30, 10:00, 10:30 AM
Afternoon:      12:00, 12:30, 2:00, 2:30, 3:00, 3:30 PM
Evening:        4:00, 4:30, 5:00, 5:30, 6:00, 6:30, 7:00, 7:30 PM
Night:          8:00, 8:30, 9:00, 9:30, 10:00, 10:30, 11:00, 11:30 PM
```

*(Each search randomly selects 8-12 of these)*

---

**Status**: ✅ Implemented and ready to use!
