const fs = require('fs');
const path = require('path');
const os = require('os');
const bcrypt = require('bcrypt');

require('ts-node/register/transpile-only');
const { pool } = require('../../src/config/db');

const FIXTURE_PATH = path.join(__dirname, '..', 'fixtures', 'test-data.json');
const RESULTS_DIR = path.join(__dirname, '..', 'results');
const ERROR_LOG_PATH = path.join(RESULTS_DIR, 'errors.log');

const DEFAULT_PASSWORD = 'TestPassword123!';

function ensureResultsDir() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

function logError(error, context) {
  ensureResultsDir();
  const message = `[${new Date().toISOString()}] ${context}: ${
    error?.stack || error
  }`;
  console.error(message);
  fs.appendFileSync(ERROR_LOG_PATH, `${message}${os.EOL}`);
}

function readFixture() {
  const raw = fs.readFileSync(FIXTURE_PATH, 'utf8');
  return JSON.parse(raw);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(array) {
  const copy = [...array];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function randomDateWithinDays(daysBack) {
  const now = Date.now();
  const offset = randomInt(0, daysBack) * 24 * 60 * 60 * 1000;
  const extra = randomInt(0, 24 * 60 * 60 * 1000);
  return new Date(now - offset - extra);
}

async function getEnumValues(client, tableName, columnName) {
  const result = await client.query(
    `
      SELECT e.enumlabel AS value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_attribute a ON a.atttypid = t.oid
      JOIN pg_class c ON a.attrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public'
        AND c.relname = $1
        AND a.attname = $2
      ORDER BY e.enumsortorder;
    `,
    [tableName, columnName]
  );
  return result.rows.map((row) => row.value);
}

async function ensureInteractionType(client) {
  const existing = await client.query(
    'SELECT id_interaction_type, title FROM interaction_type ORDER BY id_interaction_type'
  );
  if (existing.rows.length) {
    const likeRow = existing.rows.find(
      (row) => row.title?.toLowerCase() === 'like'
    );
    return likeRow?.id_interaction_type ?? existing.rows[0].id_interaction_type;
  }

  const inserted = await client.query(
    'INSERT INTO interaction_type (title) VALUES ($1), ($2) RETURNING id_interaction_type, title',
    ['like', 'comment']
  );
  return (
    inserted.rows.find((row) => row.title === 'like')?.id_interaction_type ||
    inserted.rows[0].id_interaction_type
  );
}

async function ensureTechniques(client) {
  const existing = await client.query(
    'SELECT id_techniques FROM techniques ORDER BY id_techniques'
  );
  if (existing.rows.length) {
    return existing.rows.map((row) => row.id_techniques);
  }

  const techniques = [
    'Jab',
    'Cross',
    'Hook',
    'Uppercut',
    'Slip',
    'Weave',
    'Parry',
    'Feint',
    'Pivot',
    'Check Hook',
  ];
  const values = techniques.map((name) => [name, 'Seeded technique']);
  const insertQuery = `
    INSERT INTO techniques (title, description)
    VALUES ${values.map((_, index) => `($${index * 2 + 1}, $${index * 2 + 2})`).join(', ')}
    RETURNING id_techniques
  `;
  const flatValues = values.flat();
  const inserted = await client.query(insertQuery, flatValues);
  return inserted.rows.map((row) => row.id_techniques);
}

async function ensureClubRole(client) {
  const existing = await client.query(
    'SELECT idclub_roles FROM club_roles ORDER BY idclub_roles'
  );
  if (existing.rows.length) {
    return existing.rows[0].idclub_roles;
  }

  const inserted = await client.query(
    'INSERT INTO club_roles (title, description) VALUES ($1, $2) RETURNING idclub_roles',
    ['Member', 'Default seeded role']
  );
  return inserted.rows[0].idclub_roles;
}

async function deleteByIdList(client, tableName, columnName, ids) {
  if (!ids.length) {
    return 0;
  }
  const result = await client.query(
    `DELETE FROM ${tableName} WHERE ${columnName} = ANY($1)`,
    [ids]
  );
  return result.rowCount;
}

async function deleteByConditions(client, tableName, conditions) {
  const clauses = [];
  const values = [];
  conditions.forEach(({ column, values: ids }) => {
    if (ids && ids.length) {
      values.push(ids);
      clauses.push(`${column} = ANY($${values.length})`);
    }
  });

  if (!clauses.length) {
    return 0;
  }

  const result = await client.query(
    `DELETE FROM ${tableName} WHERE ${clauses.join(' OR ')}`,
    values
  );
  return result.rowCount;
}

async function cleanupTestDataInternal(client) {
  const profilesResult = await client.query(
    "SELECT id_profiles, user_id FROM profiles WHERE username LIKE 'test_user_%'"
  );
  if (!profilesResult.rows.length) {
    return { deletedProfiles: 0 };
  }

  const profileIds = profilesResult.rows.map((row) => row.id_profiles);
  const userIds = profilesResult.rows.map((row) => row.user_id);

  const postsResult = await client.query(
    'SELECT posts_id_posts FROM profiles_posts WHERE profiles_id_profiles = ANY($1)',
    [profileIds]
  );
  const postIds = postsResult.rows.map((row) => row.posts_id_posts);

  const trainingResult = await client.query(
    'SELECT DISTINCT training_id FROM workout_completions WHERE profile_id = ANY($1) AND training_id IS NOT NULL',
    [profileIds]
  );
  const trainingIds = trainingResult.rows.map((row) => row.training_id);

  const clubsResult = await client.query(
    "SELECT idclubs FROM clubs WHERE title LIKE 'Test Club %' OR created_by_profile_id = ANY($1)",
    [profileIds]
  );
  const clubIds = clubsResult.rows.map((row) => row.idclubs);

  const summary = {
    deletedProfiles: profileIds.length,
    deletedWorkouts: 0,
    deletedInteractions: 0,
    deletedPosts: 0,
    deletedFriends: 0,
    deletedClubs: 0,
    deletedUsers: 0,
  };

  summary.deletedInteractions += await deleteByConditions(client, 'interactions', [
    { column: 'profiles_id_profiles', values: profileIds },
    { column: 'posts_id_posts', values: postIds },
  ]);

  await deleteByConditions(client, 'comments', [
    { column: 'id_profile', values: profileIds },
    { column: 'posts_id_posts', values: postIds },
  ]);

  await deleteByConditions(client, 'profiles_posts', [
    { column: 'profiles_id_profiles', values: profileIds },
    { column: 'posts_id_posts', values: postIds },
  ]);

  summary.deletedPosts += await deleteByIdList(client, 'posts', 'id_posts', postIds);

  await deleteByConditions(client, 'profiles_clubs', [
    { column: 'profiles_id_profiles', values: profileIds },
    { column: 'clubs_idclubs', values: clubIds },
  ]);
  await deleteByConditions(client, 'club_join_requests', [
    { column: 'profile_id', values: profileIds },
    { column: 'club_id', values: clubIds },
  ]);
  await deleteByConditions(client, 'club_trainings', [
    { column: 'club_id', values: clubIds },
  ]);

  summary.deletedClubs += await deleteByIdList(client, 'clubs', 'idclubs', clubIds);

  summary.deletedFriends += await deleteByConditions(client, 'friends', [
    { column: 'profiles_id_profiles', values: profileIds },
    { column: 'id_friend', values: profileIds },
  ]);

  summary.deletedWorkouts += await deleteByIdList(
    client,
    'workout_completions',
    'profile_id',
    profileIds
  );

  await deleteByIdList(
    client,
    'trainings_components',
    'id_trainings',
    trainingIds
  );
  await deleteByIdList(client, 'trainings', 'id_trainings', trainingIds);

  await deleteByIdList(
    client,
    'profile_progress_snapshots',
    'profile_id',
    profileIds
  );
  await deleteByIdList(
    client,
    'profiles_badges',
    'profiles_id_profiles',
    profileIds
  );

  await deleteByIdList(client, 'profiles', 'id_profiles', profileIds);
  summary.deletedUsers += await deleteByIdList(client, 'users', 'id', userIds);

  return summary;
}

async function cleanupTestData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const summary = await cleanupTestDataInternal(client);
    await client.query('COMMIT');
    return summary;
  } catch (error) {
    await client.query('ROLLBACK');
    logError(error, 'cleanupTestData');
    throw error;
  } finally {
    client.release();
  }
}

