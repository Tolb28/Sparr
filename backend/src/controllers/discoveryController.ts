import { Request, Response } from "express";
import { getPosts } from "../services/postsService";
import { getComments } from "../services/commentsService";

export const getDiscoveryFeed = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const profileId = req.query.profileId ? parseInt(req.query.profileId as string) : null;

    const posts = await getPosts({ limit, offset, profileId });

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