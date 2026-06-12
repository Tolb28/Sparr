import { Request, Response } from "express";
import { getPosts } from "../services/postsService";
import { getComments } from "../services/commentsService";
import { pool } from "../config/db";
import { cloudinaryService } from "../services/cloudinaryService";

export const getDiscoveryFeed = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const profileId = req.query.profileId ? parseInt(req.query.profileId as string) : null;
    const ownerId = req.query.ownerId ? parseInt(req.query.ownerId as string) : null;
    const search = req.query.search ? (req.query.search as string) : null;
    const location = req.query.location ? (req.query.location as string) : null;
    const type = req.query.type ? (req.query.type as 'text' | 'media') : null;

    const posts = await getPosts({ limit, offset, profileId, ownerId, search, location, type });

    const withAvatar = posts.filter((p: any) => p.avatar_url).length;
    const withSource = posts.filter((p: any) => p.source).length;
    console.log(`[DISCOVERY] Returning ${posts.length} posts: ${withSource} with media, ${withAvatar} with avatars`);

    res.json({
      success: true,
      posts,
    });
  } catch (err) {
    console.error("Discovery error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getCommentsForPost = async (req: Request, res: Response) => {
  try {
    console.log("Fetching comments for post:", req.params.postId);
    const postId = parseInt(req.params.postId as string || "-1");
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const profileId = req.query.profileId ? parseInt(req.query.profileId as string) : null;

    const comments = await getComments({ postId, limit, offset, profileId });

    res.json({
      success: true,
      comments,
    });
  } catch (err) {
    console.error("Comments error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getDiscoveryBoxers = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 50);
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const query = (req.query.query as string) || '';
    const location = (req.query.location as string) || '';
    const style = (req.query.style as string) || '';
    const weightClass = (req.query.weightClass as string) || '';

    const values: any[] = [];
    const where: string[] = [];
    let idx = 1;

    if (query.trim()) {
      where.push(`(p.display_name ILIKE $${idx} OR p.username ILIKE $${idx})`);
      values.push(`%${query.trim()}%`);
      idx++;
    }
    if (location.trim()) {
      where.push(`p.location ILIKE $${idx}`);
      values.push(`%${location.trim()}%`);
      idx++;
    }
    if (style.trim()) {
      where.push(`bs.title_style ILIKE $${idx}`);
      values.push(`%${style.trim()}%`);
      idx++;
    }
    if (weightClass.trim()) {
      where.push(`wc.title_weight ILIKE $${idx}`);
      values.push(`%${weightClass.trim()}%`);
      idx++;
    }

    // Exclude the requesting user's own profile(s) from the boxers list
    // @ts-ignore - authenticate middleware sets req.userId
    const currentUserId = req.userId;
    if (currentUserId) {
      where.push(`p.user_id <> $${idx}`);
      values.push(currentUserId);
      idx++;
    }

    values.push(limit);
    const limitIdx = idx;
    idx++;
    values.push(offset);
    const offsetIdx = idx;

    const sql = `
      SELECT
        p.id_profiles,
        p.display_name,
        p.username,
        p.location,
        p.avatar,
        p.updated_at,
        bs.title_style,
        wc.title_weight
      FROM profiles p
      LEFT JOIN boxing_style bs ON p.boxing_style_id_boxing_style = bs.id_boxing_style
      LEFT JOIN weight_class wc ON p.weight_class_id_weight_class = wc.id_weight_class
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY p.created_at DESC NULLS LAST, p.id_profiles DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const { rows } = await pool.query(sql, values);
    const boxers = rows.map((row) => ({
      ...row,
      avatar_url: row.avatar ? cloudinaryService.generateAvatarUrl(row.avatar, row.updated_at) : null,
    }));

    res.json({ success: true, boxers });
  } catch (err) {
    console.error('Discovery boxers error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};