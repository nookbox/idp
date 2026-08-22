import { Request } from 'express';

import { REQUEST_ID_TOKEN_HEADER } from '../../constants';
import { RequestContext } from '../../logger';
import type { AuthUser } from '../../types/auth-user';
import { getClientIp } from '../../utils/client-ip';

// Express의 Request 객체에서 필요한 정보만 뽑아 RequestContext 객체를 생성한다
export function createRequestContext(request: Request): RequestContext {
  const ctx = new RequestContext();
  ctx.requestID = request.header(REQUEST_ID_TOKEN_HEADER);
  ctx.url = request.url;
  // 로그에 남는 IP 도 위조 가능한 x-forwarded-for 가 아니라 cf-connecting-ip 를
  // 본다. 남의 IP 로 위장한 로그가 남으면 사고 조사 때 엉뚱한 사람을 쫓게 된다.
  ctx.ip = getClientIp(request);

  // request.user가 없는 경우(비로그인 요청)에는 명시적으로 null로 설정한다
  // ponytail: passport 의 Express.Request 전역 보강을 안 가져왔으므로 로컬 캐스팅
  const user = (request as Request & { user?: AuthUser }).user;
  ctx.sub = user?.sub ?? null;

  return ctx;
}
