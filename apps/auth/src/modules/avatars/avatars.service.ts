import { Injectable } from '@nestjs/common';

@Injectable()
export class AvatarsService {
  findAll(): string {
    return 'This action returns all avatars';
  }
}
