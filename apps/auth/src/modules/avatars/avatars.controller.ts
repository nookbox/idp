import { Controller, ParseFilePipe, Post, UploadedFile } from '@nestjs/common';
import { Session, UserSession } from '@thallesp/nestjs-better-auth';
import { AVATAR_MAX_SIZE } from './constants/avatars.constants';
import { AvatarsService } from './avatars.service';
import { ApiImageFile } from './decorators/api-image.decorator';
import { FileTypeValidationPipe } from './pipes/file-type-validation.pipe';

@Controller('avatars')
export class AvatarsController {
  constructor(private readonly avatarsService: AvatarsService) {}

  @Post('upload')
  @ApiImageFile('avatar', true, {
    limits: { fileSize: AVATAR_MAX_SIZE },
  })
  changeProfile(
    @Session() session: UserSession,
    @UploadedFile(ParseFilePipe, new FileTypeValidationPipe())
    file: Express.Multer.File,
  ) {
    return this.avatarsService.uploadProfileImage(session.user.id, file);
  }
}
