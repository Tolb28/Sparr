const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

async function updateProfile() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log('👤 Updating test user profiles...');
    
    // Get a boxing style and weight class
    const styles = await pool.query('SELECT id_boxing_style FROM boxing_style LIMIT 1');
    const weights = await pool.query('SELECT id_weight_class FROM weight_class LIMIT 1');
    
    const styleId = styles.rows[0].id_boxing_style;
    const weightId = weights.rows[0].id_weight_class;
    
    // Update profile 19
    await pool.query(
      'UPDATE profiles SET boxing_style_id_boxing_style = $1, weight_class_id_weight_class = $2, height_cm = $3, experience_level = $4 WHERE id_profiles = 19',
      [styleId, weightId, 175, 'intermediate']
    );
    
    console.log('✅ Updated profile 19:');
    console.log('   - Boxing style ID: ' + styleId);
    console.log('   - Weight class ID: ' + weightId);
    console.log('   - Height: 175cm');
    console.log('   - Experience: intermediate');
    
    // Update a few more profiles
    const allProfiles = await pool.query('SELECT id_profiles FROM profiles LIMIT 5');
    for (const p of allProfiles.rows) {
      const newStyleId = styleId + (Math.random() > 0.5 ? 1 : 0);
      const newWeightId = weightId + (Math.random() > 0.5 ? 1 : 0);
      
      await pool.query(
        'UPDATE profiles SET boxing_style_id_boxing_style = $1, weight_class_id_weight_class = $2, height_cm = $3, experience_level = $4 WHERE id_profiles = $5',
        [newStyleId, newWeightId, 160 + Math.floor(Math.random() * 40), 'beginner', p.id_profiles]
      );
    }
    
    console.log('\n✅ Updated 5 profiles with varied data');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

updateProfile();
