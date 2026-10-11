/**
 * Quick Test for Route Duration Service
 * Run with: node test-route-duration.js
 */

const {
  isReasonableDuration,
  formatDuration,
  getCoordinatesForCity
} = require('./src/services/routeDurationService');

console.log('🧪 Route Duration Service Tests\n');

// Test 1: isReasonableDuration
console.log('Test 1: isReasonableDuration()');
console.log('─'.repeat(50));

const testCases = [
  { duration: 330, distance: 250, expected: true, description: '250km in 5.5h (45km/h) ✓ Reasonable' },
  { duration: 5, distance: 250, expected: false, description: '250km in 5m (3000km/h) ✗ Too fast' },
  { duration: 1440, distance: 250, expected: false, description: '250km in 24h (10km/h) ✗ Too slow' },
  { duration: 120, distance: 100, expected: true, description: '100km in 2h (50km/h) ✓ Reasonable' },
  { duration: 120, distance: 20, expected: false, description: '20km in 2h (10km/h) ✗ Too slow (< 30km/h)' },
];

testCases.forEach((testCase) => {
  const result = isReasonableDuration(testCase.duration, testCase.distance);
  const status = result === testCase.expected ? '✓' : '✗';
  console.log(`${status} ${testCase.description}`);
  console.log(`   Result: ${result}, Expected: ${testCase.expected}`);
});

console.log('\n');

// Test 2: formatDuration
console.log('Test 2: formatDuration()');
console.log('─'.repeat(50));

const formatTests = [
  { duration: 330, expected: '5h 30m' },
  { duration: 120, expected: '2h' },
  { duration: 45, expected: '45m' },
  { duration: 360, expected: '6h' },
  { duration: 0, expected: 'N/A' },
];

formatTests.forEach((test) => {
  const result = formatDuration(test.duration);
  const status = result === test.expected ? '✓' : '✗';
  console.log(`${status} ${test.duration} minutes → "${result}" (expected: "${test.expected}")`);
});

console.log('\n');

// Test 3: getCoordinatesForCity
console.log('Test 3: getCoordinatesForCity()');
console.log('─'.repeat(50));

const cities = ['Bangalore', 'Mumbai', 'Delhi', 'Chennai', 'Mangalore', 'Margoa'];
cities.forEach((city) => {
  const coords = getCoordinatesForCity(city);
  console.log(`${city}: lat=${coords?.lat ?? 'N/A'}, lng=${coords?.lng ?? 'N/A'}`);
});

console.log('\n');

// Test 4: Duration Validation Logic
console.log('Test 4: Speed Calculation');
console.log('─'.repeat(50));

function calculateSpeed(distance, durationMinutes) {
  return Math.round((distance / (durationMinutes / 60)) * 100) / 100;
}

const speedTests = [
  { distance: 250, duration: 330, name: 'Bangalore to Goa' },
  { distance: 100, duration: 120, name: 'City trip' },
  { distance: 500, duration: 600, name: 'Long journey' },
];

speedTests.forEach((test) => {
  const speed = calculateSpeed(test.distance, test.duration);
  const isReasonable = isReasonableDuration(test.duration, test.distance);
  console.log(`${test.name}:`);
  console.log(`   Distance: ${test.distance}km, Duration: ${test.duration}m`);
  console.log(`   Speed: ${speed} km/h`);
  console.log(`   Reasonable: ${isReasonable ? '✓ Yes' : '✗ No'}`);
});

console.log('\n✅ All tests completed!\n');
