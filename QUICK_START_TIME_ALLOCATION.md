# Time-Based Seat Allocation - Quick Implementation Guide

## What's Been Added

### 1. **Backend Changes**

#### Updated Bus Model (`server/src/models/Bus.js`)
- Added `timePeriod` field: 'morning' | 'afternoon' | 'evening' | 'night'
- Added `seatsAllocation` object for per-period seat counts

#### New Services
- **`timeBasedAllocationService.js`**: Core logic for seat allocation and time period management
- **`timeSlotUtils.js`**: Utility functions for pricing, time slots, and formatting

#### New Routes (`server/src/routes/buses.js`)
```
GET /buses/schedule/time-periods      - Get available time periods for a route
GET /buses/by-period/:timePeriod      - Get buses for a specific time period
GET /buses/schedule/stats             - Get statistics for a route by time period
```

#### Data Generation Script
- **`generateTimeBasedBusData.js`**: Generate test data with buses for different times

### 2. **Frontend Components**
- **`TimeperiodFilter.js`**: React component for displaying and selecting time periods
- **`TimeperiodFilter.css`**: Beautiful styling with responsive design

---

## Implementation Steps

### Step 1: Generate Test Data

```bash
# Navigate to server directory
cd server

# Make sure MongoDB is running, then run:
node src/scripts/generateTimeBasedBusData.js
```

**Output example:**
```
Connected to MongoDB
Generated 360 bus records

=== Generation Summary ===

Buses by Time Period:
  morning: 60 buses
  afternoon: 60 buses
  evening: 120 buses
  night: 60 buses

Top 5 Routes:
  Delhi → Agra: 36 buses
  Delhi → Jaipur: 36 buses
  Mumbai → Pune: 36 buses
  ...
```

### Step 2: Add TimeperiodFilter to Search Page

**In `client/src/pages/SearchResults.js` or similar:**

```javascript
import TimeperiodFilter from '../components/TimeperiodFilter';

function SearchResults() {
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [busesData, setBusesData] = useState([]);

  // ... existing search code ...

  const handlePeriodSelect = async (period) => {
    setSelectedPeriod(period);
    
    // Fetch buses for the selected period
    const response = await fetch(
      `/api/buses/by-period/${period}?from=${from}&to=${to}&date=${date}`
    );
    const buses = await response.json();
    setBusesData(buses);
  };

  return (
    <div className="search-results">
      <TimeperiodFilter 
        from={from}
        to={to}
        date={date}
        onPeriodSelect={handlePeriodSelect}
      />
      
      {/* Display filtered buses */}
      <div className="buses-list">
        {busesData.map(bus => (
          <BusCard key={bus._id} bus={bus} />
        ))}
      </div>
    </div>
  );
}
```

### Step 3: Test the API Endpoints

**Get Time Periods for a Route:**
```bash
curl "http://localhost:5000/api/buses/schedule/time-periods?from=Delhi&to=Agra&date=2026-04-21"
```

**Get Buses by Time Period:**
```bash
curl "http://localhost:5000/api/buses/by-period/evening?from=Delhi&to=Agra&date=2026-04-21"
```

**Get Route Statistics:**
```bash
curl "http://localhost:5000/api/buses/schedule/stats?from=Delhi&to=Agra&date=2026-04-21"
```

### Step 4: Verify Data in Database

```javascript
// In MongoDB shell
use bus-booking
db.buses.aggregate([
  { $match: { source: "Delhi", destination: "Agra" } },
  { $group: { 
      _id: "$timePeriod", 
      count: { $sum: 1 },
      totalSeats: { $sum: "$seats" }
    }
  }
])
```

---

## Time Periods Overview

| Period | Hours | Seats | Pricing | Use Case |
|--------|-------|-------|---------|----------|
| **Morning** | 5 AM - 11 AM | 30% | -5% | Commuters, early travelers |
| **Afternoon** | 12 PM - 4 PM | 25% | -10% | Low demand, best prices |
| **Evening** | 5 PM - 8 PM | 35% | +25% | Office rush, peak hours |
| **Night** | 9 PM - 4 AM | 10% | +5% | Overnight travelers |

---

## Dynamic Pricing Examples

Base price: ₹1000

| Time Period | Multiplier | Price |
|------------|-----------|-------|
| Morning | 0.95 | ₹950 |
| Afternoon | 0.90 | ₹900 |
| Evening | 1.25 | ₹1250 |
| Night | 1.05 | ₹1050 |

---

## Key Features

### ✅ Time-Based Seat Allocation
- Different seat quotas for each time period
- Automatically calculated based on demand patterns
- Example: 45-seat bus = 13 morning + 11 afternoon + 15 evening + 6 night seats

### ✅ Dynamic Pricing
- Peak hours (evening): 25% premium
- Off-peak (afternoon): 10% discount
- Adjustable based on occupancy rate

### ✅ Smart Statistics
- Real-time availability by time period
- Occupancy rate tracking
- Bus count per period

