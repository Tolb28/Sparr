const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    console.log('🔍 Simple reason_weight test:\n');
    
    const styleId = 1;
    const weightId = 2;
    const heightCm = 175;
    const expRank = 2;
    
    // Look at rules for drill 1 that should match weight 2
    const result = await pool.query(`
      SELECT 
        id_content_personalization_rules as rule_id,
        content_id,
        boxing_style_id,
        weight_class_id,
        min_height_cm,
        max_height_cm,
        min_experience_level,
        max_experience_level,
        boost_score
      FROM content_personalization_rules 
      WHERE content_type = 'drill'
        AND content_id = 1
        AND weight_class_id = $1
        AND is_active = true
      LIMIT 5
    `, [weightId]);
    
    console.log(`Rules for Drill 1 with weight_class_id = ${weightId}:`);
    if (result.rows.length === 0) {
      console.log('  NO RULES FOUND!');
    } else {
      result.rows.forEach(row => {
        console.log(`\nRule ${row.rule_id}:`);
        console.log(`  Content: ${row.content_id}`);
        console.log(`  Style: ${row.boxing_style_id}`);
        console.log(`  Weight: ${row.weight_class_id}`);
        console.log(`  Height: ${row.min_height_cm}-${row.max_height_cm}`);
        console.log(`  Experience: ${row.min_experience_level}-${row.max_experience_level}`);
        console.log(`  Boost: ${row.boost_score}`);
      });
    }
    
    // Now check if a basic query would find this rule
    console.log('\n\n✅ Test parameters:');
    console.log(`  Style: ${styleId}`);
    console.log(`  Weight: ${weightId}`);
    console.log(`  Height: ${heightCm}cm`);
    console.log(`  Experience Rank: ${expRank}`);
    
  } finally {
    await pool.end();
  }
})();
