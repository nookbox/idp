import { Module } from '@nestjs/common';
import { AvatarsService } from './avatars.service';

@Module({
  // ponytail: 업로드 API 는 세션이 필요해서 제거. Phase 2 에서 직접 만든 세션으로 컨트롤러 복원
  providers: [AvatarsService],
})
export class AvatarsModule {}
