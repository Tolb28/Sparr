import { Request, Response } from "express";
import { getPosts } from "../services/postsService";
import { pool } from "../db";

/**
 * CREATE PROFILE (usually called once)
 */
export const createProfile = async (req: Request, res: Response) => {
  try {
    // Auth middleware sets req.userId
    // @ts-ignore
    const userId = req.userId;

    const {
      weight_class_id,
      boxing_style_id,
      bio,
      img_path,
      display_name,
      username,
      location // NOTE: Will change datatype in future (varchar → likely structured)
    } = req.body;

    // Basic validation: ensure minimal required fields are present
    if (!display_name || !username) {
      return res.status(400).json({ error: 'display_name and username are required' });
    }

    const query = `
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

    const values = [
      weight_class_id || null,
      boxing_style_id || null,
      bio || null,
      img_path || null,
      display_name,
      username,
      location || null,
      userId
    ];

    const { rows } = await pool.query(query, values);
    return res.status(201).json({ profile: rows[0] });
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
 * GET PROFILE for logged in user
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId;

    const { rows } = await pool.query(
      "SELECT * FROM profiles LEFT JOIN weight_class ON profiles.weight_class_id_weight_class = weight_class.id_weight_class LEFT JOIN boxing_style ON profiles.boxing_style_id_boxing_style = boxing_style.id_boxing_style WHERE user_id = $1",
      [userId]
    );

    if (!rows[0]) return res.status(404).json({ error: "Profile not found" });

    res.json({ profile: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * UPDATE PROFILE
 * Allows partial updates like your updateUser controller
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId;

    const {
      weight_class_id,
      boxing_style_id,
      bio,
      img_path,
      display_name,
      username,
      location // (NOTE: future migration to structured type)
    } = req.body;

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
    if (img_path !== undefined) {
      updates.push(`avatar = $${idx}`);
      values.push(img_path);
      idx++;
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

    values.push(userId);

    const query = `
      UPDATE profiles
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE user_id = $${idx}
      RETURNING *;
    `;

    const { rows } = await pool.query(query, values);
    return res.json({ profile: rows[0] });
  } catch (err: any) {
    console.error(err);
    if (err?.code === "23505") {
      return res.status(400).json({ error: "Username already exists" });
    }
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * DELETE PROFILE
 */
export const deleteProfile = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId;

    await pool.query("DELETE FROM profiles WHERE user_id=$1", [userId]);

    return res.json({ message: "Profile deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getProfilePosts = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id as string, 10);

    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const posts = await getPosts({ userId, limit, offset });

    res.json({
      success: true,
      posts,
    });
  } catch (err) {
    console.error("Profile posts error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
