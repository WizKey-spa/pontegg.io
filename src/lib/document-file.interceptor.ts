import { FileInterceptor } from '@nestjs/platform-express';

export const UPLOAD_KEY = 'file';
export const fileInterceptor = FileInterceptor(UPLOAD_KEY, {
  limits: {
    fileSize: 1000 * 1024 * 1024,
  },
});
