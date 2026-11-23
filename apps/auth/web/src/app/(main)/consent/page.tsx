'use client';

import { AUTH_URL } from '@/shared/config/auth';
import { Checkbox } from '@/shared/ui/checkbox';
import { SubmitButton } from '@/shared/ui/submit-button';
import { MapPin } from 'lucide-react';
import { use, useState, useTransition } from 'react';

type SearchParams = Record<string, string | string[] | undefined>;

// 에러 박스 안에서 반짝이는 별 (위치·색·반짝이는 박자를 조금씩 다르게)
const ERROR_STARS = [
  { top: '22%', left: '10%', color: '#ffffff', delay: '0s' },
  { top: '18%', left: '80%', color: '#ffffff', delay: '0.8s' },
  { top: '72%', left: '90%', color: '#FFD23F', delay: '1.4s' },
  { top: '82%', left: '55%', color: '#FF8FAB', delay: '0.4s' },
  { top: '12%', left: '38%', color: '#3A86FF', delay: '1.9s' },
];

const SCOPE_LABELS: Record<string, string> = {
  openid: '로그인 정보 (회원 식별)',
  email: '이메일 주소',
  profile: '이름 · 프로필 사진',
};

export default function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = use(searchParams);
  const clientId = typeof params.client_id === 'string' ? params.client_id : '';
  const requested =
    typeof params.scope === 'string' ? params.scope.split(/\s+/) : [];

  // 처음엔 요청한 scope 전부 체크된 상태로 시작
  const [picked, setPicked] = useState<string[]>(requested);

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<'accept' | 'deny' | null>(null);

  function toggle(scope: string, checked: boolean) {
    setPicked((prev) =>
      checked ? [...prev, scope] : prev.filter((s) => s !== scope),
    );
  }

  function submit(accept: boolean) {
    setAction(accept ? 'accept' : 'deny');

    startTransition(async () => {
      try {
        const res = await fetch(`${AUTH_URL}/api/oidc/consent`, {
          method: 'POST',
          credentials: 'include', // 로그인 세션 쿠키
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // 받은 쿼리를 그대로 돌려준다 (서명 sig·exp 포함, 손대면 400)
            oauth_query: window.location.search.slice(1),
            accept,
            // 요청 순서 유지
            scope: accept
              ? requested.filter((s) => picked.includes(s)).join(' ')
              : undefined,
          }),
        });

        if (!res.ok) {
          setError(
            res.status === 400
              ? '요청이 만료되었거나 올바르지 않습니다. 앱에서 다시 시도해 주세요.'
              : '처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
          );
          return;
        }

        const { url } = (await res.json()) as { url: string };
        window.location.href = url; // RP 로 (code 또는 error=access_denied)
      } catch {
        setError('서버에 연결할 수 없습니다.');
      }
    });
  }

  if (!clientId || requested.length === 0) {
    return (
      <main className="flex flex-1 items-center justify-center p-4">
        <p className="text-muted-foreground text-sm">잘못된 접근입니다.</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 justify-center bg-gradient-to-b from-black via-neutral-950 to-black sm:items-center sm:p-4">
      <section className="w-full max-w-md px-6 pt-10 pb-8 sm:rounded-md sm:bg-black/75 sm:px-14 sm:py-12">
        <h1 className="text-2xl font-bold break-keep text-white sm:text-3xl">
          {clientId} 에 정보 제공
        </h1>
        <p className="mt-3 text-base break-keep text-neutral-400">
          허용하면 이 앱이 아래 정보를 볼 수 있습니다.
        </p>

        <ul className="mt-8 space-y-4">
          {requested.map((scope) => (
            <li key={scope} className="flex items-center gap-3 ">
              {/* openid 는 빼면 로그인이 안 되니까 항상 체크 (끌 수 없음) */}
              <Checkbox
                id={`scope-${scope}`}
                checked={scope === 'openid' || picked.includes(scope)}
                disabled={scope === 'openid' || pending}
                onCheckedChange={(v) => toggle(scope, v === true)}
                className="cursor-pointer [&_svg]:stroke-3"
              />
              <label
                htmlFor={`scope-${scope}`}
                className="text-base text-neutral-200 cursor-pointer"
              >
                {SCOPE_LABELS[scope] ?? scope}
              </label>
            </li>
          ))}
        </ul>

        {error && (
          <div
            // key = 문구: 문구가 바뀔 때만 박스를 새로 만들어 애니메이션 재생 (같은 에러 반복이면 가만히)
            key={error}
            role="alert"
            // motion-safe: '움직임 줄이기' 설정한 사용자에겐 애니메이션 안 함
            className="group relative mt-6 flex items-start gap-3 overflow-hidden rounded-2xl border border-dashed border-white/25 bg-white/[0.03] px-4 py-3.5 text-sm text-neutral-100 transition-colors duration-300 hover:border-white/50 hover:bg-white/[0.06] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-300"
          >
            {ERROR_STARS.map((star) => (
              <span
                key={`${star.top}-${star.left}`}
                aria-hidden
                className="absolute size-[2px] rounded-full opacity-60 motion-safe:animate-twinkle"
                style={{
                  top: star.top,
                  left: star.left,
                  backgroundColor: star.color,
                  boxShadow: `0 0 4px ${star.color}`,
                  animationDelay: star.delay,
                }}
              />
            ))}
            <MapPin className="relative mt-0.5 size-4 shrink-0 fill-[#E63946] text-[#E63946] drop-shadow-[0_0_6px_rgba(230,57,70,0.7)] transition-transform duration-300 group-hover:-translate-y-0.5 motion-safe:animate-pin-drop [&_circle]:fill-white [&_circle]:stroke-white" />
            <p className="relative break-keep">{error}</p>
          </div>
        )}

        <div className="mt-10 space-y-3">
          <SubmitButton
            loading={pending && action === 'accept'}
            disabled={pending}
            spinnerOnly
            onClick={() => submit(true)}
          >
            허용
          </SubmitButton>

          <SubmitButton
            variant="ghost"
            className="bg-neutral-700/60 text-base hover:bg-neutral-700/70!"
            loading={pending && action === 'deny'}
            disabled={pending}
            onClick={() => submit(false)}
          >
            거부
          </SubmitButton>
        </div>
      </section>
    </main>
  );
}
