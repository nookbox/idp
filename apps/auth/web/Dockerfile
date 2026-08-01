# syntax=docker/dockerfile:1
#
# @nook/auth-web (Next.js 로그인/동의 화면) 운영 이미지
#
#   docker build -f apps/auth/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_AUTH_URL=https://auth.example.com \
#     -t nook-auth-web .
#
# 빌드 컨텍스트는 워크스페이스 루트다(apps/auth/web 아님).

FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /repo

# =============================================================
# 1단계: deps
# =============================================================
FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/auth/package.json apps/auth/
COPY apps/auth/web/package.json apps/auth/web/

RUN --mount=type=cache,id=pnpm-idp,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter "@nook/auth-web..."

# =============================================================
# 2단계: build
# =============================================================
FROM deps AS build

COPY apps/auth/web apps/auth/web

# ⚠️ NEXT_PUBLIC_* 은 "빌드 시점"에 JS 번들 안에 문자열로 박힌다.
# 컨테이너를 띄울 때 환경변수로 바꿔도 안 바뀐다. 반드시 빌드 인자로 넘겨야 한다.
# 즉 운영용 이미지와 개발용 이미지는 별개로 빌드해야 한다.
ARG NEXT_PUBLIC_AUTH_URL=http://localhost:3001
ENV NEXT_PUBLIC_AUTH_URL=$NEXT_PUBLIC_AUTH_URL

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @nook/auth-web build

# =============================================================
# 3단계: runner
# =============================================================
FROM node:22-slim AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# standalone의 server.js는 이 두 변수를 읽는다. 0.0.0.0 이어야 컨테이너 밖에서 접속된다.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

WORKDIR /app

# next.config.ts의 output:'standalone' 이 .next/standalone 에
# 실행에 필요한 파일 + 최소 node_modules 를 알아서 추려 담아준다.
# outputFileTracingRoot를 워크스페이스 루트로 잡았으므로
# standalone 안에도 apps/auth/web/... 구조가 그대로 유지된다.
COPY --from=build /repo/apps/auth/web/.next/standalone ./

# standalone은 public 과 .next/static 을 "일부러" 포함하지 않는다(원래 CDN이 담당하는 영역).
# 우리는 CDN이 없으니 직접 넣어줘야 한다. 안 넣으면 CSS/이미지가 전부 깨진다.
COPY --from=build /repo/apps/auth/web/.next/static ./apps/auth/web/.next/static
COPY --from=build /repo/apps/auth/web/public ./apps/auth/web/public

USER node
EXPOSE 3000

CMD ["node", "apps/auth/web/server.js"]
