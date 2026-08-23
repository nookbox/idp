'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * 다시 보낼 수 있는 시각(에폭 ms)을 읽어 남은 초로 바꾼다.
 * 저장하는 값이 "남은 초"가 아니라 "만료 시각"인 게 핵심이다. 남은 초를 저장해
 * 1씩 깎으면, 탭이 백그라운드로 갔을 때 브라우저가 타이머를 늦춘 만큼 카운트가
 * 뒤처져 실제로는 풀렸는데도 화면은 계속 잠겨 있게 된다.
 */
function readRemaining(storageKey: string): number {
  if (typeof window === 'undefined') return 0;

  const until = Number(localStorage.getItem(storageKey));
  if (!Number.isFinite(until) || until <= 0) return 0;

  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}

/**
 * 새로고침을 넘어 살아남는 재전송 쿨다운.
 *
 * @param storageKey 화면마다 달라야 한다. 같이 쓰면 한쪽에서 보낸 쿨다운이
 *                   다른 쪽 버튼까지 잠근다.
 */
export function useCooldown(storageKey: string) {
  const [remaining, setRemaining] = useState(0);

  // 저장된 값 → 화면. 서버 렌더 시점엔 localStorage 를 읽을 수 없으므로
  // 초기값 0 으로 그리고 마운트 후에 복원한다(하이드레이션 불일치 방지).
  useEffect(() => {
    const sync = () => setRemaining(readRemaining(storageKey));
    sync();

    // 다른 탭에서 같은 화면을 열고 보냈을 수 있다. 그쪽 쿨다운도 반영한다.
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey) sync();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [storageKey]);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(
      () => setRemaining(readRemaining(storageKey)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [remaining, storageKey]);

  const start = useCallback(
    (seconds: number) => {
      if (seconds <= 0) return;
      localStorage.setItem(storageKey, String(Date.now() + seconds * 1000));
      setRemaining(seconds);
    },
    [storageKey],
  );

  return { remaining, start };
}
