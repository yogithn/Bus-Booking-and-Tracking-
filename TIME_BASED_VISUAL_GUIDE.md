# Time-Based Seat Allocation - Visual Guide

## System Flow Diagram

```
User Search Request
│
├─ from: Delhi
├─ to: Agra
└─ date: 2026-04-21
│
▼
┌─────────────────────────────────────────────────┐
│  GET /api/buses/schedule/time-periods           │
└─────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────┐
│ timeBasedAllocationService.getTimePeriodStats()                 │
│                                                                 │
│  Query Database:                                                │
│  - Find all buses for route on date                            │
│  - Group by timePeriod                                         │
│  - Calculate stats per period                                  │
└─────────────────────────────────────────────────────────────────┘
│
▼
┌────────────────────────────────────────────────────────────────────────┐
│ Response with Time Period Options                                      │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────┐  ┌──────────────────────┐                 │
│  │  🌅 MORNING          │  │  ☀️ AFTERNOON        │                 │
│  │  5AM - 11AM          │  │  12PM - 4PM          │                 │
│  │  3 buses available   │  │  2 buses available   │                 │
│  │  20/28 seats free    │  │  18/23 seats free    │                 │
│  │  Price: -5%          │  │  Price: -10%         │                 │
│  └──────────────────────┘  └──────────────────────┘                 │
│                                                                        │
│  ┌──────────────────────┐  ┌──────────────────────┐                 │
│  │  🌆 EVENING          │  │  🌙 NIGHT            │                 │
│  │  5PM - 8PM           │  │  9PM - 4AM           │                 │
│  │  4 buses available   │  │  2 buses available   │                 │
│  │  25/32 seats free    │  │  8/10 seats free     │                 │
│  │  Price: +25%         │  │  Price: +5%          │                 │
│  └──────────────────────┘  └──────────────────────┘                 │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────┐
│  User Selects Time Period (e.g., Evening)   │
└─────────────────────────────────────────────┘
│
▼
┌──────────────────────────────────────────────────┐
│  GET /api/buses/by-period/evening?...           │
└──────────────────────────────────────────────────┘
│
▼
┌──────────────────────────────────────────────────────────────────┐
│ Filter Buses by Time Period (Evening = 5PM-8PM)                  │
└──────────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────────┐
│ Return Filtered Buses                                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Bus 1: RedBus Premium - Volvo AC                                   │
│ ├─ Departure: 6:00 PM  │  Arrival: 10:00 PM                      │
│ ├─ Seats: 15 / 12 available                                       │
│ ├─ Price: ₹1,250  │  Rating: 4.5⭐                               │
│ └─ Features: Windows, AC, Charging                                │
│                                                                     │
│ Bus 2: Volvo Travels - AC Semi-Sleeper                           │
│ ├─ Departure: 6:30 PM  │  Arrival: 10:30 PM                      │
│ ├─ Seats: 15 / 10 available                                       │
│ ├─ Price: ₹1,200  │  Rating: 4.2⭐                               │
│ └─ Features: Windows, AC, WiFi                                    │
│                                                                     │
│ ... more buses ...                                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
│
▼
User Books Selected Bus & Time Period
```

---

## Seat Allocation Per Bus Example

**Total Seats: 45**