async function seedTestProfiles() {
  const fixture = readFixture();
  const client = await pool.connect();

  try {
    const existing = await client.query(
      "SELECT id_profiles FROM profiles WHERE username LIKE 'test_user_%'"
    );
    if (existing.rows.length) {
      await client.query('BEGIN');
      await cleanupTestDataInternal(client);
      await client.query('COMMIT');
    }

    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    const interactionTypeId = await ensureInteractionType(client);
    const techniqueIds = await ensureTechniques(client);
    const clubRoleId = await ensureClubRole(client);
    const clubRoleValues = await getEnumValues(client, 'profiles_clubs', 'role');
    const friendStatusValues = await getEnumValues(client, 'friends', 'status');
    const clubRoleValue = clubRoleValues[0];
    const friendStatusValue = friendStatusValues[0] ?? null;

    const createdProfiles = [];
    const profileByUsername = new Map();
    const profileConfigById = new Map();
    const postsByProfile = new Map();
    const workoutsSummary = [];
    const interactionsSummary = [];

    for (const profileConfig of fixture.profiles) {
      const email = `${profileConfig.username}@sparr.test`;
      const userResult = await client.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
        [email, passwordHash]
      );
      const userId = userResult.rows[0].id;

      const profileResult = await client.query(
        'INSERT INTO profiles (display_name, username, location, bio, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING id_profiles',
        [
          profileConfig.displayName,
          profileConfig.username,
          'Local Gym',
          `Seeded profile for ${profileConfig.displayName}`,
          userId,
        ]
      );
      const profileId = profileResult.rows[0].id_profiles;

      createdProfiles.push({
        id: profileId,
        username: profileConfig.username,
        skills: profileConfig.targetSkill,
      });
      profileByUsername.set(profileConfig.username, {
        id: profileId,
        config: profileConfig,
      });
      profileConfigById.set(profileId, profileConfig);
      postsByProfile.set(profileId, []);
    }

    const clubIds = [];
    if (fixture.clubs?.count) {
      const clubCount = Math.min(
        fixture.clubs.count,
        fixture.clubs.titles?.length || fixture.clubs.count
      );
      for (let index = 0; index < clubCount; index += 1) {
        const title =
          fixture.clubs.titles?.[index] || `Test Club ${index + 1}`;
        const ownerProfile =
          createdProfiles[index % createdProfiles.length]?.id ?? null;
        const clubResult = await client.query(
          'INSERT INTO clubs (title, bio, created_at, location, join_policy, created_by_profile_id, is_verified) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING idclubs',
          [
            title,
            'Seeded club for testing',
            new Date(),
            'Local City',
            fixture.clubs.joinPolicy || 'open',
            ownerProfile,
            false,
          ]
        );
        clubIds.push(clubResult.rows[0].idclubs);
      }
    }

    for (const profile of createdProfiles) {
      const profileConfig = profileByUsername.get(profile.username)?.config;
      if (!profileConfig) {
        continue;
      }

      const postIds = postsByProfile.get(profile.id) || [];
      for (let index = 0; index < profileConfig.posts; index += 1) {
        const postResult = await client.query(
          'INSERT INTO posts (description, source) VALUES ($1, $2) RETURNING id_posts',
          [`Seeded post ${index + 1} by ${profile.username}`, 'seed']
        );
        const postId = postResult.rows[0].id_posts;
        postIds.push(postId);
        await client.query(
          'INSERT INTO profiles_posts (profiles_id_profiles, posts_id_posts) VALUES ($1, $2)',
          [profile.id, postId]
        );
      }

      postsByProfile.set(profile.id, postIds);

      const workoutRanges = fixture.workoutRanges;
      for (let workoutIndex = 0; workoutIndex < profileConfig.workouts; workoutIndex += 1) {
        const durationMinutes = randomInt(
          workoutRanges.durationMinutes[0],
          workoutRanges.durationMinutes[1]
        );
        const componentsCount = randomInt(
          workoutRanges.components[0],
          workoutRanges.components[1]
        );
        const techniquesCount = Math.min(
          randomInt(workoutRanges.techniques[0], workoutRanges.techniques[1]),
          techniqueIds.length
        );
        const selectedTechniques = shuffle(techniqueIds).slice(
          0,
          techniquesCount
        );

        const trainingResult = await client.query(
          'INSERT INTO trainings (title, description) VALUES ($1, $2) RETURNING id_trainings',
          [
            `Test Workout ${profile.username} #${workoutIndex + 1}`,
            'Seeded workout plan',
          ]
        );
        const trainingId = trainingResult.rows[0].id_trainings;

        for (let componentIndex = 0; componentIndex < componentsCount; componentIndex += 1) {
          const sets = randomInt(1, 10);
          const reps = randomInt(5, 30);
          const length = Math.max(1, Math.round(durationMinutes / componentsCount));
          const techniqueId =
            selectedTechniques[componentIndex % selectedTechniques.length];
          await client.query(
            'INSERT INTO trainings_components (id_trainings, length, reps, sets, id_techniques, sort_order) VALUES ($1, $2, $3, $4, $5, $6)',
            [trainingId, length, reps, sets, techniqueId, componentIndex]
          );
        }

        await client.query(
          'INSERT INTO workout_completions (profile_id, training_id, completed_at, duration_seconds) VALUES ($1, $2, $3, $4)',
          [
            profile.id,
            trainingId,
            randomDateWithinDays(180),
            durationMinutes * 60,
          ]
        );

        workoutsSummary.push({
          profileId: profile.id,
          duration: durationMinutes,
          components: componentsCount,
        });
      }
    }

    const nonIsolatedPostIds = Array.from(postsByProfile.entries()).flatMap(
      ([profileId, postIds]) => {
        const profileConfig = profileConfigById.get(profileId);
        return profileConfig?.isolated ? [] : postIds;
      }
    );

    for (const profile of createdProfiles) {
      const profileConfig = profileByUsername.get(profile.username)?.config;
      if (!profileConfig || profileConfig.interactions <= 0) {
        interactionsSummary.push({
          profileId: profile.id,
          count: 0,
        });
        continue;
      }

      const availablePosts = nonIsolatedPostIds.filter((postId) => {
        const ownPosts = postsByProfile.get(profile.id) || [];
        return !ownPosts.includes(postId);
      });
      if (!availablePosts.length) {
        interactionsSummary.push({
          profileId: profile.id,
          count: 0,
        });
        continue;
      }

      for (let index = 0; index < profileConfig.interactions; index += 1) {
        const targetPost =
          availablePosts[randomInt(0, availablePosts.length - 1)];
        await client.query(
          'INSERT INTO interactions (posts_id_posts, profiles_id_profiles, interaction_type_idinteraction_type) VALUES ($1, $2, $3)',
          [targetPost, profile.id, interactionTypeId]
        );
      }
      interactionsSummary.push({
        profileId: profile.id,
        count: profileConfig.interactions,
      });
    }

    const friendProfiles = createdProfiles.filter((profile) => {
      const config = profileByUsername.get(profile.username)?.config;
      return !config?.isolated;
    });

    for (let index = 0; index < friendProfiles.length; index += 1) {
      for (let next = index + 1; next < friendProfiles.length; next += 1) {
        await client.query(
          'INSERT INTO friends (profiles_id_profiles, id_friend, status) VALUES ($1, $2, $3)',
          [friendProfiles[index].id, friendProfiles[next].id, friendStatusValue]
        );
      }
    }

    if (clubRoleValue && clubIds.length) {
      for (const profile of friendProfiles) {
        const clubId = clubIds[profile.id % clubIds.length];
        await client.query(
          'INSERT INTO profiles_clubs (profiles_id_profiles, clubs_idclubs, club_roles_idclub_roles, joined_at, role) VALUES ($1, $2, $3, $4, $5)',
          [profile.id, clubId, clubRoleId, new Date(), clubRoleValue]
        );
      }
    }

    await client.query('COMMIT');

    return {
      profiles: createdProfiles,
      workouts: workoutsSummary,
      interactions: interactionsSummary,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    logError(error, 'seedTestProfiles');
    throw error;
  } finally {
    client.release();
  }
}