### ✅ User-Friendly Filter
- Visual time period selector
- Shows buses available, seats available
- Color-coded occupancy levels
- Responsive design

---

## API Response Examples

### Time Periods Response
```json
[
  {
    "period": "morning",
    "displayName": "Morning (05:00 - 11:00)",
    "name": "Morning",
    "availableBuses": 3,
    "totalSeats": 28,
    "availableSeats": 20,
    "occupancyRate": "0.29"
  },
  // ... more periods
]
```

### Buses by Period Response
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "route": "Delhi → Agra",
    "source": "Delhi",
    "destination": "Agra",
    "operator": "RedBus Premium",
    "departure": "2026-04-21T18:00:00.000Z",
    "seats": 15,
    "availableSeats": 12,
    "price": 750,
    "timePeriod": "evening",
    "timePeriodDisplay": "Evening (17:00 - 20:00)"
  }
]
```

---

## Database Schema

### Updated Bus Collection
```javascript
{
  _id: ObjectId,
  route: String,
  source: String,
  destination: String,
  operator: String,
  busType: String,
  departure: Date,
  arrival: Date,
  durationMinutes: Number,
  seats: Number,
  availableSeats: Number,
  price: Number,
  rating: Number,
  timePeriod: String,           // NEW
  seatsAllocation: {            // NEW
    morning: Number,
    afternoon: Number,
    evening: Number,
    night: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

---

## Customization Options

### Change Pricing Multipliers

Edit `server/src/utils/timeSlotUtils.js`:
```javascript
function getPricingMultiplier(timePeriod) {
  const multipliers = {
    morning: 1.1,      // Change from 1.1
    afternoon: 0.9,    // Change from 0.9
    evening: 1.3,      // Change from 1.3
    night: 1.0         // Change from 1.0
  };
  return multipliers[timePeriod] || 1.0;
}
```

### Adjust Seat Allocation

Edit `server/src/services/timeBasedAllocationService.js`:
```javascript
function allocateSeatsForPeriods(totalSeats) {
  const allocation = {
    morning: Math.floor(totalSeats * 0.30),    // Change percentage
    afternoon: Math.floor(totalSeats * 0.35),
    evening: Math.floor(totalSeats * 0.25),
    night: Math.floor(totalSeats * 0.10)
  };
  return allocation;
}
```

### Modify Time Period Hours

Edit `server/src/utils/timeSlotUtils.js`:
```javascript
const TIME_SLOTS = {
  morning: {
    name: 'Morning',
    startHour: 5,      // Change start hour
    endHour: 11,       // Change end hour
    demandMultiplier: 1.2,
    busCount: 3
  },
  // ... more periods
};
```

---

## Testing Checklist

- [ ] Existing buses updated with time periods
- [ ] New test data generated successfully
- [ ] Time periods API endpoint working
- [ ] Buses by period API endpoint working
- [ ] Statistics API endpoint working
- [ ] Frontend component displays correctly
- [ ] Time period filter responds to user selection
- [ ] Bus list updates when period changes
- [ ] Pricing reflects time period multipliers
- [ ] Occupancy calculations are accurate

---

## Troubleshooting

### Issue: API returns empty array
**Solution**: Run the data generation script to populate buses with time periods

### Issue: Time periods show 0 buses
**Solution**: Ensure selected date matches generated data date (run script today)

### Issue: Prices don't match expected values
**Solution**: Check the pricing multipliers in `timeSlotUtils.js`

### Issue: Component not displaying
**Solution**: Ensure API route is imported in `buses.js` and endpoint paths are correct

---

## Next Steps

1. ✅ Generate test data
2. ✅ Test API endpoints
3. ✅ Integrate frontend component
4. ⏳ Deploy to production
5. ⏳ Monitor seat allocation patterns
6. ⏳ Adjust multipliers based on real data

---

## Files Created/Modified

### New Files
- `server/src/services/timeBasedAllocationService.js`
- `server/src/utils/timeSlotUtils.js`
- `server/src/scripts/generateTimeBasedBusData.js`
- `client/src/components/TimeperiodFilter.js`
- `client/src/components/TimeperiodFilter.css`
- `TIME_BASED_SEAT_ALLOCATION.md` (Full documentation)

### Modified Files
- `server/src/models/Bus.js` (Added fields)
- `server/src/routes/buses.js` (Added endpoints)

---

## Performance Tips

1. **Add indexes** to frequently queried fields:
   ```javascript
   busSchema.index({ source: 1, destination: 1, timePeriod: 1 });
   busSchema.index({ departure: 1, timePeriod: 1 });
   ```

2. **Cache time period stats** for 15 minutes to reduce database queries

3. **Use pagination** when displaying buses:
   ```javascript
   GET /buses/by-period/evening?from=Delhi&to=Agra&page=1&limit=10
   ```

---

## Support

For issues or questions, refer to:
- Full documentation: `TIME_BASED_SEAT_ALLOCATION.md`
- Service code: `server/src/services/timeBasedAllocationService.js`
- Utils code: `server/src/utils/timeSlotUtils.js`
