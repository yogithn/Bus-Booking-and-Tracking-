const http = require('http');

const url = 'http://localhost:5000/api/buses/suggestions?q=Hyde&field=destination&from=Bangalore';

http.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('status:', res.statusCode);
    console.log('headers:', res.headers);
    console.log('body:', data);
  });
}).on('error', (err) => {
  console.error('error:', err.message);
});
