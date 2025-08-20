import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { UploadApiOptions, UploadApiResponse } from 'cloudinary';
import { configureCloudinary } from '../config/cloudinary.config';

@Injectable()
export class UploadService {
  private cloudinary = configureCloudinary();
  private uploadBuffer(
    buffer: Buffer,
    options: UploadApiOptions,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        options,
        (err, result) => {
          if (err || !result) {
            return reject(
              new InternalServerErrorException(err?.message || 'Upload failed'),
            );
          }
          resolve(result);
        },
      );
      uploadStream.end(buffer);
    });
  }

  async uploadImage(
    buffer: Buffer,
    folder: string,
    options: UploadApiOptions = {},
  ) {
    return this.uploadBuffer(buffer, {
      folder,
      resource_type: 'image',
      ...options,
    });
  }

  async uploadVideo(
    buffer: Buffer,
    folder: string,
    options: UploadApiOptions = {},
  ) {
    return this.uploadBuffer(buffer, {
      folder,
      resource_type: 'video',
      type: 'authenticated',
      ...options,
    });
  }

  async uploadRaw(
    buffer: Buffer,
    folder: string,
    options: UploadApiOptions = {},
  ) {
    return this.uploadBuffer(buffer, {
      folder,
      resource_type: 'raw',
      ...options,
    });
  }

  async uploadAuto(
    buffer: Buffer,
    folder: string,
    options: UploadApiOptions = {},
  ) {
    return this.uploadBuffer(buffer, {
      folder,
      resource_type: 'auto',
      ...options,
    });
  }

  /**
   * Generate a signed (expiring) URL for protected assets (default: video/authenticated)
   */
  generateSignedUrl(
    publicId: string,
    {
      resourceType = 'video',
      deliveryType = 'authenticated',
      expiresInSec = 60 * 60, // 1 hour
      transformation,
    }: {
      resourceType?: 'image' | 'video' | 'raw' | 'auto';
      deliveryType?: 'authenticated' | 'private';
      expiresInSec?: number;
      transformation?: Record<string, any>;
    } = {},
  ): string {
    const expires_at = Math.floor(Date.now() / 1000) + expiresInSec;
    return this.cloudinary.url(publicId, {
      resource_type: resourceType,
      type: deliveryType,
      sign_url: true,
      expires_at,
      ...(transformation ? { transformation } : {}),
    });
  }

  /**
   * Extract Cloudinary public_id from a secure URL. Assumes format:
   * https://res.cloudinary.com/<cloud>/<resource>/upload/v<ver>/<folder>/<name>.<ext>
   */
  extractPublicIdFromUrl(url?: string | null): string | null {
    if (!url) return null;
    try {
      const u = new URL(url);
      const parts = u.pathname.split('/');
      // Find index of 'upload' segment, public_id starts after version segment
      const uploadIdx = parts.findIndex((p) => p === 'upload');
      if (uploadIdx === -1 || uploadIdx + 2 >= parts.length) return null;
      // Next segment should be version like v123456789
      const afterVersion = parts.slice(uploadIdx + 2).join('/');
      // Remove extension
      const lastDot = afterVersion.lastIndexOf('.');
      return lastDot > 0 ? afterVersion.substring(0, lastDot) : afterVersion;
    } catch {
      return null;
    }
  }

  /**
   * Delete an uploaded resource by its Cloudinary public id.
   */
  async deleteByPublicId(
    publicId: string,
    options: {
      resourceType?: 'image' | 'video' | 'raw' | 'auto';
      type?: string;
    } = {},
  ): Promise<any> {
    const { resourceType = 'video', type = 'authenticated' } = options;
    return new Promise((resolve, reject) => {
      this.cloudinary.uploader.destroy(
        publicId,
        { resource_type: resourceType, type },
        (err, result) => {
          if (err)
            return reject(
              new InternalServerErrorException(err?.message || 'Delete failed'),
            );
          resolve(result);
        },
      );
    });
  }
  
  /**
   * Search Cloudinary resources by context key/value and optional folder.
   * Returns array of public_ids (may be empty).
   */
  async searchPublicIdsByContext(
    key: string,
    value: string,
    folder?: string,
  ): Promise<string[]> {
    try {
      const exprParts = [`context:${key}=${value}`];
      if (folder) exprParts.push(`folder:${folder}`);
      const expression = exprParts.join(' AND ');
      const res: any = await this.cloudinary.search
        .expression(expression)
        .sort_by('uploaded_at', 'desc')
        .max_results(50)
        .execute();
      if (!res || !res.resources) return [];
      return res.resources.map((r: any) => r.public_id).filter(Boolean);
    } catch (e) {
      return [];
    }
  }
}
