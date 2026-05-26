const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    console.log('🔍 Debugging recommendation query execution:\n');
    
    // User profile data
    const profileId = 19;
    const userProfile = {
      boxing_style_id: 1,
      weight_class_id: 2,
      height_cm: 175,
      experience_level: 'intermediate',
      experience_rank: 2
    };
    
    console.log('👤 User Profile:');
    console.log(`   ID: ${profileId}`);
    console.log(`   Style: ${userProfile.boxing_style_id}`);
    console.log(`   Weight: ${userProfile.weight_class_id}`);
    console.log(`   Height: ${userProfile.height_cm}cm`);
    console.log(`   Experience: ${userProfile.experience_level} (rank ${userProfile.experience_rank})`);
    
    // Test the rule_matches CTE logic
    console.log('\n🎯 Testing rule_matches CTE for Drills:\n');
    
    const testQuery = `
      WITH rule_matches AS (
        SELECT
          r.content_id,
          SUM(
            CASE
              WHEN
                (r.boxing_style_id IS NULL OR ($2 IS NOT NULL AND r.boxing_style_id = $2))
                AND (r.weight_class_id IS NULL OR ($3 IS NOT NULL AND r.weight_class_id = $3))
                AND (r.min_height_cm IS NULL OR ($4 IS NOT NULL AND $4 >= r.min_height_cm))
                AND (r.max_height_cm IS NULL OR ($4 IS NOT NULL AND $4 <= r.max_height_cm))
                AND (
                  r.min_experience_level IS NULL OR (
                    $5 IS NOT NULL AND $5 >= (
                      CASE r.min_experience_level
                        WHEN 'beginner' THEN 1
                        WHEN 'intermediate' THEN 2
                        WHEN 'advanced' THEN 3
                        ELSE NULL
                      END
                    )
                  )
                )
                AND (
                  r.max_experience_level IS NULL OR (
                    $5 IS NOT NULL AND $5 <= (
                      CASE r.max_experience_level
                        WHEN 'beginner' THEN 1
                        WHEN 'intermediate' THEN 2
                        WHEN 'advanced' THEN 3
                        ELSE NULL
                      END
                    )
                  )
                )
              THEN COALESCE(r.boost_score, 0)
              ELSE 0
            END
          )::int AS rule_score,
          BOOL_OR(
            r.boxing_style_id IS NOT NULL
            AND $2 IS NOT NULL
            AND r.boxing_style_id = $2
          ) AS reason_style,
          BOOL_OR(
            r.weight_class_id IS NOT NULL
            AND $3 IS NOT NULL
            AND r.weight_class_id = $3
          ) AS reason_weight,
          BOOL_OR(
            (r.min_height_cm IS NOT NULL OR r.max_height_cm IS NOT NULL)
            AND $4 IS NOT NULL
            AND (r.min_height_cm IS NULL OR $4 >= r.min_height_cm)
            AND (r.max_height_cm IS NULL OR $4 <= r.max_height_cm)
          ) AS reason_height,
          BOOL_OR(
            (r.min_experience_level IS NOT NULL OR r.max_experience_level IS NOT NULL)
            AND $5 IS NOT NULL
          ) AS reason_experience
        FROM content_personalization_rules r
        WHERE r.content_type = $1
          AND r.is_active = true
        GROUP BY r.content_id
      )
      SELECT 
        rm.content_id,
        rm.rule_score,
        rm.reason_style,
        rm.reason_weight,
        rm.reason_height,
        rm.reason_experience
      FROM rule_matches rm
      WHERE rm.content_id IN (1, 2, 3, 4, 5)
      ORDER BY rm.content_id
    `;
    
    const result = await pool.query(testQuery, [
      'drill',
      userProfile.boxing_style_id,
      userProfile.weight_class_id,
      userProfile.height_cm,
      userProfile.experience_rank
    ]);
    
    result.rows.forEach(row => {
      console.log(`Drill ${row.content_id}:`);
      console.log(`  Rule Score: ${row.rule_score}`);
      console.log(`  Reasons: ${[
        row.reason_style && 'match_style',
        row.reason_weight && 'match_weight',
        row.reason_height && 'match_height',
        row.reason_experience && 'match_experience'
      ].filter(Boolean).join(', ') || 'NONE'}`);
    });
    
  } finally {
    await pool.end();
  }
})();
