import { pool } from '../config/db';
import { cloudinaryService } from './cloudinaryService';
import { recalculateProfileGamification } from './gamificationService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALLOWED_ROLES = ['owner', 'admin', 'coach', 'member'] as const;
type MemberRole = typeof ALLOWED_ROLES[number];

export async function getProfileIdForUser(userId: string | number) {
  const { rows } = await pool.query(
    'SELECT id_profiles FROM profiles WHERE user_id = $1 AND (is_club_profile = false OR is_club_profile IS NULL) LIMIT 1',
    [userId]
  );
  return rows[0]?.id_profiles ?? null;
}

async function getRoleTypeName(): Promise<string | null> {
  const { rows } = await pool.query(
    `SELECT udt_name
     FROM information_schema.columns
     WHERE table_schema='public' AND table_name='profiles_clubs' AND column_name='role'
     LIMIT 1`
  );
  return rows[0]?.udt_name ?? null;
}

async function pickEnumRole(preferred: string): Promise<string | null> {
  const typeName = await getRoleTypeName();
  if (!typeName) return null;

  const { rows: preferredRows } = await pool.query(
    `SELECT e.enumlabel
     FROM pg_enum e
     JOIN pg_type t ON t.oid = e.enumtypid
     WHERE t.typname = $1 AND LOWER(e.enumlabel) = LOWER($2)
     LIMIT 1`,
    [typeName, preferred]
  );
  if (preferredRows[0]?.enumlabel) return preferredRows[0].enumlabel;

  const { rows: fallbackRows } = await pool.query(
    `SELECT e.enumlabel
     FROM pg_enum e
     JOIN pg_type t ON t.oid = e.enumtypid
     WHERE t.typname = $1
     ORDER BY e.enumsortorder
     LIMIT 1`,
    [typeName]
  );

  return fallbackRows[0]?.enumlabel ?? null;
}

async function getOrCreateClubRoleId(preferredTitle: string) {
  const { rows } = await pool.query(
    `SELECT idclub_roles FROM club_roles WHERE LOWER(title) = LOWER($1) LIMIT 1`,
    [preferredTitle]
  );
  if (rows[0]?.idclub_roles) return rows[0].idclub_roles;

  const { rows: created } = await pool.query(
    `INSERT INTO club_roles (title, description) VALUES ($1, $2) RETURNING idclub_roles`,
    [preferredTitle, `${preferredTitle} role`]
  );

  return created[0].idclub_roles;
}

export async function listClubs(params: {
  query?: string;
  location?: string;
  joinPolicy?: string;
  verified?: boolean | null;
  limit: number;
  offset: number;
  viewerProfileId?: number | null;
}) {
  const { query, location, joinPolicy, verified, limit, offset, viewerProfileId } = params;
  const values: any[] = [];
  let idx = 1;

  const whereParts: string[] = [];
  if (query && query.trim()) {
    whereParts.push(`c.title ILIKE $${idx}`);
    values.push(`%${query.trim()}%`);
    idx++;
  }
  if (location && location.trim()) {
    whereParts.push(`c.location ILIKE $${idx}`);
    values.push(`%${location.trim()}%`);
    idx++;
  }
  if (joinPolicy && joinPolicy.trim()) {
    whereParts.push(`c.join_policy = $${idx}`);
    values.push(joinPolicy.trim());
    idx++;
  }
  if (verified === true || verified === false) {
    whereParts.push(`c.is_verified = $${idx}`);
    values.push(verified);
    idx++;
  }

  const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

  values.push(viewerProfileId ?? null);
  const viewerParam = idx;
  idx++;

  values.push(limit);
  const limitParam = idx;
  idx++;

  values.push(offset);
  const offsetParam = idx;

  const sql = `
    SELECT
      c.*,
      COUNT(pc.profiles_id_profiles)::int AS members_count,
      CASE
        WHEN $${viewerParam}::bigint IS NULL THEN 'none'
        WHEN EXISTS (
          SELECT 1 FROM profiles_clubs pc2
          WHERE pc2.clubs_idclubs = c.idclubs AND pc2.profiles_id_profiles = $${viewerParam}::bigint
        ) THEN 'member'
        WHEN EXISTS (
          SELECT 1 FROM club_join_requests r
          WHERE r.club_id = c.idclubs AND r.profile_id = $${viewerParam}::bigint AND r.status = 'pending'
        ) THEN 'requested'
        ELSE 'none'
      END AS join_status
    FROM clubs c
    LEFT JOIN profiles_clubs pc ON pc.clubs_idclubs = c.idclubs
    ${whereClause}
    GROUP BY c.idclubs
    ORDER BY c.created_at DESC NULLS LAST, c.idclubs DESC
    LIMIT $${limitParam} OFFSET $${offsetParam}
  `;

  const { rows } = await pool.query(sql, values);
  return rows.map((row) => ({
    ...row,
    avatar_url: row.avatar_path ? cloudinaryService.generateAvatarUrl(row.avatar_path, row.updated_at) : null,
    cover_url: row.cover_path ? cloudinaryService.generateAvatarUrl(row.cover_path, row.updated_at) : null,
  }));
}

