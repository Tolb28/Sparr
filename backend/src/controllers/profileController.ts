import { Request, Response } from "express";
import { getPosts } from "../services/postsService";
import { pool } from "../config/db";
import { cloudinaryController } from "./cloudinaryController";
import { cloudinaryService } from "../services/cloudinaryService";

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
      location // NOTE: Will change datatype in future (varchar → likely structured)
    } = req.body;

    // Basic validation: ensure minimal required fields are present
    if (!display_name || !username) {
      return res.status(400).json({ error: 'display_name and username are required' });
    }

    let avatarPublicId = null;

    // First, insert the profile to get its id_profiles
    const insertQuery = `
      INSERT INTO profiles (
        weight_class_id_weight_class,
        boxing_style_id_boxing_style,
        bio,
        avatar,
        display_name,
        username,
        location,
        user_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *;
    `;

    const insertValues = [
      id_weight_class || null,
      id_boxing_style || null,
      bio || null,
      null, // avatar will be updated after upload
      display_name,
      username,
      location || null,
      userId
    ];

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
 * GET PROFILE for logged in user (returns their primary profile by userId)
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId;

    const { rows } = await pool.query(
      "SELECT * FROM profiles LEFT JOIN weight_class ON profiles.weight_class_id_weight_class = weight_class.id_weight_class LEFT JOIN boxing_style ON profiles.boxing_style_id_boxing_style = boxing_style.id_boxing_style WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1",
      [userId]
    );

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

    // Get the user's profile ID
    const profileResult = await pool.query(
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
      location // (NOTE: future migration to structured type)
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

    // Get the user's profile ID
    const profileResult = await pool.query(
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

    res.json({ profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
