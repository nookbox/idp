import * as fs from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';

export const createDiskStorage = (uploadPath: string) =>
  diskStorage({
    destination: (req, file, cb) => {
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${uniqueName}${extname(file.originalname)}`);
    },
  });