```
┌────────────────────────────────────────────────────┐
│  Seat Allocation Based on Demand Patterns          │
├────────────────────────────────────────────────────┤
│                                                    │
│  Morning   : ███████░░░░░░░░░░  (30%)  = 13 seats│
│  Afternoon : ██████░░░░░░░░░░░░ (25%)  = 11 seats│
│  Evening   : ███████████░░░░░░░ (35%)  = 15 seats│
│  Night     : ██░░░░░░░░░░░░░░░░ (10%)  =  6 seats│
│             ─────────────────────────────          │
│             Total:                  45 seats       │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## Dynamic Pricing Multiplier Chart

```
Price Multiplier by Time Period
│
│    1.3  ┌─────────┐
│         │         │
│    1.2  │         │
│         │         │
│    1.1  │         │ ┌─────────┐
│         │         │ │         │
│    1.0  │  ┌──────┴─┴────┐    │ ┌─────────┐
│         │  │              │    │ │         │
│    0.95 │  │              │    │ │         │
│         │  │              │    │ │         │
│    0.90 └──┴──────────────┴────┴─┴─────────┘
│        Morning  Afternoon  Evening  Night
│        5-11AM  12-4PM    5-8PM   9-4AM
│
│  0.90x (10% OFF) ─ Best for budget travelers
│  0.95x  (5% OFF) ─ Good for morning commuters
│  1.00x   (BASE)  ─ Night standard rate
│  1.05x  (5% ON)  ─ Night premium
│  1.25x (25% ON)  ─ Peak hours - Highest demand
```

---

## Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  TimeperiodFilter Component                         │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  • Fetches: GET /buses/schedule/time-periods       │   │
│  │  • Renders: 4 time period cards                     │   │
│  │  • On Select: GET /buses/by-period/:period         │   │
│  │  • Updates: Bus list with selected period buses    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                            ▲
                            │ HTTP Requests/Responses
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js)                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  API Routes (buses.js)                              │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  • GET /schedule/time-periods                       │   │
│  │  • GET /by-period/:timePeriod                       │   │
│  │  • GET /schedule/stats                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                 │
│                            ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Services Layer                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  • timeBasedAllocationService                       │   │
│  │    - getTimePeriodStats()                           │   │
│  │    - getTimePeriodFromDeparture()                   │   │
│  │    - allocateSeatsForPeriods()                      │   │
│  │                                                      │   │
│  │  • timeSlotUtils                                    │   │
│  │    - getPricingMultiplier()                         │   │
│  │    - calculateDynamicPrice()                        │   │
│  │    - formatTimePeriod()                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                 │
│                            ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Database Queries (Mongoose)                        │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  • Find buses by source, destination, date         │   │
│  │  • Filter by timePeriod                             │   │
│  │  • Group and aggregate for statistics              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                            ▲
                            │ MongoDB Queries
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                   DATABASE (MongoDB)                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  buses Collection                                   │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  {                                                  │   │
│  │    _id: ObjectId,                                   │   │
│  │    source: "Delhi",                                │   │
│  │    destination: "Agra",                            │   │
│  │    timePeriod: "evening",  ◄─── KEY FIELD         │   │
│  │    departure: 2026-04-21T18:00:00Z,                │   │
│  │    seatsAllocation: {                              │   │
│  │      morning: 13,                                  │   │
│  │      afternoon: 11,                                │   │
│  │      evening: 15,  ◄─── ALLOCATED SEATS           │   │
│  │      night: 6                                      │   │
│  │    },                                              │   │
│  │    seats: 15,                                      │   │
│  │    availableSeats: 12,                             │   │
│  │    price: 1250                                     │   │
│  │  }                                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Time Period Decision Tree

```
What time does user want to travel?

                ┌──────────────────┐
                │  Departure Hour  │
                └────────┬─────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ┌────────┐    ┌────────────┐    ┌─────────┐
    │ 5-11   │    │ 12-16      │    │ 17-20   │
    │ HOUR   │    │ HOUR       │    │ HOUR    │
    └───┬────┘    └─────┬──────┘    └────┬────┘
        │                │              │
        │                │              │
        ▼                ▼              ▼
    ┌────────┐    ┌────────────┐    ┌──────────┐
    │ MORNING│    │ AFTERNOON  │    │ EVENING  │
    │        │    │            │    │          │
    │ 30%    │    │ 25%        │    │ 35%      │
    │ Seats  │    │ Seats      │    │ Seats    │
    │ -5%    │    │ -10%       │    │ +25%     │
    │ Price  │    │ Price      │    │ Price    │
    └────────┘    └────────────┘    └──────────┘
        │                                  │
        └──────────────┬───────────────────┘
                       │
                       ▼
                (ANY OTHER HOUR)
                       │
                       ▼
                   ┌────────┐
                   │ NIGHT  │
                   │        │
                   │ 10%    │
                   │ Seats  │
                   │ +5%    │
                   │ Price  │
                   └────────┘
```

---

## Booking Process with Time Periods

```
Step 1: Search
┌──────────────────────────────┐
│ User enters:                 │
│ • From: Delhi                │
│ • To: Agra                   │
│ • Date: 2026-04-21           │
└────────────┬─────────────────┘
             │
             ▼
