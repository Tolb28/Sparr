import { Request, Response } from 'express';
import { pool } from '../db';

/**
 * Return all accepted friends (profiles) for the authenticated user.
 */
export const getFriends = async (req: Request, res: Response) => {
  try {
    // @ts-ignore - authenticate middleware sets req.userId
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Resolve profile id for this user
    const { rows: profileRows } = await pool.query('SELECT id_profiles FROM profiles WHERE user_id = $1', [userId]);
    const profile = profileRows[0];
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const profileId = profile.id_profiles;

    // Find accepted friends where this profile appears either as the requester
    // (`profiles_id_profiles`) or as the `id_friend`. Use a CASE expression to
    // select the *other* profile in the relationship and join on that profile
    // to return a consistent friends list regardless of who initiated the request.
    // `status` is an enum in the DB; cast to text before using LOWER().
    const { rows } = await pool.query(
      `SELECT p.id_profiles, p.display_name, p.username, p.avatar, p.location
       FROM friends f
       JOIN profiles p ON p.id_profiles = (
         CASE WHEN f.profiles_id_profiles = $1 THEN f.id_friend ELSE f.profiles_id_profiles END
       )
       WHERE LOWER(f.status::text) = 'accepted' AND (f.profiles_id_profiles = $1 OR f.id_friend = $1)
       ORDER BY p.display_name ASC`,
      [profileId]
    );

    return res.json({ friends: rows });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

export default { getFriends };
