import { createDiskStorage } from '@/shared/storage/disk.storage';
import {
  Controller,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Session, UserSession } from '@thallesp/nestjs-better-auth';
import { AvatarsService } from './avatars.service';

@Controller('avatars')
export class AvatarsController {
  constructor(private readonly avatarsService: AvatarsService) {}
  @UseInterceptors(
    FileInterceptor('file', {
      storage: createDiskStorage('./uploads/profile'),
    }),
  )
  @Post('avatar/upload')
  uploadProfileImage(
    @Session() session: UserSession,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /jpeg|png|webp/ })
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build(),
    )
    file: Express.Multer.File,
  ) {
    return this.avatarsService.uploadProfileImage(session.user.id, file.path);
  }
}
