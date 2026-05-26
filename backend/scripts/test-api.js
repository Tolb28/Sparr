const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const jwt = require('jsonwebtoken');
const http = require('http');

// Generate test token
const SECRET = process.env.JWT_SECRET;
const userId = '23c45e90-5b1b-4cf6-af56-7ef62c73c68f';
const token = jwt.sign({ userId }, SECRET, { expiresIn: '1h' });

console.log('🔑 Test token for user:', userId);
console.log('\n📍 Testing API endpoint...\n');

// Test the recommendations API
const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/auth/training/recommendations?contentType=drills&limitPerType=8',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-profile-id': '19'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('✅ Response received:');
      console.log(JSON.stringify(parsed, null, 2));
      
      // Check reasons diversity
      if (parsed.data && parsed.data.drills) {
        console.log('\n📊 Reasons Analysis:');
        parsed.data.drills.slice(0, 5).forEach((drill, idx) => {
          console.log(`   Drill ${idx + 1} (${drill.name}):`);
          if (drill.reasons && Array.isArray(drill.reasons)) {
            console.log(`      Reasons: ${drill.reasons.join(', ')}`);
          }
        });
      }
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Error:', e.message);
});

req.end();
