import { Request, Response } from "express";
import { getPosts } from "../services/postsService";

export const getDiscoveryFeed = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const posts = await getPosts({ limit, offset });

    res.json({
      success: true,
      posts,
    });
  } catch (err) {
    console.error("Discovery error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