export async function getClubById(clubId: number, viewerProfileId?: number | null) {
  const { rows } = await pool.query(
    `SELECT
      c.*,
      COUNT(pc.profiles_id_profiles)::int AS members_count,
      CASE
        WHEN $2::bigint IS NULL THEN 'none'
        WHEN EXISTS (
          SELECT 1 FROM profiles_clubs pc2
          WHERE pc2.clubs_idclubs = c.idclubs AND pc2.profiles_id_profiles = $2
        ) THEN 'member'
        WHEN EXISTS (
          SELECT 1 FROM club_join_requests r
          WHERE r.club_id = c.idclubs AND r.profile_id = $2 AND r.status = 'pending'
        ) THEN 'requested'
        ELSE 'none'
      END AS join_status
     FROM clubs c
     LEFT JOIN profiles_clubs pc ON pc.clubs_idclubs = c.idclubs
     WHERE c.idclubs = $1
     GROUP BY c.idclubs`,
    [clubId, viewerProfileId ?? null]
  );

  const club = rows[0];
  if (!club) return null;

  const { rows: coaches } = await pool.query(
    `SELECT p.id_profiles, p.display_name, p.username, p.avatar, p.updated_at,
            COALESCE(cr.title, pc.role::text) AS role_title
     FROM profiles_clubs pc
     JOIN profiles p ON p.id_profiles = pc.profiles_id_profiles
     LEFT JOIN club_roles cr ON cr.idclub_roles = pc.club_roles_idclub_roles
     WHERE pc.clubs_idclubs = $1
       AND (LOWER(COALESCE(cr.title, '')) IN ('owner','admin','coach') OR LOWER(pc.role::text) IN ('owner','admin','coach'))
     ORDER BY p.display_name ASC
     LIMIT 20`,
    [clubId]
  );

  // posts_count via club profile
  let postsCount = 0;
  let trainingPlansCount = 0;
  if (club.club_profile_id) {
    const [postsCntResult, plansCntResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS cnt FROM profiles_posts WHERE profiles_id_profiles = $1`,
        [club.club_profile_id]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS cnt FROM profiles_training_calendar WHERE profiles_id_profiles = $1`,
        [club.club_profile_id]
      ),
    ]);
    postsCount = postsCntResult.rows[0]?.cnt ?? 0;
    trainingPlansCount = plansCntResult.rows[0]?.cnt ?? 0;
  }

  let viewerRole: string | null = null;
  let canManage = false;
  if (viewerProfileId) {
    const { rows: viewerRows } = await pool.query(
      `SELECT COALESCE(cr.title, pc.role::text) AS role_title
       FROM profiles_clubs pc
       LEFT JOIN club_roles cr ON cr.idclub_roles = pc.club_roles_idclub_roles
       WHERE pc.clubs_idclubs = $1 AND pc.profiles_id_profiles = $2
       LIMIT 1`,
      [clubId, viewerProfileId]
    );
    viewerRole = viewerRows[0]?.role_title ?? null;
    canManage = ['owner', 'admin'].includes(String(viewerRole || '').toLowerCase());
  }

  return {
    ...club,
    avatar_url: club.avatar_path ? cloudinaryService.generateAvatarUrl(club.avatar_path, club.updated_at) : null,
    cover_url: club.cover_path ? cloudinaryService.generateAvatarUrl(club.cover_path, club.updated_at) : null,
    viewer_role: viewerRole,
    can_manage: canManage,
    posts_count: postsCount,
    training_plans_count: trainingPlansCount,
    coaches: coaches.map((coach) => ({
      ...coach,
      avatar_url: coach.avatar ? cloudinaryService.generateAvatarUrl(coach.avatar, coach.updated_at) : null,
    })),
  };
}

