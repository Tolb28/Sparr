import fs from "fs";
import { cloudinaryService } from "../services/cloudinaryService";
import { pool } from "../config/db";
import { get } from "http";

export type MediaResponse = {
  public_id: string;
  secure_url?: string;
  resource_type?: string;
  derived?: any[];
};

function safeUnlink(filePath: string) {
  fs.unlink(filePath, (err) => {
    if (err && (err as any).code !== "ENOENT") console.error("Failed to unlink file:", err);
  });
}

async function setProfileAvatarSrc(profileId: string | number, publicId: string): Promise<void> {
  try {
    await pool.query(
      "UPDATE profiles SET avatar = $1 WHERE id_profiles = $2",
      [publicId, profileId]
    );
    console.log(`✅ Updated profile avatar to "${publicId}" for profile ${profileId}`);
  } catch (err) {
    console.error(`❌ Failed to update avatar in database:`, err);
    throw err;
  }
}

async function setPostSrc(postId: string | number, publicId: string): Promise<void> {
  try {
    await pool.query(
      "UPDATE posts SET source = $1 WHERE id_posts = $2",
      [publicId, postId]
    );
    console.log(`✅ Updated post source to "${publicId}" for post ${postId}`);
  } catch (err) {
    console.error(`❌ Failed to update post source in database:`, err);
    throw err;
  }
}

async function setClubAvatarSrc(clubId: string | number, publicId: string): Promise<void> {
  try {
    await pool.query(
      "UPDATE clubs SET avatar_path = $1, updated_at = NOW() WHERE idclubs = $2",
      [publicId, clubId]
    );
    console.log(`✅ Updated club avatar to "${publicId}" for club ${clubId}`);
  } catch (err) {
    console.error(`❌ Failed to update club avatar in database:`, err);
    throw err;
  }
}

export const cloudinaryController = {
  async changeAvatar(profileId: string | number, localFilePath: string, mimetype: string): Promise<MediaResponse> {
    if (!mimetype.startsWith("image/")) {
      safeUnlink(localFilePath);
      throw new Error("Avatar must be an image");
    }

    const folder = `avatars/${profileId}`;
    const publicId = "main";

    try {
      const result = await cloudinaryService.uploadImage(localFilePath, { folder, publicId });
      const fullPublicId = `${folder}/${publicId}`;

      await setProfileAvatarSrc(profileId, fullPublicId);

      return {
        public_id: fullPublicId,
        secure_url: result.secure_url ?? "",
        resource_type: result.resource_type ?? "",
        derived: result.derived ?? [],
      };
    } finally {
      safeUnlink(localFilePath);
    }
  },

  async setPostMedia(postId: string | number, localFilePath: string, mimetype: string): Promise<MediaResponse> {
    const isImage = mimetype.startsWith("image/");
    const isVideo = mimetype.startsWith("video/");

    if (!isImage && !isVideo) {
      safeUnlink(localFilePath);
      throw new Error("Uploaded file must be image or video");
    }

    const folder = isImage ? `posts/images/${postId}` : `posts/videos/${postId}`;
    const publicId = "main";

    try {
      const result = isImage
        ? await cloudinaryService.uploadImage(localFilePath, { folder, publicId })
        : await cloudinaryService.uploadVideo(localFilePath, { folder, publicId });

      const fullPublicId = `${folder}/${publicId}`;
      await setPostSrc(postId, fullPublicId);

      return {
        public_id: fullPublicId,
        secure_url: result.secure_url ?? "",
        resource_type: result.resource_type ?? "",
        derived: result.derived ?? [],
      };
    } finally {
      safeUnlink(localFilePath);
    }
  },

  async changeClubAvatar(clubId: string | number, localFilePath: string, mimetype: string): Promise<MediaResponse> {
    if (!mimetype.startsWith("image/")) {
      safeUnlink(localFilePath);
      throw new Error("Club avatar must be an image");
    }

    const folder = `clubs/${clubId}`;
    const publicId = "avatar";

    try {
      const result = await cloudinaryService.uploadImage(localFilePath, { folder, publicId });
      const fullPublicId = `${folder}/${publicId}`;

      await setClubAvatarSrc(clubId, fullPublicId);

      return {
        public_id: fullPublicId,
        secure_url: result.secure_url ?? "",
        resource_type: result.resource_type ?? "",
        derived: result.derived ?? [],
      };
    } finally {
      safeUnlink(localFilePath);
    }
  },

  async changeClubCover(clubId: string | number, localFilePath: string, mimetype: string): Promise<MediaResponse> {
    if (!mimetype.startsWith("image/")) {
      safeUnlink(localFilePath);
      throw new Error("Club cover must be an image");
    }

    const folder = `clubs/${clubId}`;
    const publicId = "cover";

    try {
      const result = await cloudinaryService.uploadImage(localFilePath, { folder, publicId });
      const fullPublicId = `${folder}/${publicId}`;

      // Only update cover_path — do NOT touch avatar_path
      return {
        public_id: fullPublicId,
        secure_url: result.secure_url ?? "",
        resource_type: result.resource_type ?? "",
        derived: result.derived ?? [],
      };
    } finally {
      safeUnlink(localFilePath);
    }
  },

  async deleteAvatar(profileId: string | number): Promise<void> {
    const prefix = `avatars/${profileId}`;
    await cloudinaryService.deleteResourcesByPrefix(prefix);
    await setProfileAvatarSrc(profileId, "");
  },

  async deletePostMedia(postId: string | number): Promise<void> {
    const prefixImages = `posts/images/${postId}`;
    const prefixVideos = `posts/videos/${postId}`;

    await cloudinaryService.deleteResourcesByPrefix(prefixImages);
    await cloudinaryService.deleteResourcesByPrefix(prefixVideos);

    await setPostSrc(postId, "");
  },

  getUrl(publicId: string, options: Record<string, unknown> = {}) {
    return cloudinaryService.generateUrl(publicId, options);
  }
};
