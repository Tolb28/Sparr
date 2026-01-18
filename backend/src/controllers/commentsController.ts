import { Request, Response } from "express";
import { pool } from "../config/db";
import { createComment } from "../services/commentsService";

export const createCommentHandler = async (req: Request, res: Response) => {
  try {
    // @ts-ignore - authenticate middleware sets req.userId
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { postId, content } = req.body;

    if (!postId || !content || !content.trim()) {
      return res.status(400).json({ error: 'postId and content are required' });
    }

    // Get the user's profile ID
    const { rows: profileRows } = await pool.query(
      'SELECT id_profiles FROM profiles WHERE user_id = $1',
      [userId]
    );

    if (!profileRows[0]) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const profileId = profileRows[0].id_profiles;

    const comment = await createComment(postId, profileId, content.trim());

    return res.status(201).json({ success: true, comment });
  } catch (err: any) {
    console.error('Create comment error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
