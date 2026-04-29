import { Request, Response } from "express";
import { getPosts } from "../services/postsService";
import { pool } from "../config/db";
import { cloudinaryController } from "./cloudinaryController";
import { cloudinaryService } from "../services/cloudinaryService";

const ALLOWED_EXPERIENCE_LEVELS = new Set(["beginner", "intermediate", "advanced"]);

function parseExperienceLevel(value: unknown): { value: string | null; error: string | null } {
  if (value === undefined) return { value: null, error: null };
  if (value === null) return { value: null, error: null };
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return { value: null, error: null };
  if (!ALLOWED_EXPERIENCE_LEVELS.has(normalized)) {
    return { value: null, error: "Invalid experience_level. Use beginner, intermediate, or advanced." };
  }
  return { value: normalized, error: null };
}

function parseHeightCm(value: unknown): { value: number | null; error: string | null } {
  if (value === undefined) return { value: null, error: null };
  if (value === null) return { value: null, error: null };
  const normalized = String(value).trim();
  if (!normalized) return { value: null, error: null };
  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < 120 || parsed > 240) {
    return { value: null, error: "Invalid height_cm. Height must be an integer between 120 and 240." };
  }
  return { value: parsed, error: null };
}

/**
 * CREATE PROFILE (usually called once per user)
 */
