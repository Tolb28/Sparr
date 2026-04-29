const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    console.log('📊 Checking user-profile relationships:\n');
    
    const result = await pool.query('SELECT id_profiles, user_id FROM profiles LIMIT 10');
    result.rows.forEach(row => {
      console.log(`  Profile ${row.id_profiles} -> User ${row.user_id}`);
    });
    
    console.log('\n📊 Checking profile 19 details:\n');
    const profile19 = await pool.query(`
      SELECT 
        id_profiles, 
        user_id,
        boxing_style_id_boxing_style,
        weight_class_id_weight_class,
        height_cm,
        experience_level
      FROM profiles 
      WHERE id_profiles = 19
    `);
    
    if (profile19.rows[0]) {
      const p = profile19.rows[0];
      console.log(`  Profile ID: ${p.id_profiles}`);
      console.log(`  User ID: ${p.user_id}`);
      console.log(`  Style: ${p.boxing_style_id_boxing_style}`);
      console.log(`  Weight: ${p.weight_class_id_weight_class}`);
      console.log(`  Height: ${p.height_cm}cm`);
      console.log(`  Experience: ${p.experience_level}`);
    }
    
  } finally {
    await pool.end();
  }
})();
