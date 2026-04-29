import { Request, Response } from 'express';
import { pool } from '../config/db';
import { recalculateProfileGamification } from '../services/gamificationService';

/**
 * Toggle or switch an interaction on a post for the authenticated user.
 * Expects body: { targetId: number, type: string }
 * - If no existing interaction => insert new
 * - If existing of same type => remove it
 * - If existing of different type => remove old and insert new
 */
export const toggleInteraction = async (req: Request, res: Response) => {
  try {
    const { targetId, type, parent } = req.body;
    if (!targetId || !type || !parent) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    if (parent !== 'post' && parent !== 'comment') {
      return res.status(400).json({ error: 'Invalid parent type' });
    }

    // @ts-ignore - auth middleware attaches userId
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Resolve profile id for this user
    const { rows: profileRows } = await pool.query(
      'SELECT id_profiles FROM profiles WHERE user_id = $1',
      [userId]
    );
    const profile = profileRows[0];
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const profileId = profile.id_profiles;

    // Resolve interaction type id from title (case-insensitive)
    const { rows: itRows } = await pool.query(
      'SELECT id_interaction_type FROM interaction_type WHERE LOWER(title) = LOWER($1) LIMIT 1',
      [type]
    );
    if (!itRows[0]) return res.status(400).json({ error: 'Invalid interaction type' });
    const newTypeId = itRows[0].id_interaction_type;

    // Decide which column to use based on parent
    const targetColumn =
      parent === 'post' ? 'posts_id_posts' : 'comments_id_comments';

    // Check existing interaction
    const { rows: existingRows } = await pool.query(
      `SELECT * FROM interactions 
       WHERE ${targetColumn} = $1 AND profiles_id_profiles = $2`,
      [targetId, profileId]
    );

    let action = 'added';

    if (existingRows[0]) {
      const existing = existingRows[0];
      const existingTypeId = existing.interaction_type_idinteraction_type;

      if (existingTypeId === newTypeId) {
        // same type => remove
        await pool.query(
          `DELETE FROM interactions 
           WHERE ${targetColumn} = $1 AND profiles_id_profiles = $2`,
          [targetId, profileId]
        );
        action = 'removed';
      } else {
        // different type => switch
        await pool.query(
          `DELETE FROM interactions 
           WHERE ${targetColumn} = $1 AND profiles_id_profiles = $2`,
          [targetId, profileId]
        );

        await pool.query(
          `INSERT INTO interactions 
           (interaction_type_idinteraction_type, ${targetColumn}, profiles_id_profiles)
           VALUES ($1, $2, $3)`,
          [newTypeId, targetId, profileId]
        );

        action = 'switched';
      }
    } else {
      // no existing => insert
      await pool.query(
        `INSERT INTO interactions 
         (interaction_type_idinteraction_type, ${targetColumn}, profiles_id_profiles)
         VALUES ($1, $2, $3)`,
        [newTypeId, targetId, profileId]
      );
      action = 'added';
    }

    if (action === 'added' || action === 'switched') {
      recalculateProfileGamification(profileId).catch(() => {});
    }

    // Return updated counts
    const { rows: likesRows } = await pool.query(
      `SELECT COUNT(*)::int AS likes_count
       FROM interactions i
       JOIN interaction_type it 
         ON i.interaction_type_idinteraction_type = it.id_interaction_type
       WHERE i.${targetColumn} = $1 AND LOWER(it.title) = 'like'`,
      [targetId]
    );

    const { rows: dislikesRows } = await pool.query(
      `SELECT COUNT(*)::int AS dislikes_count
       FROM interactions i
       JOIN interaction_type it 
         ON i.interaction_type_idinteraction_type = it.id_interaction_type
       WHERE i.${targetColumn} = $1 AND LOWER(it.title) = 'dislike'`,
      [targetId]
    );

    const likes_count = likesRows[0]?.likes_count ?? 0;
    const dislikes_count = dislikesRows[0]?.dislikes_count ?? 0;

    return res.json({
      action,
      parent,
      likes_count,
      dislikes_count
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

export default { toggleInteraction };

