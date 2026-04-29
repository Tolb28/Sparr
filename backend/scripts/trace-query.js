const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const EXPERIENCE_RANK = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

(async () => {
  try {
    console.log('🧪 Testing exact backend query logic\n');
    
    const profileId = 19;
    
    // Step 1: Get profile context
    console.log('📋 Step 1: Get profile context');
    const profileResult = await pool.query(`
      SELECT
        id_profiles,
        boxing_style_id_boxing_style,
        weight_class_id_weight_class,
        height_cm,
        experience_level
      FROM profiles
      WHERE id_profiles = $1
    `, [profileId]);
    
    const profile = profileResult.rows[0];
    if (!profile) throw new Error('Profile not found');
    
    const styleId = profile.boxing_style_id_boxing_style ?? null;
    const weightClassId = profile.weight_class_id_weight_class ?? null;
    const heightCm = profile.height_cm ?? null;
    const experienceRank = profile.experience_level ? (EXPERIENCE_RANK[profile.experience_level] ?? null) : null;
    
    console.log(`  Style ID: ${styleId}`);
    console.log(`  Weight Class ID: ${weightClassId}`);
    console.log(`  Height: ${heightCm}cm`);
    console.log(`  Experience: ${profile.experience_level} (rank: ${experienceRank})`);
    
    // Step 2: Run the same query the backend would run
    console.log('\n📋 Step 2: Run recommendations query');
    
    const query = `
    WITH rule_matches AS (
      SELECT
        r.content_id,
        SUM(
          CASE
            WHEN
              (r.boxing_style_id IS NULL OR ($2::integer IS NOT NULL AND r.boxing_style_id = $2::integer))
              AND (r.weight_class_id IS NULL OR ($3::integer IS NOT NULL AND r.weight_class_id = $3::integer))
              AND (r.min_height_cm IS NULL OR ($4::integer IS NOT NULL AND $4::integer >= r.min_height_cm))
              AND (r.max_height_cm IS NULL OR ($4::integer IS NOT NULL AND $4::integer <= r.max_height_cm))
              AND (
                r.min_experience_level IS NULL OR (
                  $5::integer IS NOT NULL AND $5::integer >= (
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
                  $5::integer IS NOT NULL AND $5::integer <= (
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
          AND $2::integer IS NOT NULL
          AND r.boxing_style_id = $2::integer
        ) AS reason_style,
        BOOL_OR(
          r.weight_class_id IS NOT NULL
          AND $3::integer IS NOT NULL
          AND r.weight_class_id = $3::integer
        ) AS reason_weight,
        BOOL_OR(
          (r.min_height_cm IS NOT NULL OR r.max_height_cm IS NOT NULL)
          AND $4::integer IS NOT NULL
          AND (r.min_height_cm IS NULL OR $4::integer >= r.min_height_cm)
          AND (r.max_height_cm IS NULL OR $4::integer <= r.max_height_cm)
        ) AS reason_height,
        BOOL_OR(
          (r.min_experience_level IS NOT NULL OR r.max_experience_level IS NOT NULL)
          AND $5::integer IS NOT NULL
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
    
    const result = await pool.query(query, [
      'drill',
      styleId,
      weightClassId,
      heightCm,
      experienceRank,
    ]);
    
    console.log(`  Found ${result.rows.length} drills with reasons\n`);
    
    result.rows.forEach(row => {
      const reasons = [];
      if (row.reason_style) reasons.push('match_style');
      if (row.reason_weight) reasons.push('match_weight');
      if (row.reason_height) reasons.push('match_height');
      if (row.reason_experience) reasons.push('match_experience');
      
      console.log(`Drill ${row.content_id}:`);
      console.log(`  Rule Score: ${row.rule_score}`);
      console.log(`  Reasons: ${reasons.length > 0 ? reasons.join(', ') : 'fallback_popularity'}`);
    });
    
  } finally {
    await pool.end();
  }
})();
