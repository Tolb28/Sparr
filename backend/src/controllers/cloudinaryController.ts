import fs from "fs";
import { cloudinaryService } from "../services/cloudinaryService";

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

async function setUserAvatarSrc(userId: string | number, publicId: string): Promise<void> {
  console.log(`DB: set users.avatar_src = "${publicId}" for user ${userId}`);
}

async function setPostSrc(postId: string | number, publicId: string): Promise<void> {
  console.log(`DB: set posts.src = "${publicId}" for post ${postId}`);
}

export const cloudinaryController = {
  async changeAvatar(userId: string | number, localFilePath: string, mimetype: string): Promise<MediaResponse> {
    if (!mimetype.startsWith("image/")) {
      safeUnlink(localFilePath);
      throw new Error("Avatar must be an image");
    }

    const folder = `users/avatars/${userId}`;
    const publicId = "main";

    try {
      const result = await cloudinaryService.uploadImage(localFilePath, { folder, publicId });
      const fullPublicId = `${folder}/${publicId}`;

      await setUserAvatarSrc(userId, fullPublicId);

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

  async deleteAvatar(userId: string | number): Promise<void> {
    const prefix = `users/avatars/${userId}`;
    await cloudinaryService.deleteResourcesByPrefix(prefix);
    await setUserAvatarSrc(userId, "");
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
  },
};
