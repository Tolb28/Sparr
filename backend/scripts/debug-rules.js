const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    console.log('🔍 Analyzing personalization rule matching:\n');
    
    // User profile data
    const userProfile = {
      boxing_style_id: 1,
      weight_class_id: 2,
      height_cm: 175,
      experience_level: 'intermediate'
    };
    
    console.log('👤 User Profile:');
    console.log(`   Style: ${userProfile.boxing_style_id}`);
    console.log(`   Weight: ${userProfile.weight_class_id}`);
    console.log(`   Height: ${userProfile.height_cm}cm`);
    console.log(`   Experience: ${userProfile.experience_level}`);
    
    // Check sample rules for drill 1
    console.log('\n📋 Sample rules for Drill 1:\n');
    const rules = await pool.query(`
      SELECT 
        id_content_personalization_rules,
        boxing_style_id,
        weight_class_id,
        min_height_cm,
        max_height_cm,
        min_experience_level,
        max_experience_level,
        is_active
      FROM content_personalization_rules 
      WHERE content_type = 'drill' 
        AND content_id = 1
      LIMIT 10
    `);
    
    rules.rows.forEach((rule, idx) => {
      console.log(`Rule ${idx + 1}:`);
      console.log(`  ID: ${rule.id_content_personalization_rules}`);
      console.log(`  Style: ${rule.boxing_style_id}`);
      console.log(`  Weight: ${rule.weight_class_id}`);
      console.log(`  Height range: ${rule.min_height_cm}-${rule.max_height_cm}`);
      console.log(`  Experience: ${rule.min_experience_level}-${rule.max_experience_level}`);
      console.log(`  Active: ${rule.is_active}`);
    });
    
    // Check how many rules would match this user
    console.log('\n🎯 Matching rules for this user:\n');
    const matches = await pool.query(`
      SELECT COUNT(DISTINCT content_id) as matched_content
      FROM content_personalization_rules
      WHERE is_active = true
        AND content_type = 'drill'
        AND (
          (boxing_style_id = $1 OR boxing_style_id IS NULL)
          AND (weight_class_id = $2 OR weight_class_id IS NULL)
          AND (min_height_cm IS NULL OR $3 >= min_height_cm)
          AND (max_height_cm IS NULL OR $3 <= max_height_cm)
          AND (min_experience_level IS NULL OR $4 >= min_experience_level)
          AND (max_experience_level IS NULL OR $4 <= max_experience_level)
        )
    `, [userProfile.boxing_style_id, userProfile.weight_class_id, userProfile.height_cm, userProfile.experience_level]);
    
    console.log(`Matched drill count: ${matches.rows[0].matched_content}`);
    
  } finally {
    await pool.end();
  }
})();
