'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

type ConsentResponse = {
  redirect?: boolean;
  url?: string;
  redirectURI?: string;
};

export default function ConsentPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<'accept' | 'deny' | null>(null);
  const searchParams = useSearchParams();

  const { clientId, scope } = useMemo(
    () => ({
      clientId: searchParams.get('client_id') ?? '',
      scope: searchParams.get('scope') ?? '',
    }),
    [searchParams],
  );

  const scopes = useMemo(
    () =>
      scope
        .split(' ')
        .map((s) => s.trim())
        .filter(Boolean),
    [scope],
  );

  async function submitConsent(accept: boolean) {
    setError(null);
    setLoading(accept ? 'accept' : 'deny');

    const { data, error: consentError } = await authClient.oauth2.consent({
      accept,
    });
    setLoading(null);

    if (consentError) {
      setError(consentError.message ?? '동의 처리에 실패했습니다');
      return;
    }

    const redirectUrl =
      (data as ConsentResponse | null)?.url ??
      (data as ConsentResponse | null)?.redirectURI;
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  }

  return (
    <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">권한 승인</h1>
        <p className="text-sm text-gray-500 mt-1">
          이 서비스가 Nook Auth 계정 정보를 요청합니다
        </p>
      </div>

      <div className="space-y-4 text-sm">
        <div className="space-y-1">
          <p className="font-medium">Client ID</p>
          <p className="text-gray-600 break-all">
            {clientId || '알 수 없는 client'}
          </p>
        </div>

        <div className="space-y-2">
          <p className="font-medium">요청 권한</p>
          {scopes.length > 0 ? (
            <ul className="space-y-1">
              {scopes.map((item) => (
                <li
                  key={item}
                  className="rounded-md border border-gray-200 px-3 py-2 text-gray-700"
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">요청된 scope가 없습니다</p>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => submitConsent(false)}
          className="py-2 rounded-md border border-gray-300 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          {loading === 'deny' ? '거절 중...' : '거절'}
        </button>
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => submitConsent(true)}
          className="py-2 rounded-md bg-black text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {loading === 'accept' ? '승인 중...' : '승인'}
        </button>
      </div>
    </div>
  );
}
