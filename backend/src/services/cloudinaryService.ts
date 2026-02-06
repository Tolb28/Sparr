import fs from "fs";
import type { UploadApiOptions, UploadApiResponse } from "cloudinary";
import cloudinary from "../config/cloudinary";

/**
 * Small, stable shape returned to callers (avoid leaking Cloudinary internals)
 */
export type UploadResult = {
  public_id: string;
  secure_url?: string;
  resource_type?: string;
  derived?: any[];
};

/**
 * CloudinaryService
 * Encapsulates direct communication with Cloudinary.
 * - Keeps upload options consistent (eager transformations, overwrite/invalidate when replacing)
 * - Handles chunked uploads for large video files
 * - Exposes delete-by-id and delete-by-prefix helpers
 */
export class CloudinaryService {
  private readonly CHUNKED_VIDEO_THRESHOLD = 10_000_000; // 10 MB

  constructor(private readonly cloud = cloudinary) {}

  private fileSizeSafe(localPath: string): number {
    try {
      return fs.statSync(localPath).size;
    } catch {
      return 0;
    }
  }

  private pickResult(res: UploadApiResponse): UploadResult {
    return {
      public_id: res.public_id,
      secure_url: (res as any).secure_url,
      resource_type: res.resource_type,
      derived: res.derived,
    };
  }

  async uploadImage(localPath: string, opts: { folder?: string; publicId?: string } = {}): Promise<UploadResult> {
    const options: UploadApiOptions = {
      resource_type: "image",
      eager: [
        {
          transformation: [
            { width: 1920, crop: "limit" },
            { quality: "auto" },
            { fetch_format: "auto" },
          ],
        },
      ],
      eager_async: true,
    };

    if (opts.folder) options.folder = opts.folder;
    if (opts.publicId) {
      options.public_id = opts.publicId;
      options.overwrite = true;
      options.invalidate = true;
    }

    return new Promise<UploadResult>((resolve, reject) => {
      this.cloud.uploader.upload(localPath, options, (err, result) => {
        if (err) return reject(err);
        if (!result) return reject(new Error("Cloudinary upload returned no result"));
        resolve(this.pickResult(result));
      });
    });
  }

  async uploadVideo(localPath: string, opts: { folder?: string; publicId?: string; chunkSize?: number } = {}): Promise<UploadResult> {
    const size = this.fileSizeSafe(localPath);
    const useChunked = size > this.CHUNKED_VIDEO_THRESHOLD;

    const options: UploadApiOptions = {
      resource_type: "video",
      eager: [
        {
          transformation: [
            { width: 720, crop: "scale" },
            { quality: "auto" },
            { fetch_format: "mp4" },
          ],
        },
      ],
      eager_async: true,
    };

    if (opts.folder) options.folder = opts.folder;
    if (opts.publicId) {
      options.public_id = opts.publicId;
      options.overwrite = true;
      options.invalidate = true;
    }

    if (!useChunked) {
      return new Promise<UploadResult>((resolve, reject) => {
        this.cloud.uploader.upload(localPath, options, (err, result) => {
          if (err) return reject(err);
          if (!result) return reject(new Error("Cloudinary upload returned no result (video)"));
          resolve(this.pickResult(result));
        });
      });
    }

    return new Promise<UploadResult>((resolve, reject) => {
      // upload_large exists at runtime; TypeScript types may not include it
      (this.cloud.uploader as any).upload_large(
        localPath,
        {
          ...options,
          chunk_size: opts.chunkSize ?? 20_000_000,
        },
        (err: any, result?: UploadApiResponse) => {
          if (err) return reject(err);
          if (!result) return reject(new Error("Cloudinary upload_large returned no result"));
          resolve(this.pickResult(result));
        }
      );
    });
  }

  async deleteResource(publicId: string): Promise<void> {
    await this.cloud.api.delete_resources([publicId], { resource_type: "auto" });
  }

  async deleteResourcesByPrefix(prefix: string): Promise<void> {
    await this.cloud.api.delete_resources_by_prefix(prefix, { resource_type: "auto" });
  }

  generateUrl(publicId: string, options: Record<string, unknown> = {}): string {
    return this.cloud.url(publicId, { secure: true, ...options });
  }

  /**
   * Generate avatar URL with cache-busting to prevent browser from serving stale images
   * when avatars are overwritten in Cloudinary
   */
  generateAvatarUrl(publicId: string, updatedAt?: Date | string): string {
    // Generate a cache-busting token based on updated_at
    let cacheBuster = '';
    if (updatedAt) {
      const timestamp = typeof updatedAt === 'string' 
        ? new Date(updatedAt).getTime() 
        : updatedAt.getTime();
      // Create a short hash from the timestamp to use as cache buster
      cacheBuster = Math.floor(timestamp / 1000).toString();
    }
    
    const baseUrl = this.cloud.url(publicId, {
      secure: true,
      width: 256,
      height: 256,
      crop: 'fill',
      gravity: 'face',
      // Add version parameter for aggressive cache busting
      ...(cacheBuster ? { version: cacheBuster } : {})
    });
    
    return baseUrl;
  }
  generateDrillUrl(publicId: string): string {
    const cacheBuster = Math.floor(Date.now() / 1000).toString();
    const baseUrl = this.cloud.url(publicId, {
      secure: true,
      width: 400,
      height: 300,
      crop: 'fill',
      ...(cacheBuster ? { version: cacheBuster } : {})
    });
    return baseUrl;
  }

  /**
   * Generate a Cloudinary video URL for the given public id.
   * Adds MP4 fetch_format and sensible scaling/quality transforms.
   */
  generateVideoUrl(publicId: string, options: Record<string, unknown> = {}): string {
    return this.cloud.url(publicId, {
      secure: true,
      resource_type: 'video',
      transformation: [
        { width: 1280, crop: 'scale' },
        { quality: 'auto' },
        { fetch_format: 'mp4' },
      ],
      ...options,
    });
  }
}

export const cloudinaryService = new CloudinaryService();