export const createProfile = async (req: Request, res: Response) => {
  try {
    // Auth middleware sets req.userId
    // @ts-ignore
    const userId = req.userId;

    const {
      id_weight_class,
      id_boxing_style,
      bio,
      display_name,
      username,
      location, // NOTE: Will change datatype in future (varchar → likely structured)
      experience_level,
      height_cm,
    } = req.body;

    // Basic validation: ensure minimal required fields are present
    if (!display_name || !username) {
      return res.status(400).json({ error: 'display_name and username are required' });
    }

    const parsedExperience = parseExperienceLevel(experience_level);
    if (parsedExperience.error) {
      return res.status(400).json({ error: parsedExperience.error });
    }
    const parsedHeight = parseHeightCm(height_cm);
    if (parsedHeight.error) {
      return res.status(400).json({ error: parsedHeight.error });
    }

    let avatarPublicId = null;

    const insertColumns = [
      'weight_class_id_weight_class',
      'boxing_style_id_boxing_style',
      'bio',
      'avatar',
      'display_name',
      'username',
      'location',
      'user_id',
    ];
    const insertValues: any[] = [
      id_weight_class || null,
      id_boxing_style || null,
      bio || null,
      null, // avatar will be updated after upload
      display_name,
      username,
      location || null,
      userId,
    ];

    if (parsedExperience.value !== null) {
      insertColumns.push('experience_level');
      insertValues.push(parsedExperience.value);
    }
    if (parsedHeight.value !== null) {
      insertColumns.push('height_cm');
      insertValues.push(parsedHeight.value);
    }

    const placeholders = insertValues.map((_, index) => `$${index + 1}`).join(', ');
    const insertQuery = `
      INSERT INTO profiles (${insertColumns.join(', ')})
      VALUES (${placeholders})
      RETURNING *;
    `;

    const { rows } = await pool.query(insertQuery, insertValues);
    const profileId = rows[0].id_profiles;

    // Handle avatar upload if a file was provided
    // @ts-ignore
    const avatarFile = req.files?.find((f: any) => f.fieldname === 'avatar');
    if (avatarFile) {
      try {
        const result = await cloudinaryController.changeAvatar(profileId, avatarFile.path, avatarFile.mimetype);
        avatarPublicId = result.public_id;

        // Update the profile with the avatar
        const updateQuery = `
          UPDATE profiles
          SET avatar = $1, updated_at = NOW()
          WHERE id_profiles = $2
          RETURNING *;
        `;
        const updateResult = await pool.query(updateQuery, [avatarPublicId, profileId]);
        const profile = updateResult.rows[0];
        
        // Generate avatar URL with cache-busting
        profile.avatar_url = cloudinaryService.generateAvatarUrl(profile.avatar, profile.updated_at);
        
        return res.status(201).json({ profile });
      } catch (err: any) {
        console.error("Avatar upload failed:", err);
        return res.status(400).json({ error: "Failed to upload avatar: " + err.message });
      }
    }

    const profile = rows[0];
    return res.status(201).json({ profile });
  } catch (err: any) {
    console.error(err);
    if (err?.code === "23505") {
      // unique_violation
      return res.status(400).json({ error: "Username already exists" });
    }
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * LIST PROFILES linked to current user
 */
export const getMyProfiles = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId;

    const { rows } = await pool.query(
      `SELECT id_profiles, display_name, username, location, avatar, updated_at, created_at
       FROM profiles
       WHERE user_id = $1
         AND (is_club_profile = false OR is_club_profile IS NULL)
       ORDER BY created_at ASC`,
      [userId]
    );

    const profiles = rows.map((profile) => ({
      ...profile,
      avatar_url: profile.avatar ? cloudinaryService.generateAvatarUrl(profile.avatar, profile.updated_at) : null,
    }));

    res.json({ profiles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * GET PROFILE for logged in user (returns their primary profile by userId)
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId;
    // @ts-ignore
    const selectedProfileId = req.profileId;

    const params: any[] = [userId];
    let query = "SELECT * FROM profiles LEFT JOIN weight_class ON profiles.weight_class_id_weight_class = weight_class.id_weight_class LEFT JOIN boxing_style ON profiles.boxing_style_id_boxing_style = boxing_style.id_boxing_style WHERE user_id = $1";
    if (selectedProfileId) {
      query += " AND id_profiles = $2";
      params.push(selectedProfileId);
    }
    query += " ORDER BY created_at ASC LIMIT 1";

    const { rows } = await pool.query(query, params);

    if (!rows[0]) return res.status(404).json({ error: "Profile not found" });

    const profile = rows[0];
    
    // Generate avatar URL with cache-busting if it exists
    if (profile.avatar) {
      profile.avatar_url = cloudinaryService.generateAvatarUrl(profile.avatar, profile.updated_at);
      console.log("Generated avatar URL: ", profile.avatar_url);
    }

    res.json({ profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * UPDATE PROFILE by profileId (for logged-in user's own profile)
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId;
    // @ts-ignore
    const selectedProfileId = req.profileId;

    // Get the user's profile ID
    const profileResult = selectedProfileId
      ? await pool.query(
          "SELECT id_profiles FROM profiles WHERE user_id = $1 AND id_profiles = $2 ORDER BY created_at ASC LIMIT 1",
          [userId, selectedProfileId]
        )
      : await pool.query(
          "SELECT id_profiles FROM profiles WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1",
          [userId]
        );

    if (!profileResult.rows[0]) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const profileId = profileResult.rows[0].id_profiles;

    const {
      weight_class_id,
      boxing_style_id,
      bio,
      display_name,
      username,
      location, // (NOTE: future migration to structured type)
      experience_level,
      height_cm,
    } = req.body;
    console.log('Update profile request body:', req.body);
    console.log('Update profile files:', req.files);

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (weight_class_id !== undefined) {
      updates.push(`weight_class_id_weight_class = $${idx}`);
      values.push(weight_class_id);
      idx++;
    }
    if (boxing_style_id !== undefined) {
      updates.push(`boxing_style_id_boxing_style = $${idx}`);
      values.push(boxing_style_id);
      idx++;
    }
    if (bio !== undefined) {
      updates.push(`bio = $${idx}`);
      values.push(bio);
      idx++;
    }
    
    // Handle avatar upload if a file was provided
    // @ts-ignore
    const avatarFile = req.files?.find((f: any) => f.fieldname === 'avatar');
    if (avatarFile) {
      try {
        const result = await cloudinaryController.changeAvatar(profileId, avatarFile.path, avatarFile.mimetype);
        updates.push(`avatar = $${idx}`);
        values.push(result.public_id);
        idx++;
      } catch (err: any) {
        console.error("Avatar upload failed:", err);
        return res.status(400).json({ error: "Failed to upload avatar: " + err.message });
      }
    }
    
    if (display_name !== undefined) {
      updates.push(`display_name = $${idx}`);
      values.push(display_name);
      idx++;
    }
    if (username !== undefined) {
      updates.push(`username = $${idx}`);
      values.push(username);
      idx++;
    }
    if (location !== undefined) {
      updates.push(`location = $${idx}`);
      values.push(location);
      idx++;
    }
    if (experience_level !== undefined) {
      const parsedExperience = parseExperienceLevel(experience_level);
      if (parsedExperience.error) {
        return res.status(400).json({ error: parsedExperience.error });
      }
      updates.push(`experience_level = $${idx}`);
      values.push(parsedExperience.value);
      idx++;
    }
    if (height_cm !== undefined) {
      const parsedHeight = parseHeightCm(height_cm);
      if (parsedHeight.error) {
        return res.status(400).json({ error: parsedHeight.error });
      }
      updates.push(`height_cm = $${idx}`);
      values.push(parsedHeight.value);
      idx++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update." });
    }

    values.push(profileId);

    const query = `
      UPDATE profiles
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE id_profiles = $${idx}
      RETURNING *;
    `;

    const { rows } = await pool.query(query, values);
    const profile = rows[0];
    
    // Generate avatar URL with cache-busting if it exists
    if (profile.avatar) {
      profile.avatar_url = cloudinaryService.generateAvatarUrl(profile.avatar, profile.updated_at);
    }
    
    return res.json({ profile });
  } catch (err: any) {
    console.error(err);
    if (err?.code === "23505") {
      return res.status(400).json({ error: "Username already exists" });
    }
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * DELETE PROFILE by profileId (for logged-in user)
 */
export const deleteProfile = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId;
    // @ts-ignore
    const selectedProfileId = req.profileId;

    // Get the user's profile ID
    const profileResult = selectedProfileId
      ? await pool.query(
          "SELECT id_profiles FROM profiles WHERE user_id = $1 AND id_profiles = $2 ORDER BY created_at ASC LIMIT 1",
          [userId, selectedProfileId]
        )
      : await pool.query(
          "SELECT id_profiles FROM profiles WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1",
          [userId]
        );

    if (!profileResult.rows[0]) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const profileId = profileResult.rows[0].id_profiles;

    await pool.query("DELETE FROM profiles WHERE id_profiles = $1", [profileId]);

    return res.json({ message: "Profile deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * GET PROFILE POSTS by profileId
 */
export const getProfilePosts = async (req: Request, res: Response) => {
  try {
    const profileId = parseInt(req.params.id as string, 10);

    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const posts = await getPosts({ ownerId: profileId, limit, offset });

    res.json({
      success: true,
      posts,
    });
  } catch (err) {
    console.error("Profile posts error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET FOREIGN PROFILE by profileId
 */
export const getForeignProfile = async (req: Request, res: Response) => {
  try {
    const profileId = parseInt(req.params.id as string, 10);

    const { rows } = await pool.query(
      "SELECT * FROM profiles LEFT JOIN weight_class ON profiles.weight_class_id_weight_class = weight_class.id_weight_class LEFT JOIN boxing_style ON profiles.boxing_style_id_boxing_style = boxing_style.id_boxing_style WHERE id_profiles = $1",
      [profileId]
    );

    if (!rows[0]) return res.status(404).json({ error: "Profile not found" });

    const profile = rows[0];
    
    // Generate avatar URL with cache-busting if it exists
    if (profile.avatar) {
      profile.avatar_url = cloudinaryService.generateAvatarUrl(profile.avatar, profile.updated_at);
    }

    // Fetch club memberships for this profile
    const { rows: memberships } = await pool.query(
      `SELECT pc.clubs_idclubs AS club_id, c.title AS club_title, c.location AS club_location,
              c.avatar_path AS club_avatar_path, c.updated_at AS club_updated_at,
              COALESCE(cr.title, pc.role::text) AS role_title
       FROM profiles_clubs pc
       JOIN clubs c ON c.idclubs = pc.clubs_idclubs
       LEFT JOIN club_roles cr ON cr.idclub_roles = pc.club_roles_idclub_roles
       WHERE pc.profiles_id_profiles = $1
       ORDER BY c.title ASC
       LIMIT 50`,
      [profileId]
    );

    const clubMemberships = memberships.map((m) => ({
      club_id: m.club_id,
      club_title: m.club_title,
      club_location: m.club_location,
      role_title: m.role_title,
      club_avatar_url: m.club_avatar_path
        ? cloudinaryService.generateAvatarUrl(m.club_avatar_path, m.club_updated_at)
        : null,
    }));

    res.json({ profile, club_memberships: clubMemberships });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
