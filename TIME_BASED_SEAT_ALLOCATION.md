# Time-Based Bus Seat Allocation & Scheduling

## Overview
This system allocates bus seats and schedules buses according to different time periods throughout the day. It supports dynamic pricing based on demand patterns and provides APIs to query buses by time period.

## Features

### Time Periods
The system divides the day into four time periods:

1. **Morning** (5 AM - 11 AM)
   - Seat allocation: 30% of total
   - Use case: Morning commuters, early travelers
   - Pricing: 5-10% discount (off-peak)

2. **Afternoon** (12 PM - 4 PM)
   - Seat allocation: 25% of total
   - Use case: Low demand period
   - Pricing: 10% discount (lowest rates)

3. **Evening** (5 PM - 8 PM)
   - Seat allocation: 35% of total
   - Use case: Office rush, highest demand
   - Pricing: 25% premium (peak hours)

4. **Night** (9 PM - 4 AM)
   - Seat allocation: 10% of total
   - Use case: Overnight travelers
   - Pricing: 5% premium (night services)

## Database Schema

### Bus Model Updates
```javascript
{
  // Existing fields...
  timePeriod: 'morning' | 'afternoon' | 'evening' | 'night',
  seatsAllocation: {
    morning: Number,
    afternoon: Number,
    evening: Number,
    night: Number
  }
}
```

## API Endpoints

### 1. Get Available Time Periods for a Route
```
GET /buses/schedule/time-periods?from=Delhi&to=Agra&date=2026-04-21
```

**Response:**
```json
[
  {
    "period": "morning",
    "displayName": "Morning (05:00 - 11:00)",
    "name": "Morning",
    "startHour": 5,
    "endHour": 11,
    "description": "Early morning buses (5 AM - 11 AM)",
    "demandMultiplier": 1.2,
    "busesNeeded": 3,
    "availableBuses": 3,
    "totalSeats": 28,
    "availableSeats": 20,
    "occupancyRate": "0.29"
  },
  // More time periods...
]
```

### 2. Get Buses by Time Period
```
GET /buses/by-period/evening?from=Delhi&to=Agra&date=2026-04-21
```

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "route": "Delhi → Agra",
    "source": "Delhi",
    "destination": "Agra",
    "operator": "RedBus Premium",
    "busType": "AC Sleeper",
    "departure": "2026-04-21T18:00:00.000Z",
    "arrival": "2026-04-21T22:00:00.000Z",
    "durationMinutes": 240,
    "seats": 15,
    "availableSeats": 12,
    "price": 750,
    "timePeriod": "evening",
    "timePeriodDisplay": "Evening (17:00 - 20:00)",
    "pricePerSeat": 750
  },
  // More buses...
]
```

### 3. Get Time Period Statistics for a Route
```
GET /buses/schedule/stats?from=Delhi&to=Agra&date=2026-04-21
```

**Response:**
```json
{
  "route": "Delhi → Agra",
  "date": "2026-04-21",
  "timePeriodStats": {
    "morning": {
      "buses": 2,
      "totalSeats": 28,
      "availableSeats": 20
    },
    "afternoon": {
      "buses": 2,
      "totalSeats": 23,
      "availableSeats": 18
    },
    "evening": {
      "buses": 3,
      "totalSeats": 32,
      "availableSeats": 25
    },
    "night": {
      "buses": 2,
      "totalSeats": 10,
      "availableSeats": 8
    }
  },
  "summary": {
    "totalBuses": 9,
    "totalSeats": 93,
    "totalAvailable": 71
  }
}
```

## Services

### timeBasedAllocationService.js

**Functions:**

1. **getTimePeriodFromDeparture(departureTime)**
   - Determines time period based on departure time
   - Returns: 'morning' | 'afternoon' | 'evening' | 'night'

2. **allocateSeatsForPeriods(totalSeats)**
   - Allocates seats based on demand patterns
   - Returns: Object with seats per period

3. **getAvailableSeatsForPeriod(busId, date, timePeriod)**
   - Gets available seats for a specific time period
   - Returns: Promise<number>

4. **createBusesForMultipleTimeSlots(baseRoute)**
   - Creates buses for all time periods from base route
   - Returns: Array of bus objects

5. **getTimePeriodStats(source, destination, date)**
   - Gets statistics for all time periods on a route
   - Returns: Promise<Object> with stats

## Utilities

### timeSlotUtils.js

**Key Functions:**

- `getTimePeriodByHour(hour)` - Get period from hour
- `getPricingMultiplier(timePeriod)` - Get dynamic price multiplier
- `calculateDynamicPrice(basePrice, timePeriod, occupancyRate)` - Calculate price
- `generateDepartureTimes(timePeriod, baseDate, count)` - Generate departure times
- `formatTimePeriod(timePeriod)` - Format for display

## Usage Examples

### Example 1: Search Buses by Time Period (Frontend)

```javascript
// Get all time periods for a route
const response = await fetch(
  '/buses/schedule/time-periods?from=Delhi&to=Agra&date=2026-04-21'
);
const timePeriods = await response.json();

// Display time periods with available buses
timePeriods.forEach(period => {
  console.log(`${period.displayName}: ${period.availableBuses} buses available`);
});

