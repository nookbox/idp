import type { Request } from 'express';

import { CF_CONNECTING_IP_HEADER } from '../constants';

/**
 * 요청을 보낸 실제 클라이언트 IP.
 *
 * 신뢰할 수 있는 헤더(cf-connecting-ip) 하나만 본다
 * 헤더가 없으면(로컬 개발, 컨테이너 안에서 직접 curl, 헬스체크) 소켓 주소로
 * 떨어진다 — 이때는 어차피 외부에서 온 요청이 아니다.
 */
export function getClientIp(request: Request): string {
  const header = request.headers[CF_CONNECTING_IP_HEADER];
  const value = Array.isArray(header) ? header[0] : header;

  return (
    value?.trim() || request.ip || request.socket.remoteAddress || 'unknown'
  );
}
