import { Controller, ParseFilePipe, Post, UploadedFile } from '@nestjs/common';
import { Session, UserSession } from '@thallesp/nestjs-better-auth';
import { AvatarsService } from './avatars.service';
import { ApiImageFile } from './decorators/api-image.decorator';
import { FileTypeValidationPipe } from './pipes/file-type-validation.pipe';

@Controller('avatars')
export class AvatarsController {
  constructor(private readonly avatarsService: AvatarsService) {}

  @Post('upload')
  @ApiImageFile('avatar', true, {
    limits: { fileSize: 5 * 1024 * 1024 },
  })
  changeProfile(
    @Session() session: UserSession,
    @UploadedFile(ParseFilePipe, new FileTypeValidationPipe())
    file: Express.Multer.File,
  ) {
    return this.avatarsService.uploadProfileImage(session.user.id, file);
  }
}
