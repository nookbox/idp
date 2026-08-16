import { Controller, Get } from '@nestjs/common';

@Controller('avatars')
export class AvatarsController {
  @Get()
  findAll(): string {
    return 'This action returns all avatars';
  }
}
