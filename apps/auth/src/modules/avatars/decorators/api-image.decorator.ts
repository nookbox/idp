import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { fileMimetypeFilter } from '../filter/file-mimetype.filter';
import { ApiFile } from './api-file.decorator';

export function ApiImageFile(
  fieldName: string = 'image',
  required: boolean = false,
  localOptions?: MulterOptions,
) {
  return ApiFile(fieldName, required, {
    ...localOptions,
    fileFilter: fileMimetypeFilter('image'),
  });
}
