import { Request, Response } from "express";
import { createPost, updatePost } from "../services/postsService";
import { cloudinaryController } from "./cloudinaryController";

export const createPostHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { description, profileId } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    console.log('[POST BACKEND] Request received');
    console.log('[POST BACKEND] UserId:', userId);
    console.log('[POST BACKEND] Description:', description);
    console.log('[POST BACKEND] ProfileId:', profileId);
    console.log('[POST BACKEND] Files received:', files ? Object.keys(files) : 'none');
    if (files) {
      if (files.image) console.log('[POST BACKEND] Image file:', files.image[0]?.fieldname, files.image[0]?.originalname, files.image[0]?.mimetype, files.image[0]?.path);
      if (files.video) console.log('[POST BACKEND] Video file:', files.video[0]?.fieldname, files.video[0]?.originalname, files.video[0]?.mimetype, files.video[0]?.path);
    }

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    let imageUrl: string | null = null;
    let videoUrl: string | null = null;

    // Create the post first to get the ID
    console.log('[POST BACKEND] Creating post with profileId:', profileId, 'description:', description);
    const post = await createPost(
      profileId,
      description || null,
      null
    );
    const postId = post.id_posts;
    console.log('[POST BACKEND] Post created with ID:', postId);

    // Upload image if provided
    if (files?.image && files.image[0]) {
      console.log("Uploading image:", files.image[0].path);
      try {
        const uploadResult = await cloudinaryController.setPostMedia(
          postId,
          files.image[0].path,
          files.image[0].mimetype
        );
        imageUrl = uploadResult.secure_url || null;
        console.log("Image uploaded:", imageUrl);
      } catch (err) {
        console.error("Image upload failed:", err);
      }
    }

    // Upload video if provided
    if (files?.video && files.video[0]) {
      console.log('[POST BACKEND] Uploading video:', files.video[0].path);
      try {
        const uploadResult = await cloudinaryController.setPostMedia(
          postId,
          files.video[0].path,
          files.video[0].mimetype
        );
        videoUrl = uploadResult.secure_url || null;
        console.log('[POST BACKEND] Video upload result:', { public_id: uploadResult.public_id, secure_url: videoUrl });
      } catch (err) {
        console.error('[POST BACKEND] Video upload failed:', err);
      }
    } else {
      console.log('[POST BACKEND] No video file to upload');
    }

    // If media was uploaded, update the post with the media URL
    const source = videoUrl || imageUrl || null;
    console.log('[POST BACKEND] Final source URL:', source);
    console.log('[POST BACKEND] videoUrl:', videoUrl, 'imageUrl:', imageUrl);
    if (source) {
      console.log('[POST BACKEND] Updating post with media URL');
      const updatedPost = await updatePost(
        postId,
        description || null,
        source
      );
      console.log('[POST BACKEND] Updated post:', updatedPost);
      res.status(201).json(updatedPost);
    } else {
      console.log('[POST BACKEND] No media uploaded, returning initial post');
      res.status(201).json(post);
    }
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ error: "Failed to create post" });
  }
};