Step 2: View Time Periods
┌──────────────────────────────┐
│ System displays 4 cards:     │
│ • Morning: 3 buses           │
│ • Afternoon: 2 buses         │
│ • Evening: 4 buses  ◄─ Peak  │
│ • Night: 2 buses             │
└────────────┬─────────────────┘
             │
             ▼
Step 3: Select Time Period
┌──────────────────────────────┐
│ User clicks: EVENING         │
│ (Interested in peak hours)   │
└────────────┬─────────────────┘
             │
             ▼
Step 4: View Buses for Period
┌──────────────────────────────┐
│ Shows 4 evening buses:       │
│ • Bus 1: 6:00 PM - ₹1,250    │
│ • Bus 2: 6:30 PM - ₹1,200    │
│ • Bus 3: 7:00 PM - ₹1,300    │
│ • Bus 4: 7:30 PM - ₹1,250    │
└────────────┬─────────────────┘
             │
             ▼
Step 5: Select Specific Bus
┌──────────────────────────────┐
│ User chooses:                │
│ • Bus 2 (best price)         │
│ • Time: 6:30 PM              │
│ • 12 seats available         │
└────────────┬─────────────────┘
             │
             ▼
Step 6: Booking Confirmed
┌──────────────────────────────┐
│ ✓ Booking Complete!          │
│ • Price: ₹1,200              │
│ • Departure: 6:30 PM         │
│ • Confirmation: ABC123       │
└──────────────────────────────┘
```

---

## Occupancy Rate Visualization

```
Seat Occupancy by Time Period (Example Route)

Morning (30% allocated, 70% full):
████████████░░░░  OCCUPANCY: 70% ◄ Good availability

Afternoon (25% allocated, 95% full):
███████████████░░ OCCUPANCY: 95% ◄ Limited availability

Evening (35% allocated, 40% full):
██████░░░░░░░░░░░ OCCUPANCY: 40% ◄ Plenty available

Night (10% allocated, 20% full):
██░░░░░░░░░░░░░░░ OCCUPANCY: 20% ◄ Many available

Legend:
████ = Occupied seats
░░░░ = Available seats
```

---

## API Response Example Sequence

```
1. CLIENT REQUEST:
   GET /buses/schedule/time-periods?from=Delhi&to=Agra&date=2026-04-21

2. SERVER PROCESSING:
   • Query database for buses
   • Filter by route and date
   • Group by timePeriod
   • Calculate stats for each period

3. SERVER RESPONSE:
[
  {
    "period": "morning",
    "displayName": "Morning (05:00 - 11:00)",
    "availableBuses": 3,
    "totalSeats": 28,
    "availableSeats": 20,
    "occupancyRate": "0.29"
  },
  {
    "period": "evening",
    "displayName": "Evening (17:00 - 20:00)",
    "availableBuses": 4,
    "totalSeats": 32,
    "availableSeats": 13,
    "occupancyRate": "0.59"
  }
  // ... more periods
]

4. FRONTEND RENDERS:
   Four time period cards with statistics
   User can click to view specific period buses
```

---

## Price Calculation Example

```
BASE PRICE: ₹1000

Scenario 1: Morning Traveler
├─ Base Price: ₹1000
├─ Time Multiplier: 0.95 (5% off)
└─ Final Price: ₹1000 × 0.95 = ₹950 ✓ Cheapest

Scenario 2: Afternoon Traveler
├─ Base Price: ₹1000
├─ Time Multiplier: 0.90 (10% off)
└─ Final Price: ₹1000 × 0.90 = ₹900 ✓ Best Deal!

Scenario 3: Evening Traveler (Peak Hours)
├─ Base Price: ₹1000
├─ Time Multiplier: 1.25 (25% premium)
├─ Occupancy at 60%: 1.1x multiplier
└─ Final Price: ₹1000 × 1.25 × 1.1 = ₹1,375 (Most expensive)

Scenario 4: Night Traveler
├─ Base Price: ₹1000
├─ Time Multiplier: 1.05 (5% premium)
└─ Final Price: ₹1000 × 1.05 = ₹1,050
```

---

## Summary

This visual guide shows:
- ✅ How data flows through the system
- ✅ How time periods are decided
- ✅ How seats are allocated
- ✅ How prices are calculated
- ✅ How users interact with time periods
- ✅ Real example data and scenarios
