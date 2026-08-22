import { Controller, ParseFilePipe, Post, UploadedFile } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Session, UserSession } from '@thallesp/nestjs-better-auth';
import {
  AVATAR_MAX_SIZE,
  AVATAR_UPLOAD_RATE_LIMIT,
} from './constants/avatars.constants';
import { AvatarsService } from './avatars.service';
import { ApiImageFile } from './decorators/api-image.decorator';
import { FileTypeValidationPipe } from './pipes/file-type-validation.pipe';

@Controller('avatars')
export class AvatarsController {
  constructor(private readonly avatarsService: AvatarsService) {}

  @Post('upload')
  @Throttle({ default: AVATAR_UPLOAD_RATE_LIMIT })
  @ApiImageFile('avatar', true, {
    limits: {
      fileSize: AVATAR_MAX_SIZE,
      // 파일 1개, 그 외 필드 0개
      files: 1,
      fields: 0,
    },
  })
  changeProfile(
    @Session() session: UserSession,
    @UploadedFile(ParseFilePipe, new FileTypeValidationPipe())
    file: Express.Multer.File,
  ) {
    return this.avatarsService.uploadProfileImage(session.user.id, file);
  }
}
