# syntax=docker/dockerfile:1
#
# @nook/auth (NestJS OIDC 서버) 운영 이미지
#
# 빌드 컨텍스트는 "워크스페이스 루트"다. apps/auth 가 아니다.
# pnpm 모노레포는 루트의 pnpm-lock.yaml 하나로 모든 앱의 의존성을 관리하기 때문에,
# 루트를 못 보면 설치 자체가 불가능하다.
#
#   docker build -f apps/auth/Dockerfile -t nook-auth .
#                   ^^^^^^^^^^^^^^^^^^^^            ^ 컨텍스트 = 루트

# =============================================================
# base — 모든 스테이지가 공유하는 출발점
# =============================================================
# alpine 대신 slim(Debian)을 쓴다. Next.js가 쓰는 sharp 같은 네이티브 모듈이
# alpine의 musl libc + arm64 조합에서 종종 깨지는데, slim은 일반 glibc라 그냥 된다.
# 이미지가 조금 크지만 삽질 시간이 훨씬 싸다.
FROM node:22-slim AS base

# corepack = Node에 내장된 패키지 매니저 버전 관리자.
# package.json의 packageManager 필드를 무시하고 여기서 명시적으로 못박는다.
# 이렇게 해야 "내 맥에서는 되는데 서버에서는 안 되는" 버전 차이가 안 생긴다.
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /repo

# =============================================================
# 1단계: deps — 의존성 설치
# =============================================================
FROM base AS deps

# 핵심 트릭: 소스코드보다 package.json을 "먼저" 복사한다.
# 도커는 레이어 단위로 캐시하는데, COPY한 파일이 안 바뀌면 그 아래 RUN도 건너뛴다.
# 소스만 고쳤을 때 pnpm install을 다시 안 하려고 이렇게 나눈다.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/auth/package.json apps/auth/
COPY apps/auth/web/package.json apps/auth/web/
# @nook/email — auth가 workspace:* 로 의존한다.
# package.json이 없으면 --frozen-lockfile 이 lock과 불일치로 터진다.
COPY packages/email/package.json packages/email/

# --frozen-lockfile: lock 파일과 조금이라도 다르면 에러. 재현성 보장
# --filter "@nook/auth...": auth와 그 의존성만 설치 (Next.js 앱 의존성은 건너뜀)
# --mount=type=cache: pnpm 스토어를 빌드 간에 재사용. 두 번째 빌드부터 훨씬 빠름
RUN --mount=type=cache,id=pnpm-idp,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter "@nook/auth..."

# =============================================================
# 2단계: build — 타입스크립트 컴파일
# =============================================================
FROM deps AS build

COPY apps/auth/tsconfig.json apps/auth/tsconfig.build.json apps/auth/nest-cli.json apps/auth/
COPY apps/auth/src apps/auth/src
COPY packages/email/tsconfig.json packages/email/
COPY packages/email/src packages/email/src

# "@nook/auth..." = auth + auth가 의존하는 워크스페이스 패키지들.
# pnpm이 위상 순서로 돌려주므로 @nook/email(dist/)이 먼저 만들어지고,
# 그 다음 nest build 가 실행된다. @nook/email의 main이 dist/index.js 라서
# 순서가 뒤집히면 타입 해석부터 깨진다.
RUN pnpm --filter "@nook/auth..." build

# 운영에 필요한 것만 /out 으로 추출한다.
# pnpm은 node_modules를 심볼릭 링크 그물로 엮어서 그냥 COPY하면 링크가 깨진다.
# `pnpm deploy`가 링크를 풀어 독립적인 폴더로 만들어준다.
# --prod: devDependencies 제외 / --legacy: pnpm 10에서 공유 lockfile 워크스페이스에 필요
RUN pnpm --filter @nook/auth deploy --prod --legacy /out

