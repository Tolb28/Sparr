const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const jwt = require('jsonwebtoken');
const http = require('http');

// Generate test token for a few different users
async function testUser(userId, profileId) {
  return new Promise((resolve, reject) => {
    const SECRET = process.env.JWT_SECRET;
    const token = jwt.sign({ userId }, SECRET, { expiresIn: '1h' });

    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/training/recommendations?contentType=drills&limitPerType=3',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-profile-id': profileId.toString()
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
          if (parsed.success && parsed.recommendations.drills.length > 0) {
            console.log(`\n✅ Profile ${profileId}:`);
            parsed.recommendations.drills.slice(0, 3).forEach((drill, idx) => {
              const reasonLabels = drill.reasons.map(r => {
                const map = {
                  'match_style': 'Your style',
                  'match_weight': 'Your weight class',
                  'match_height': 'Your height',
                  'match_experience': 'Your level',
                  'popular_with_community': 'Popular',
                  'fallback_popularity': 'Trending'
                };
                return map[r] || r;
              });
              console.log(`   ${idx + 1}. ${drill.title}: ${reasonLabels.join(', ')}`);
            });
            resolve();
          } else {
            console.log(`❌ Profile ${profileId}: No recommendations or error`);
            resolve();
          }
        } catch (e) {
          console.log(`❌ Profile ${profileId}: Parse error -`, e.message);
          resolve();
        }
      });
    });

    req.on('error', (e) => {
      console.log(`❌ Profile ${profileId}: ${e.message}`);
      resolve();
    });

    req.end();
  });
}

(async () => {
  console.log('🧪 Testing recommendations for multiple profiles\n');
  
  // Test with profile 19 (has style, weight, height, experience)
  await testUser('23c45e90-5b1b-4cf6-af56-7ef62c73c68f', 19);
  
  // Wait a bit between requests
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Test with another profile
  await testUser('03f68f63-cd36-4321-bf72-f711ff0d8aa0', 21);
  
  console.log('\n✨ Test completed!\n');
  process.exit(0);
})();
