import { type ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

import { getClientIp } from '../utils/client-ip';

/**
 * 기본 ThrottlerGuard 는 req.ip 로 요청자를 구분한다. 그런데 이 서버 앞에는
 * cloudflared 컨테이너가 있어서 req.ip 는 항상 그 컨테이너의 사설 IP 다.
 * 즉 손대지 않으면 전 사용자가 하나의 버킷을 공유해, 한 명이 한도를 채우면
 * 나머지 전원이 429 를 맞는다. 정확히 막으려던 것의 반대가 된다.
 *
 * (express 의 trust proxy 로도 풀 수 있지만, 그건 x-forwarded-for 를 믿는
 *  방식이라 위조가 가능하다. cf-connecting-ip 만 본다.)
 */
@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Request): Promise<string> {
    return Promise.resolve(getClientIp(req));
  }

  protected shouldSkip(context: ExecutionContext): Promise<boolean> {
    // 도커 헬스체크가 30초마다 두드리는 경로. 여기서 429 가 나면 컨테이너가
    // unhealthy 로 떨어져 스스로 죽는다.
    if (context.getType() !== 'http') return Promise.resolve(true);

    const req = context.switchToHttp().getRequest<Request>();
    return Promise.resolve(req.path === '/health' || req.url === '/health');
  }
}