// Get buses for selected time period
const selectedPeriod = 'evening';
const busesResponse = await fetch(
  `/buses/by-period/${selectedPeriod}?from=Delhi&to=Agra&date=2026-04-21`
);
const buses = await busesResponse.json();
```

### Example 2: Generate Test Data

```bash
# Run from server directory
node src/scripts/generateTimeBasedBusData.js
```

This generates:
- 10 popular routes
- 4 buses per route per day (one for each time period)
- Multiple departure times within each period
- Dynamic pricing based on time period

### Example 3: Check Route Availability

```javascript
// Get statistics for a specific date and route
const response = await fetch(
  '/buses/schedule/stats?from=Delhi&to=Agra&date=2026-04-21'
);
const stats = await response.json();

console.log(`Total available seats: ${stats.summary.totalAvailable}`);
console.log(`Evening buses: ${stats.timePeriodStats.evening.buses}`);
```

## Frontend Integration

### Display Time-Based Options

```javascript
// Component to show time period selection
function TimeperiodSelector({ from, to, date }) {
  const [timePeriods, setTimePeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  useEffect(() => {
    fetchTimePeriods();
  }, [from, to, date]);

  const fetchTimePeriods = async () => {
    try {
      const response = await fetch(
        `/buses/schedule/time-periods?from=${from}&to=${to}&date=${date}`
      );
      const data = await response.json();
      setTimePeriods(data);
    } catch (error) {
      console.error('Error fetching time periods:', error);
    }
  };

  return (
    <div className="time-period-selector">
      {timePeriods.map(period => (
        <div 
          key={period.period}
          className={`period-card ${selectedPeriod === period.period ? 'active' : ''}`}
          onClick={() => setSelectedPeriod(period.period)}
        >
          <h3>{period.displayName}</h3>
          <p>Buses available: {period.availableBuses}</p>
          <p>Available seats: {period.availableSeats}/{period.totalSeats}</p>
          <p className="occupancy">Occupancy: {Math.round(period.occupancyRate * 100)}%</p>
        </div>
      ))}
    </div>
  );
}
```

## Pricing Strategy

### Dynamic Pricing Formula
```
finalPrice = basePrice × timePeriodMultiplier × occupancyMultiplier
```

Where:
- **timePeriodMultiplier**: Based on demand pattern (0.9 - 1.3)
- **occupancyMultiplier**: 1 + (occupancyRate × 0.2), increases by 20% at full capacity

### Example Calculations
- Base price: ₹1000
- Morning (off-peak): ₹1000 × 0.95 = ₹950
- Evening (peak): ₹1000 × 1.25 = ₹1250
- With 50% occupancy on evening: ₹1250 × 1.1 = ₹1375

## Configuration

### Modify Time Periods
Edit `server/src/utils/timeSlotUtils.js`:

```javascript
const TIME_SLOTS = {
  morning: {
    name: 'Morning',
    startHour: 5,
    endHour: 11,
    demandMultiplier: 1.2,
    busCount: 3
  },
  // ... more periods
};
```

### Adjust Seat Allocation
Edit `allocateSeatsForPeriods()` in `timeBasedAllocationService.js`:

```javascript
function allocateSeatsForPeriods(totalSeats) {
  return {
    morning: Math.floor(totalSeats * 0.30),    // Change percentages as needed
    afternoon: Math.floor(totalSeats * 0.35),
    evening: Math.floor(totalSeats * 0.25),
    night: Math.floor(totalSeats * 0.10)
  };
}
```

## Database Migration

To add time periods to existing buses:

```javascript
// Update existing buses with time period based on departure time
db.buses.updateMany(
  { timePeriod: { $exists: false } },
  [
    {
      $set: {
        timePeriod: {
          $cond: [
            { $and: [
              { $gte: [{ $hour: "$departure" }, 5] },
              { $lt: [{ $hour: "$departure" }, 11] }
            ]},
            "morning",
            { $cond: [
              { $and: [
                { $gte: [{ $hour: "$departure" }, 12] },
                { $lt: [{ $hour: "$departure" }, 16] }
              ]},
              "afternoon",
              { $cond: [
                { $and: [
                  { $gte: [{ $hour: "$departure" }, 17] },
                  { $lt: [{ $hour: "$departure" }, 20] }
                ]},
                "evening",
                "night"
              ]}
            ]}
          ]
        }
      }
    }
  ]
);
```

## Testing

### Test Time Period Detection
```javascript
const { getTimePeriodFromDeparture } = require('./services/timeBasedAllocationService');

const morning = new Date('2026-04-21T07:00:00');
const evening = new Date('2026-04-21T18:00:00');

console.log(getTimePeriodFromDeparture(morning));  // 'morning'
console.log(getTimePeriodFromDeparture(evening));  // 'evening'
```

### Test Seat Allocation
```javascript
const { allocateSeatsForPeriods } = require('./services/timeBasedAllocationService');

const allocation = allocateSeatsForPeriods(45);
console.log(allocation);
// { morning: 13, afternoon: 11, evening: 15, night: 6 }
```

## Performance Considerations

1. **Indexing**: The `timePeriod` field is indexed for faster queries
2. **Query Optimization**: Use date ranges with time period filters
3. **Caching**: Consider caching time period stats for frequently searched routes
4. **Pagination**: Add pagination for routes with many buses

## Future Enhancements

- [ ] Data-based seat allocation using historical data
- [ ] Real-time dynamic pricing based on actual bookings
- [ ] SMS/Email notifications for low availability periods
- [ ] Special offers during off-peak times
- [ ] Weekend vs. weekday demand patterns
- [ ] Machine learning for demand forecasting