export async function createClub(params: {
  userId: string | number;
  profileId?: number | null;
  title: string;
  bio?: string | null;
  location?: string | null;
  avatar_path?: string | null;
  cover_path?: string | null;
  join_policy?: string | null;
  instagram_url?: string | null;
  website_url?: string | null;
}) {
  const profileId = params.profileId || (await getProfileIdForUser(params.userId));
  if (!profileId) throw new Error('Profile required');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO clubs (title, bio, avatar_path, created_at, updated_at, location, join_policy, created_by_profile_id, cover_path, instagram_url, website_url)
       VALUES ($1, $2, $3, NOW(), NOW(), $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        params.title,
        params.bio ?? null,
        params.avatar_path ?? null,
        params.location ?? null,
        params.join_policy ?? 'open',
        profileId,
        params.cover_path ?? null,
        params.instagram_url ?? null,
        params.website_url ?? null,
      ]
    );

    const club = rows[0];

    // Auto-create a club profile so the club can author posts & own training plans
    const clubSlug = `club_${club.idclubs}`;
    const { rows: existingProfile } = await client.query(
      `SELECT id_profiles FROM profiles WHERE username = $1 LIMIT 1`,
      [clubSlug]
    );

    let clubProfileId: number;
    if (existingProfile[0]) {
      clubProfileId = existingProfile[0].id_profiles;
    } else {
      // Get the creator's user_id from their profile
      const { rows: creatorRows } = await client.query(
        `SELECT user_id FROM profiles WHERE id_profiles = $1 LIMIT 1`,
        [profileId]
      );
      const creatorUserId = creatorRows[0]?.user_id;
      if (creatorUserId) {
        const { rows: newProfile } = await client.query(
          `INSERT INTO profiles (display_name, username, user_id, is_club_profile, avatar, created_at, updated_at)
           VALUES ($1, $2, $3, true, $4, NOW(), NOW())
           RETURNING id_profiles`,
          [params.title, clubSlug, creatorUserId, params.avatar_path ?? null]
        );
        clubProfileId = newProfile[0].id_profiles;

        await client.query(
          `UPDATE clubs SET club_profile_id = $1 WHERE idclubs = $2`,
          [clubProfileId, club.idclubs]
        );
        club.club_profile_id = clubProfileId;
      }
    }

    const ownerRoleId = await getOrCreateClubRoleId('Owner');
    const ownerRoleEnum = await pickEnumRole('owner');

    if (ownerRoleEnum) {
      await client.query(
        `INSERT INTO profiles_clubs (profiles_id_profiles, clubs_idclubs, club_roles_idclub_roles, joined_at, role)
         VALUES ($1, $2, $3, NOW(), $4)
         ON CONFLICT DO NOTHING`,
        [profileId, club.idclubs, ownerRoleId, ownerRoleEnum]
      );
    }

    await client.query('COMMIT');
    return club;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateClub(params: {
  clubId: number;
  title?: string;
  bio?: string | null;
  location?: string | null;
  avatar_path?: string | null;
  cover_path?: string | null;
  join_policy?: string | null;
  is_verified?: boolean;
  instagram_url?: string | null;
  website_url?: string | null;
}) {
  const updates: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (params.title !== undefined) {
    updates.push(`title = $${idx}`);
    values.push(params.title);
    idx++;
  }
  if (params.bio !== undefined) {
    updates.push(`bio = $${idx}`);
    values.push(params.bio);
    idx++;
  }
  if (params.location !== undefined) {
    updates.push(`location = $${idx}`);
    values.push(params.location);
    idx++;
  }
  if (params.avatar_path !== undefined) {
    updates.push(`avatar_path = $${idx}`);
    values.push(params.avatar_path);
    idx++;
  }
  if (params.cover_path !== undefined) {
    updates.push(`cover_path = $${idx}`);
    values.push(params.cover_path);
    idx++;
  }
  if (params.join_policy !== undefined) {
    updates.push(`join_policy = $${idx}`);
    values.push(params.join_policy);
    idx++;
  }
  if (params.is_verified !== undefined) {
    updates.push(`is_verified = $${idx}`);
    values.push(params.is_verified);
    idx++;
  }
  if (params.instagram_url !== undefined) {
    updates.push(`instagram_url = $${idx}`);
    values.push(params.instagram_url);
    idx++;
  }
  if (params.website_url !== undefined) {
    updates.push(`website_url = $${idx}`);
    values.push(params.website_url);
    idx++;
  }

  if (updates.length === 0) return null;

  updates.push(`updated_at = NOW()`);
  values.push(params.clubId);

  const { rows } = await pool.query(
    `UPDATE clubs SET ${updates.join(', ')} WHERE idclubs = $${idx} RETURNING *`,
    values
  );

  return rows[0] ?? null;
}

export async function isClubAdmin(clubId: number, profileId: number) {
  const { rows } = await pool.query(
    `SELECT 1
     FROM profiles_clubs pc
     LEFT JOIN club_roles cr ON cr.idclub_roles = pc.club_roles_idclub_roles
     WHERE pc.clubs_idclubs = $1
       AND pc.profiles_id_profiles = $2
       AND (LOWER(COALESCE(cr.title, '')) IN ('owner','admin') OR LOWER(pc.role::text) IN ('owner','admin'))
     LIMIT 1`,
    [clubId, profileId]
  );

  return !!rows[0];
}

export async function joinOpenClub(clubId: number, profileId: number) {
  const { rows: clubRows } = await pool.query(`SELECT join_policy FROM clubs WHERE idclubs = $1`, [clubId]);
  if (!clubRows[0]) throw new Error('Club not found');
  if ((clubRows[0].join_policy || 'open') !== 'open') throw new Error('Club requires approval');

  const memberRoleId = await getOrCreateClubRoleId('Member');
  const memberEnum = await pickEnumRole('member');
  if (!memberEnum) throw new Error('Member role enum unavailable');

  await pool.query(
    `INSERT INTO profiles_clubs (profiles_id_profiles, clubs_idclubs, club_roles_idclub_roles, joined_at, role)
     VALUES ($1, $2, $3, NOW(), $4)
     ON CONFLICT DO NOTHING`,
    [profileId, clubId, memberRoleId, memberEnum]
  );

  recalculateProfileGamification(profileId).catch(() => {});

  return { success: true };
}

