import { Injectable } from '@nestjs/common';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';

@Injectable()
export class CloudinaryService {
  async uploadFile(file: Express.Multer.File, userId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: 'depurapp_cvs',
          resource_type: "image", 
          public_id: `cv_${userId}`,
          format: 'pdf',
          overwrite: true,
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('No result'));

          resolve(result.secure_url);
        },
      );

      upload.end(file.buffer);
    });
  }
}