async function getSeededData() {
  const profilesResult = await pool.query(
    "SELECT id_profiles, username FROM profiles WHERE username LIKE 'test_user_%' ORDER BY username"
  );
  const profiles = profilesResult.rows;

  const profileSummaries = await Promise.all(
    profiles.map(async (profile) => {
      const workoutsResult = await pool.query(
        'SELECT COUNT(*) FROM workout_completions WHERE profile_id = $1',
        [profile.id_profiles]
      );
      const interactionsResult = await pool.query(
        'SELECT COUNT(*) FROM interactions WHERE profiles_id_profiles = $1',
        [profile.id_profiles]
      );

      return {
        profileId: profile.id_profiles,
        username: profile.username,
        workouts: Number(workoutsResult.rows[0].count),
        interactions: Number(interactionsResult.rows[0].count),
      };
    })
  );

  return profileSummaries;
}

module.exports = {
  seedTestProfiles,
  cleanupTestData,
  getSeededData,
};

if (require.main === module) {
  const args = new Set(process.argv.slice(2));
  const cleanupOnly = args.has('--cleanup-only');

  const run = async () => {
    try {
      if (cleanupOnly) {
        const summary = await cleanupTestData();
        console.log('Cleanup complete:', summary);
      } else {
        const summary = await seedTestProfiles();
        console.log('Seed complete:', summary);
      }
    } catch (error) {
      logError(error, 'cli');
      process.exitCode = 1;
    } finally {
      await pool.end();
    }
  };

  run();
}