export async function createJoinRequest(clubId: number, profileId: number) {
  const { rows: clubRows } = await pool.query(`SELECT join_policy FROM clubs WHERE idclubs = $1`, [clubId]);
  if (!clubRows[0]) throw new Error('Club not found');

  if ((clubRows[0].join_policy || 'open') === 'open') {
    await joinOpenClub(clubId, profileId);
    return { autoJoined: true };
  }

  const { rows } = await pool.query(
    `INSERT INTO club_join_requests (club_id, profile_id, status, created_at, updated_at)
     VALUES ($1, $2, 'pending', NOW(), NOW())
     ON CONFLICT ON CONSTRAINT uq_cjr_pending_per_pair
     DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [clubId, profileId]
  );

  return rows[0];
}

export async function listJoinRequests(clubId: number) {
  const { rows } = await pool.query(
    `SELECT r.*, p.display_name, p.username, p.avatar, p.updated_at
     FROM club_join_requests r
     JOIN profiles p ON p.id_profiles = r.profile_id
     WHERE r.club_id = $1
     ORDER BY r.created_at DESC`,
    [clubId]
  );

  return rows.map((row) => ({
    ...row,
    avatar_url: row.avatar ? cloudinaryService.generateAvatarUrl(row.avatar, row.updated_at) : null,
  }));
}

export async function reviewJoinRequest(params: {
  clubId: number;
  requestId: number;
  status: 'approved' | 'rejected';
  reviewerProfileId: number;
}) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `UPDATE club_join_requests
       SET status = $1, reviewed_by = $2, updated_at = NOW()
       WHERE id_club_join_requests = $3 AND club_id = $4
       RETURNING *`,
      [params.status, params.reviewerProfileId, params.requestId, params.clubId]
    );

    const request = rows[0];
    if (!request) {
      await client.query('ROLLBACK');
      return null;
    }

    if (params.status === 'approved') {
      const memberRoleId = await getOrCreateClubRoleId('Member');
      const memberEnum = await pickEnumRole('member');
      if (memberEnum) {
        await client.query(
          `INSERT INTO profiles_clubs (profiles_id_profiles, clubs_idclubs, club_roles_idclub_roles, joined_at, role)
           VALUES ($1, $2, $3, NOW(), $4)
           ON CONFLICT DO NOTHING`,
          [request.profile_id, request.club_id, memberRoleId, memberEnum]
        );
      }
    }

    await client.query('COMMIT');

    if (params.status === 'approved' && request.profile_id) {
      recalculateProfileGamification(request.profile_id).catch(() => {});
    }

    return request;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listClubTrainings(clubId: number) {
  const { rows } = await pool.query(
    `SELECT ct.*, p.display_name AS coach_name
     FROM club_trainings ct
     LEFT JOIN profiles p ON p.id_profiles = ct.coach_profile_id
     WHERE ct.club_id = $1
     ORDER BY ct.starts_at ASC`,
    [clubId]
  );
  return rows;
}

export async function createClubTraining(params: {
  clubId: number;
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at?: string | null;
  coach_profile_id?: number | null;
  capacity?: number | null;
  location_text?: string | null;
  id_trainings?: number | null;
  created_by_profile_id: number;
}) {
  const { rows } = await pool.query(
    `INSERT INTO club_trainings
      (club_id, id_trainings, title, description, starts_at, ends_at, coach_profile_id, capacity, location_text, created_by_profile_id, created_at, updated_at)
     VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
     RETURNING *`,
    [
      params.clubId,
      params.id_trainings ?? null,
      params.title,
      params.description ?? null,
      params.starts_at,
      params.ends_at ?? null,
      params.coach_profile_id ?? null,
      params.capacity ?? null,
      params.location_text ?? null,
      params.created_by_profile_id,
    ]
  );

  return rows[0];
}

export async function addClubTrainingToSelectedCalendar(params: {
  clubId: number;
  clubTrainingId: number;
  profileId: number;
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: ctRows } = await client.query(
      `SELECT * FROM club_trainings WHERE id_club_trainings = $1 AND club_id = $2`,
      [params.clubTrainingId, params.clubId]
    );
    const clubTraining = ctRows[0];
    if (!clubTraining) throw new Error('Club training not found');

    const { rows: selectedRows } = await client.query(
      `SELECT training_calendar_id_training_calendar
       FROM profiles_training_calendar
       WHERE profiles_id_profiles = $1
       ORDER BY id_profiles_training_calendar DESC
       LIMIT 1`,
      [params.profileId]
    );

    let calendarId = selectedRows[0]?.training_calendar_id_training_calendar;

    if (!calendarId) {
      const { rows: newCal } = await client.query(
        `INSERT INTO training_calendar (title, id_created_by, created_at)
         VALUES ($1, $2, NOW())
         RETURNING id_training_calendar`,
        ['My Training Calendar', params.profileId]
      );
      calendarId = newCal[0].id_training_calendar;

      await client.query(
        `INSERT INTO profiles_training_calendar (profiles_id_profiles, training_calendar_id_training_calendar)
         VALUES ($1, $2)`,
        [params.profileId, calendarId]
      );
    }

    let trainingId = clubTraining.id_trainings;

    if (!trainingId) {
      const { rows: trRows } = await client.query(
        `INSERT INTO trainings (title, description)
         VALUES ($1, $2)
         RETURNING id_trainings`,
        [clubTraining.title, clubTraining.description ?? null]
      );
      trainingId = trRows[0].id_trainings;
    }

    const { rows: maxOrderRows } = await client.query(
      `SELECT COALESCE(MAX("order"), 0)::int AS max_order
       FROM training_calendar_trainings
       WHERE id_training_calendar = $1`,
      [calendarId]
    );
    const nextOrder = (maxOrderRows[0]?.max_order ?? 0) + 1;

    const { rows } = await client.query(
      `INSERT INTO training_calendar_trainings (id_training_calendar, id_trainings, "order", icon_name)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [calendarId, trainingId, nextOrder, 'barbell-outline']
    );

    await client.query('COMMIT');
    return rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listMyClubMemberships(profileId: number) {
  const { rows } = await pool.query(
    `SELECT
       c.idclubs,
       c.title,
       c.location,
       c.updated_at,
       c.avatar_path,
       COALESCE(cr.title, pc.role::text) AS role_title
     FROM profiles_clubs pc
     JOIN clubs c ON c.idclubs = pc.clubs_idclubs
     LEFT JOIN club_roles cr ON cr.idclub_roles = pc.club_roles_idclub_roles
     WHERE pc.profiles_id_profiles = $1
     ORDER BY c.title ASC`,
    [profileId]
  );

  return rows.map((row) => ({
    ...row,
    avatar_url: row.avatar_path ? cloudinaryService.generateAvatarUrl(row.avatar_path, row.updated_at) : null,
  }));
}

export async function leaveClub(clubId: number, profileId: number) {
  // Owners cannot leave their own club
  const { rows } = await pool.query(
    `SELECT COALESCE(cr.title, pc.role::text) AS role_title
     FROM profiles_clubs pc
     LEFT JOIN club_roles cr ON cr.idclub_roles = pc.club_roles_idclub_roles
     WHERE pc.clubs_idclubs = $1 AND pc.profiles_id_profiles = $2
     LIMIT 1`,
    [clubId, profileId]
  );
  const role = (rows[0]?.role_title ?? '').toLowerCase();
  if (role === 'owner') throw new Error('Owner cannot leave the club');

  const { rowCount } = await pool.query(
    `DELETE FROM profiles_clubs WHERE clubs_idclubs = $1 AND profiles_id_profiles = $2`,
    [clubId, profileId]
  );
  return (rowCount ?? 0) > 0;
}


export async function updateClubAvatar(clubId: number, avatarPath: string) {
  const { rows } = await pool.query(
    `UPDATE clubs SET avatar_path = $1, updated_at = NOW() WHERE idclubs = $2 RETURNING *`,
    [avatarPath, clubId]
  );
  const club = rows[0];
  // Also update the club profile's avatar if it exists
  if (club?.club_profile_id) {
    await pool.query(
      `UPDATE profiles SET avatar = $1, updated_at = NOW() WHERE id_profiles = $2`,
      [avatarPath, club.club_profile_id]
    );
  }
  return club ?? null;
}

export async function updateClubCover(clubId: number, coverPath: string) {
  const { rows } = await pool.query(
    `UPDATE clubs SET cover_path = $1, updated_at = NOW() WHERE idclubs = $2 RETURNING *`,
    [coverPath, clubId]
  );
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Members management
// ---------------------------------------------------------------------------

export async function listClubMembers(clubId: number, limit = 50, offset = 0) {
  const { rows } = await pool.query(
    `SELECT
       p.id_profiles,
       p.display_name,
       p.username,
       p.avatar,
       p.updated_at,
       p.location,
       COALESCE(cr.title, pc.role::text) AS role_title,
       pc.joined_at
     FROM profiles_clubs pc
     JOIN profiles p ON p.id_profiles = pc.profiles_id_profiles
     LEFT JOIN club_roles cr ON cr.idclub_roles = pc.club_roles_idclub_roles
     WHERE pc.clubs_idclubs = $1
       AND (p.is_club_profile = false OR p.is_club_profile IS NULL)
     ORDER BY
       CASE LOWER(COALESCE(cr.title, pc.role::text))
         WHEN 'owner' THEN 1
         WHEN 'admin' THEN 2
         WHEN 'coach' THEN 3
         ELSE 4
       END,
       p.display_name ASC
     LIMIT $2 OFFSET $3`,
    [clubId, limit, offset]
  );
  return rows.map((row) => ({
    ...row,
    avatar_url: row.avatar ? cloudinaryService.generateAvatarUrl(row.avatar, row.updated_at) : null,
  }));
}

export async function updateMemberRole(clubId: number, targetProfileId: number, newRole: MemberRole) {
  if (!ALLOWED_ROLES.includes(newRole)) throw new Error('Invalid role');

  const roleId = await getOrCreateClubRoleId(newRole.charAt(0).toUpperCase() + newRole.slice(1));
  const roleEnum = await pickEnumRole(newRole);
  if (!roleEnum) throw new Error('Role enum unavailable');

  const { rows } = await pool.query(
    `UPDATE profiles_clubs
     SET club_roles_idclub_roles = $1, role = $2
     WHERE clubs_idclubs = $3 AND profiles_id_profiles = $4
     RETURNING *`,
    [roleId, roleEnum, clubId, targetProfileId]
  );
  return rows[0] ?? null;
}

export async function removeMember(clubId: number, targetProfileId: number, requestingProfileId: number) {
  // Owners cannot be removed (only by themselves)
  const { rows: targetRows } = await pool.query(
    `SELECT COALESCE(cr.title, pc.role::text) AS role_title
     FROM profiles_clubs pc
     LEFT JOIN club_roles cr ON cr.idclub_roles = pc.club_roles_idclub_roles
     WHERE pc.clubs_idclubs = $1 AND pc.profiles_id_profiles = $2
     LIMIT 1`,
    [clubId, targetProfileId]
  );
  const targetRole = (targetRows[0]?.role_title ?? '').toLowerCase();
  if (targetRole === 'owner' && targetProfileId !== requestingProfileId) {
    throw new Error('Cannot remove owner');
  }

  const { rowCount } = await pool.query(
    `DELETE FROM profiles_clubs WHERE clubs_idclubs = $1 AND profiles_id_profiles = $2`,
    [clubId, targetProfileId]
  );
  return (rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Club posts
// ---------------------------------------------------------------------------

export async function listClubPosts(clubId: number, viewerProfileId: number | null, limit = 20, offset = 0) {
  const { rows: clubRows } = await pool.query(
    `SELECT club_profile_id FROM clubs WHERE idclubs = $1`,
    [clubId]
  );
  const clubProfileId = clubRows[0]?.club_profile_id;
  if (!clubProfileId) return [];

  const { rows } = await pool.query(
    `SELECT
       p.id_posts,
       p.description,
       p.source,
       p.created_at,
       pr.id_profiles,
       pr.display_name,
       pr.avatar,
       pr.updated_at AS profile_updated_at,
       COALESCE(i.likes_count, 0)    AS likes_count,
       COALESCE(i.dislikes_count, 0) AS dislikes_count,
       COALESCE(c.comments_count, 0) AS comments_count,
       i.user_interaction
     FROM posts p
     JOIN profiles_posts pp ON pp.posts_id_posts = p.id_posts
     JOIN profiles pr       ON pr.id_profiles = pp.profiles_id_profiles
     LEFT JOIN (
       SELECT
         i.posts_id_posts,
         COUNT(*) FILTER (WHERE it.title = 'like')    AS likes_count,
         COUNT(*) FILTER (WHERE it.title = 'dislike') AS dislikes_count,
         MAX(it.title) FILTER (WHERE i.profiles_id_profiles = $2) AS user_interaction
       FROM interactions i
       JOIN interaction_type it ON it.id_interaction_type = i.interaction_type_idinteraction_type
       GROUP BY i.posts_id_posts
     ) i ON i.posts_id_posts = p.id_posts
     LEFT JOIN (
       SELECT posts_id_posts, COUNT(*) AS comments_count
       FROM comments GROUP BY posts_id_posts
     ) c ON c.posts_id_posts = p.id_posts
     WHERE pp.profiles_id_profiles = $1
     ORDER BY p.created_at DESC
     LIMIT $3 OFFSET $4`,
    [clubProfileId, viewerProfileId ?? null, limit, offset]
  );

  return rows.map((row) => ({
    ...row,
    avatar_url: row.avatar ? cloudinaryService.generateAvatarUrl(row.avatar, row.profile_updated_at) : null,
  }));
}

export async function createClubPost(clubId: number, description: string | null, source: string | null) {
  const { rows: clubRows } = await pool.query(
    `SELECT club_profile_id FROM clubs WHERE idclubs = $1`,
    [clubId]
  );
  const clubProfileId = clubRows[0]?.club_profile_id;
  if (!clubProfileId) throw new Error('Club has no profile');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: postRows } = await client.query(
      `INSERT INTO posts (description, source, created_at) VALUES ($1, $2, NOW()) RETURNING *`,
      [description ?? null, source ?? null]
    );
    const post = postRows[0];
    await client.query(
      `INSERT INTO profiles_posts (profiles_id_profiles, posts_id_posts) VALUES ($1, $2)`,
      [clubProfileId, post.id_posts]
    );
    await client.query('COMMIT');
    return post;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Club training plans
// ---------------------------------------------------------------------------

export async function listClubTrainingPlans(clubId: number) {
  const { rows: clubRows } = await pool.query(
    `SELECT club_profile_id FROM clubs WHERE idclubs = $1`,
    [clubId]
  );
  const clubProfileId = clubRows[0]?.club_profile_id;
  if (!clubProfileId) return [];

  const { rows } = await pool.query(
    `SELECT
       tc.id_training_calendar,
       tc.title,
       tc.created_at,
       COUNT(tct.id_training_calendar_trainings)::int AS trainings_count
     FROM profiles_training_calendar ptc
     JOIN training_calendar tc ON tc.id_training_calendar = ptc.training_calendar_id_training_calendar
     LEFT JOIN training_calendar_trainings tct ON tct.id_training_calendar = tc.id_training_calendar
     WHERE ptc.profiles_id_profiles = $1
     GROUP BY tc.id_training_calendar
     ORDER BY tc.created_at DESC`,
    [clubProfileId]
  );
  return rows;
}

export async function createClubTrainingPlan(clubId: number, title: string) {
  const { rows: clubRows } = await pool.query(
    `SELECT club_profile_id FROM clubs WHERE idclubs = $1`,
    [clubId]
  );
  const clubProfileId = clubRows[0]?.club_profile_id;
  if (!clubProfileId) throw new Error('Club has no profile');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO training_calendar (title, id_created_by, created_at) VALUES ($1, $2, NOW()) RETURNING *`,
      [title, clubProfileId]
    );
    const cal = rows[0];
    await client.query(
      `INSERT INTO profiles_training_calendar (profiles_id_profiles, training_calendar_id_training_calendar) VALUES ($1, $2)`,
      [clubProfileId, cal.id_training_calendar]
    );
    await client.query('COMMIT');
    return cal;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function copyClubTrainingPlan(clubId: number, planId: number, memberProfileId: number) {
  const { rows: clubRows } = await pool.query(
    `SELECT club_profile_id FROM clubs WHERE idclubs = $1`,
    [clubId]
  );
  const clubProfileId = clubRows[0]?.club_profile_id;
  if (!clubProfileId) throw new Error('Club has no profile');

  // Verify plan belongs to club
  const { rows: planRows } = await pool.query(
    `SELECT tc.*
     FROM training_calendar tc
     JOIN profiles_training_calendar ptc ON ptc.training_calendar_id_training_calendar = tc.id_training_calendar
     WHERE tc.id_training_calendar = $1 AND ptc.profiles_id_profiles = $2
     LIMIT 1`,
    [planId, clubProfileId]
  );
  if (!planRows[0]) throw new Error('Plan not found');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Create a copy of the calendar
    const { rows: newCalRows } = await client.query(
      `INSERT INTO training_calendar (title, id_created_by, created_at)
       VALUES ($1, $2, NOW()) RETURNING *`,
      [`${planRows[0].title} (Club Copy)`, memberProfileId]
    );
    const newCal = newCalRows[0];

    // Copy all training entries
    await client.query(
      `INSERT INTO training_calendar_trainings (id_training_calendar, id_trainings, "order", icon_name)
       SELECT $1, id_trainings, "order", icon_name
       FROM training_calendar_trainings
       WHERE id_training_calendar = $2`,
      [newCal.id_training_calendar, planId]
    );

    await client.query(
      `INSERT INTO profiles_training_calendar (profiles_id_profiles, training_calendar_id_training_calendar)
       VALUES ($1, $2)`,
      [memberProfileId, newCal.id_training_calendar]
    );

    await client.query('COMMIT');
    return newCal;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function isClubAdminOrCoach(clubId: number, profileId: number) {
  const { rows } = await pool.query(
    `SELECT 1
     FROM profiles_clubs pc
     LEFT JOIN club_roles cr ON cr.idclub_roles = pc.club_roles_idclub_roles
     WHERE pc.clubs_idclubs = $1
       AND pc.profiles_id_profiles = $2
       AND (LOWER(COALESCE(cr.title, '')) IN ('owner','admin','coach') OR LOWER(pc.role::text) IN ('owner','admin','coach'))
     LIMIT 1`,
    [clubId, profileId]
  );
  return !!rows[0];
}

export async function createClubCalendarFull(params: {
  clubId: number;
  title: string;
  calendarType: 'day' | 'order';
  numWeeks?: number;
  orderStartDate?: string | null;
  slots: Array<{
    type: 'training' | 'rest' | 'special_event';
    order?: number;
    week_number?: number;
    day_of_week?: number;
    id_trainings?: number;
    start_time?: string | null;
    event_title?: string;
    event_description?: string;
    event_starts_at?: string;
    event_ends_at?: string;
  }>;
  createdByProfileId: number;
}) {
  const { rows: clubRows } = await pool.query(
    `SELECT club_profile_id FROM clubs WHERE idclubs = $1`,
    [params.clubId]
  );
  const clubProfileId = clubRows[0]?.club_profile_id;
  if (!clubProfileId) throw new Error('Club has no profile');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create the training calendar
    const { rows: calRows } = await client.query(
      `INSERT INTO training_calendar (title, id_created_by, calendar_type, num_weeks, order_start_date, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
      [
        params.title,
        clubProfileId,
        params.calendarType,
        params.numWeeks ?? 1,
        params.orderStartDate ?? null,
      ]
    );
    const cal = calRows[0];

    // Link calendar to club profile
    await client.query(
      `INSERT INTO profiles_training_calendar (profiles_id_profiles, training_calendar_id_training_calendar) VALUES ($1, $2)`,
      [clubProfileId, cal.id_training_calendar]
    );

    // Insert each slot
    for (const slot of params.slots) {
      if (slot.type === 'special_event') {
        // Insert into club_trainings
        await client.query(
          `INSERT INTO club_trainings
            (club_id, title, description, starts_at, ends_at, event_type, created_by_profile_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 'special_event', $6, NOW(), NOW())`,
          [
            params.clubId,
            slot.event_title ?? 'Special Event',
            slot.event_description ?? null,
            slot.event_starts_at || new Date().toISOString(),
            slot.event_ends_at ?? null,
            params.createdByProfileId,
          ]
        );
      } else if (slot.type === 'rest') {
        // Rest day — row with no training reference
        await client.query(
          `INSERT INTO training_calendar_trainings (id_training_calendar, "order")
           VALUES ($1, $2)`,
          [cal.id_training_calendar, slot.order ?? null]
        );
      } else {
        // Training slot
        await client.query(
          `INSERT INTO training_calendar_trainings (id_training_calendar, id_trainings, "order", week_number, day_of_week, start_time)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            cal.id_training_calendar,
            slot.id_trainings ?? null,
            slot.order ?? null,
            slot.week_number ?? null,
            slot.day_of_week ?? null,
            slot.start_time ?? null,
          ]
        );
      }
    }

    await client.query('COMMIT');
    return cal;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Club calendar selection
// ---------------------------------------------------------------------------

export async function selectClubCalendar(
  clubId: number,
  calendarId: number,
  userId: number,
  profileId: number
) {
  const resolvedProfileId = profileId || (await getProfileIdForUser(userId));
  if (!resolvedProfileId) throw new Error('Profile required');

  const canManage = await isClubAdminOrCoach(clubId, resolvedProfileId);
  if (!canManage) throw new Error('Forbidden');

  const { rows: clubRows } = await pool.query(
    `SELECT club_profile_id FROM clubs WHERE idclubs = $1`,
    [clubId]
  );
  const clubProfileId = clubRows[0]?.club_profile_id;
  if (!clubProfileId) throw new Error('Club has no profile');

  await pool.query(
    `DELETE FROM profiles_training_calendar WHERE profiles_id_profiles = $1`,
    [clubProfileId]
  );
  await pool.query(
    `INSERT INTO profiles_training_calendar (profiles_id_profiles, training_calendar_id_training_calendar) VALUES ($1, $2)`,
    [clubProfileId, calendarId]
  );

  return { success: true };
}

export async function getClubSelectedCalendar(clubId: number) {
  const { rows: clubRows } = await pool.query(
    `SELECT club_profile_id FROM clubs WHERE idclubs = $1`,
    [clubId]
  );
  const clubProfileId = clubRows[0]?.club_profile_id;
  if (!clubProfileId) return null;

  const { rows } = await pool.query(
    `SELECT tc.id_training_calendar, tc.title, tc.calendar_type, tc.num_weeks, tc.order_start_date, tc.privacy, tc.created_at
     FROM profiles_training_calendar ptc
     JOIN training_calendar tc ON ptc.training_calendar_id_training_calendar = tc.id_training_calendar
     WHERE ptc.profiles_id_profiles = $1
     LIMIT 1`,
    [clubProfileId]
  );
  const calendar = rows[0];
  if (!calendar) return null;

  const { rows: items } = await pool.query(
    `SELECT
       tct.id_training_calendar_trainings,
       tct.id_training_calendar,
       tct.id_trainings,
       tct."order",
       tct.day_of_week,
       tct.week_number,
       tct.start_time,
       tct.icon_name,
       t.title as training_title,
       t.description as training_description,
       (SELECT COUNT(*) FROM trainings_components tc WHERE tc.id_trainings = t.id_trainings) as component_count
     FROM training_calendar_trainings tct
     LEFT JOIN trainings t ON t.id_trainings = tct.id_trainings
     WHERE tct.id_training_calendar = $1
     ORDER BY tct."order", tct.week_number, tct.day_of_week`,
    [calendar.id_training_calendar]
  );

  return { calendar, items };
}
