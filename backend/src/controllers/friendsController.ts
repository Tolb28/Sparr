import { Request, Response } from 'express';
import { pool } from '../config/db';
import { cloudinaryService } from '../services/cloudinaryService';

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
      `SELECT p.id_profiles, p.display_name, p.username, p.avatar, p.location, p.updated_at
       FROM friends f
       JOIN profiles p ON p.id_profiles = (
         CASE WHEN f.profiles_id_profiles = $1 THEN f.id_friend ELSE f.profiles_id_profiles END
       )
       WHERE LOWER(f.status::text) = 'accepted' AND (f.profiles_id_profiles = $1 OR f.id_friend = $1)
       ORDER BY p.display_name ASC`,
      [profileId]
    );

    // Generate avatar URLs for each friend
    const friends = rows.map(row => ({
      ...row,
      avatar_url: row.avatar ? cloudinaryService.generateAvatarUrl(row.avatar, row.updated_at) : null
    }));

    return res.json({ friends });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get pending friend requests received by the authenticated user.
 * Returns requests where status = 'pending' and id_friend = current user's profile
 */
export const getPendingRequests = async (req: Request, res: Response) => {
  try {
    // @ts-ignore - authenticate middleware sets req.userId
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Resolve profile id for this user
    const { rows: profileRows } = await pool.query('SELECT id_profiles FROM profiles WHERE user_id = $1', [userId]);
    const profile = profileRows[0];
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const profileId = profile.id_profiles;

    // Get pending requests where this user is the recipient (id_friend)
    const { rows } = await pool.query(
      `SELECT f.id_friend, f.profiles_id_profiles, p.id_profiles, p.display_name, p.username, p.avatar, p.location, p.updated_at
       FROM friends f
       JOIN profiles p ON p.id_profiles = f.profiles_id_profiles
       WHERE LOWER(f.status::text) = 'pending' AND f.id_friend = $1
       ORDER BY f.created_at DESC`,
      [profileId]
    );

    // Generate avatar URLs for each request
    const requests = rows.map(row => ({
      ...row,
      avatar_url: row.avatar ? cloudinaryService.generateAvatarUrl(row.avatar, row.updated_at) : null
    }));

    return res.json({ requests });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Accept a pending friend request
 */
export const acceptFriendRequest = async (req: Request, res: Response) => {
  try {
    // @ts-ignore - authenticate middleware sets req.userId
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { friendRequestId } = req.params;

    // Resolve profile id for this user (the recipient)
    const { rows: profileRows } = await pool.query('SELECT id_profiles FROM profiles WHERE user_id = $1', [userId]);
    const profile = profileRows[0];
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const currentProfileId = profile.id_profiles;

    // Update status to 'accepted' - the current user is the recipient (id_friend)
    const { rows: updateRows } = await pool.query(
      `UPDATE friends SET status = 'accepted' 
       WHERE id_friend = $1 AND profiles_id_profiles = $2
       RETURNING id_friend`,
      [currentProfileId, friendRequestId]
    );

    if (updateRows.length === 0) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    return res.json({ success: true, message: 'Friend request accepted' });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Decline/delete a pending friend request
 */
export const declineFriendRequest = async (req: Request, res: Response) => {
  try {
    // @ts-ignore - authenticate middleware sets req.userId
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { friendRequestId } = req.params;

    // Resolve profile id for this user (the recipient)
    const { rows: profileRows } = await pool.query('SELECT id_profiles FROM profiles WHERE user_id = $1', [userId]);
    const profile = profileRows[0];
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const currentProfileId = profile.id_profiles;

    // Delete the request - the current user is the recipient (id_friend)
    const { rows: deleteRows } = await pool.query(
      `DELETE FROM friends 
       WHERE id_friend = $1 AND profiles_id_profiles = $2
       RETURNING id_friend`,
      [currentProfileId, friendRequestId]
    );

    if (deleteRows.length === 0) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    return res.json({ success: true, message: 'Friend request declined' });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Check friendship status with another profile
 * Returns: 'friends', 'pending_sent', 'pending_received', or 'none'
 */
export const checkFriendStatus = async (req: Request, res: Response) => {
  try {
    // @ts-ignore - authenticate middleware sets req.userId
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { targetProfileId } = req.params;

    // Resolve current user's profile id
    const { rows: profileRows } = await pool.query('SELECT id_profiles FROM profiles WHERE user_id = $1', [userId]);
    const profile = profileRows[0];
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const currentProfileId = profile.id_profiles;

    // Check for any relationship
    const { rows } = await pool.query(
      `SELECT status, profiles_id_profiles, id_friend
       FROM friends
       WHERE (profiles_id_profiles = $1 AND id_friend = $2) OR (profiles_id_profiles = $2 AND id_friend = $1)`,
      [currentProfileId, targetProfileId]
    );

    if (rows.length === 0) {
      return res.json({ status: 'none' });
    }

    const friendship = rows[0];
    if (friendship.status === 'accepted') {
      return res.json({ status: 'friends' });
    }

    // For pending, check who sent the request
    if (friendship.profiles_id_profiles === currentProfileId) {
      return res.json({ status: 'pending_sent' });
    } else {
      return res.json({ status: 'pending_received' });
    }
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Send a friend request to another profile
 */
export const sendFriendRequest = async (req: Request, res: Response) => {
  try {
    // @ts-ignore - authenticate middleware sets req.userId
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { targetProfileId } = req.params;
    if (!targetProfileId) return res.status(400).json({ error: 'Target profile ID required' });
    const targetId = parseInt(targetProfileId);

    // Resolve current user's profile id
    const { rows: profileRows } = await pool.query('SELECT id_profiles FROM profiles WHERE user_id = $1', [userId]);
    const profile = profileRows[0];
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const currentProfileId = profile.id_profiles;

    // Prevent self-friending
    if (currentProfileId === targetId) {
      return res.status(400).json({ error: 'Cannot friend yourself' });
    }

    // Check if relationship already exists
    const { rows: existingRows } = await pool.query(
      `SELECT id_friend FROM friends
       WHERE (profiles_id_profiles = $1 AND id_friend = $2) OR (profiles_id_profiles = $2 AND id_friend = $1)`,
      [currentProfileId, targetId]
    );

    if (existingRows.length > 0) {
      return res.status(400).json({ error: 'Friend request already exists' });
    }

    // Create friend request
    const { rows: insertRows } = await pool.query(
      `INSERT INTO friends (profiles_id_profiles, id_friend, status, created_at)
       VALUES ($1, $2, 'pending', NOW())
       RETURNING id_friend`,
      [currentProfileId, targetId]
    );

    return res.json({ success: true, id_friend: insertRows[0].id_friend, message: 'Friend request sent' });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Unfriend another profile
 */
export const unfriend = async (req: Request, res: Response) => {
  try {
    // @ts-ignore - authenticate middleware sets req.userId
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { targetProfileId } = req.params;
    if (!targetProfileId) return res.status(400).json({ error: 'Target profile ID required' });
    const targetId = parseInt(targetProfileId);

    // Resolve current user's profile id
    const { rows: profileRows } = await pool.query('SELECT id_profiles FROM profiles WHERE user_id = $1', [userId]);
    const profile = profileRows[0];
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const currentProfileId = profile.id_profiles;

    // Find and delete the friendship (works regardless of who initiated)
    const { rows } = await pool.query(
      `DELETE FROM friends
       WHERE (profiles_id_profiles = $1 AND id_friend = $2) OR (profiles_id_profiles = $2 AND id_friend = $1)
       RETURNING id_friend`,
      [currentProfileId, targetId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Friend relationship not found' });
    }

    return res.json({ success: true, message: 'Unfriended successfully' });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

export default { getFriends, getPendingRequests, acceptFriendRequest, declineFriendRequest, checkFriendStatus, sendFriendRequest, unfriend };