# better-auth는 지원하는 모든 프레임워크(next, react, svelte, vue, prisma...)를
# optional peerDependency로 선언한다. 원래는 안 깔려야 하는데,
# 이 워크스페이스에는 Next 앱(@nook/auth-web)이 같이 있고 .npmrc에
# dedupe-peer-dependents=true 라서 better-auth 해석이 두 앱 사이에 공유된다.
# 그 결과 API 서버인 여기에도 next + swc 바이너리가 290MB쯤 딸려온다.
#
# 이 서버는 better-auth/node 만 쓰므로 전부 죽은 무게다. 명시적으로 제거한다.
# (제거 후 실제로 부팅되는지 아래 HEALTHCHECK와 별개로 반드시 실행 검증할 것)
RUN rm -rf /out/node_modules/.pnpm/next@* \
           /out/node_modules/.pnpm/@next+* \
           /out/node_modules/next \
           /out/node_modules/@next

# =============================================================
# (별도) migrate — drizzle 마이그레이션 전용 이미지
# =============================================================
# drizzle-kit은 devDependency라 아래 runner에는 없다.
# 앱 시작과 분리해서 일회성으로 돌리는 스테이지를 따로 둔다.
#
#   docker build -f apps/auth/Dockerfile --target migrate -t nook-auth-migrate .
#   docker run --rm --env-file .env nook-auth-migrate
FROM deps AS migrate

COPY apps/auth/tsconfig.json apps/auth/drizzle.config.ts apps/auth/
COPY apps/auth/drizzle apps/auth/drizzle
COPY apps/auth/src apps/auth/src

WORKDIR /repo/apps/auth
CMD ["pnpm", "exec", "drizzle-kit", "migrate"]

# =============================================================
# (별도) seed — RP(OAuth client) 등록 전용 이미지
# =============================================================
# tsx 도 devDependency 라 runner 에는 없다. migrate 와 같은 이유로 분리한다.
#
#   docker compose --env-file .env.prod -f docker-compose.prod.yml \
#     --profile seed run --rm --build seed
#
# ⚠️ --build 를 빼면 안 된다. compose run 은 이미지가 있으면 그대로 쓴다.
#    등록할 client 목록이 이 이미지 안에 COPY 된 스크립트에 들어있어서,
#    옛 이미지로 돌리면 옛 설정으로 등록되고도 성공한 것처럼 끝난다.
#
# deps 가 아니라 build 에서 출발하는 이유: 이 스크립트가 src/lib/auth 를 import 하고
# 그게 @nook/email 을 끌어온다. @nook/email 의 main 은 dist/index.js 라서
# 빌드가 끝난 스테이지가 아니면 import 부터 깨진다.
#
# ⚠️ 운영 postgres 는 호스트 포트를 열지 않는다. 그래서 맥에서 직접 못 돌리고
#    compose 네트워크 안의 일회성 컨테이너로 돌려야 한다.
#
# ⚠️ client_secret 은 생성 시 딱 한 번만 평문으로 출력된다. 로그를 놓치면
#    oauth_client 의 해당 row 를 지우고 다시 돌려서 새로 발급받는 수밖에 없다.
FROM build AS seed

COPY apps/auth/scripts apps/auth/scripts

WORKDIR /repo/apps/auth
CMD ["pnpm", "exec", "tsx", "scripts/seed-oauth-client.ts"]

# =============================================================
# 3단계: runner — 실제로 배포되는 이미지 (기본 타깃이라 맨 끝에 둔다)
# =============================================================
# 여기서 FROM을 새로 시작하는 게 멀티스테이지의 핵심이다.
# 위 스테이지들(pnpm, 컴파일러, devDependencies, 소스코드)은 전부 버려지고,
# 아래에서 COPY --from 으로 명시적으로 가져온 것만 최종 이미지에 남는다.
FROM node:22-slim AS runner

ENV NODE_ENV=production
WORKDIR /app

# 필요한 것 딱 두 개: 운영 의존성 + 컴파일된 JS
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /repo/apps/auth/dist ./dist

# root로 돌리지 않는다. 컨테이너가 뚫려도 권한을 최소화.
# node:22-slim 이미지에 이미 있는 유저다.
USER node

# 문서용 표시일 뿐, 실제로 포트를 여는 건 compose의 ports다.
EXPOSE 3001

CMD ["node", "dist/main.js"]
