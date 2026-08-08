import { UAParser } from 'ua-parser-js';

export function describeUserAgent(ua?: string | null) {
  if (!ua) return '알 수 없는 기기';
  const { browser, os } = UAParser(ua);
  return (
    [os.name, browser.name].filter(Boolean).join(' · ') || '알 수 없는 기기'
  );
}
