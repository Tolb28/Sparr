const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

async function testRecommendations() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    // Get a test user
    const userResult = await pool.query('SELECT id_profiles FROM profiles LIMIT 1');
    const profileId = userResult.rows[0].id_profiles;
    
    console.log('🧪 Testing recommendations for profile ID: ' + profileId);
    
    // Check rules exist
    const rulesCheck = await pool.query('SELECT COUNT(*) as count FROM content_personalization_rules WHERE is_active = true');
    console.log('✅ Total active rules: ' + rulesCheck.rows[0].count);
    
    // Check if drills have rules
    const drillRules = await pool.query(`
      SELECT content_id, COUNT(*) as rule_count 
      FROM content_personalization_rules 
      WHERE content_type = 'drill' AND is_active = true 
      GROUP BY content_id 
      ORDER BY content_id
    `);
    console.log('\n📊 Rules by drill:');
    drillRules.rows.forEach(row => {
      console.log('   Drill ' + row.content_id + ': ' + row.rule_count + ' rules');
    });

    // Check what reasons would be generated for a user
    const userProfile = await pool.query(`
      SELECT 
        boxing_style_id_boxing_style,
        weight_class_id_weight_class,
        height_cm,
        experience_level
      FROM profiles
      WHERE id_profiles = $1
    `, [profileId]);
    
    console.log('\n👤 User profile:');
    const profile = userProfile.rows[0];
    console.log('   Style: ' + profile.boxing_style_id_boxing_style);
    console.log('   Weight: ' + profile.weight_class_id_weight_class);
    console.log('   Height: ' + profile.height_cm);
    console.log('   Experience: ' + profile.experience_level);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

testRecommendations();
