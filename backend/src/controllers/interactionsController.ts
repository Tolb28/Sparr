import { Request, Response } from 'express';
import { pool } from '../db';

/**
 * Toggle or switch an interaction on a post for the authenticated user.
 * Expects body: { postId: number, type: string }
 * - If no existing interaction => insert new
 * - If existing of same type => remove it
 * - If existing of different type => remove old and insert new
 */
export const toggleInteraction = async (req: Request, res: Response) => {
  try {
    const { postId, type } = req.body;
    if (!postId || !type) return res.status(400).json({ error: 'Missing fields' });

    // @ts-ignore - auth middleware attaches userId
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Resolve profile id for this user
    const { rows: profileRows } = await pool.query('SELECT id_profiles FROM profiles WHERE user_id = $1', [userId]);
    const profile = profileRows[0];
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const profileId = profile.id_profiles;

    // Resolve interaction type id from title (case-insensitive)
    const { rows: itRows } = await pool.query(
      'SELECT id_interaction_type, title FROM interaction_type WHERE LOWER(title) = LOWER($1) LIMIT 1',
      [type]
    );
    if (!itRows[0]) return res.status(400).json({ error: 'Invalid interaction type' });
    const newTypeId = itRows[0].id_interaction_type;

    // Check existing interaction for this profile+post
    const { rows: existingRows } = await pool.query(
      'SELECT * FROM interactions WHERE posts_id_posts = $1 AND profiles_id_profiles = $2',
      [postId, profileId]
    );

    let action = 'added';

    if (existingRows[0]) {
      const existing = existingRows[0];
      const existingTypeId = existing.interaction_type_idinteraction_type;

      if (existingTypeId === newTypeId) {
        // same type => remove
        await pool.query('DELETE FROM interactions WHERE posts_id_posts = $1 AND profiles_id_profiles = $2', [postId, profileId]);
        action = 'removed';
      } else {
        // different type => remove old and insert new
        await pool.query('DELETE FROM interactions WHERE posts_id_posts = $1 AND profiles_id_profiles = $2', [postId, profileId]);
        await pool.query(
          'INSERT INTO interactions (interaction_type_idinteraction_type, posts_id_posts, profiles_id_profiles) VALUES ($1,$2,$3)',
          [newTypeId, postId, profileId]
        );
        action = 'switched';
      }
    } else {
      // no existing => insert
      await pool.query(
        'INSERT INTO interactions (interaction_type_idinteraction_type, posts_id_posts, profiles_id_profiles) VALUES ($1,$2,$3)',
        [newTypeId, postId, profileId]
      );
      action = 'added';
    }

    // Return updated counts for the post
    const { rows: likesRows } = await pool.query(
      `SELECT COUNT(*)::int AS likes_count FROM interactions i
       JOIN interaction_type it ON i.interaction_type_idinteraction_type = it.id_interaction_type
       WHERE i.posts_id_posts = $1 AND it.title = 'like'`,
      [postId]
    );

    const { rows: dislikesRows } = await pool.query(
      `SELECT COUNT(*)::int AS dislikes_count FROM interactions i
       JOIN interaction_type it ON i.interaction_type_idinteraction_type = it.id_interaction_type
       WHERE i.posts_id_posts = $1 AND it.title = 'dislike'`,
      [postId]
    );

    const likes_count = likesRows[0]?.likes_count ?? 0;
    const dislikes_count = dislikesRows[0]?.dislikes_count ?? 0;

    return res.json({ action, likes_count, dislikes_count });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

export default { toggleInteraction };
