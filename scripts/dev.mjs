#!/usr/bin/env node
/**
 * 루트 `pnpm run dev` 진입점.
 * 워크스페이스 dev 를 전부 띄우고, 서버가 실제로 응답하면 접속 주소를 배너로 출력한다.
 */
import { spawn } from 'node:child_process';

const WEB_PORT = Number(process.env.WEB_PORT) || 3000;
const AUTH_PORT = Number(process.env.PORT) || 3001;

const MAIL_PORT = Number(process.env.MAIL_PREVIEW_PORT) || 3002;

// 배너에 표시할 주소 목록. 준비 여부는 프론트(WEB_PORT) 기준으로만 판단한다.
const TARGETS = [
  { name: 'Web  (Next.js)', url: `http://localhost:${WEB_PORT}` },
  { name: 'Auth (NestJS) ', url: `http://localhost:${AUTH_PORT}` },
  { name: 'Mail preview  ', url: `http://localhost:${MAIL_PORT}` },
];
const READY_URL = `http://localhost:${WEB_PORT}`;

const child = spawn(
  'pnpm',
  ['-r', '--parallel', '--reporter=append-only', 'dev'],
  { stdio: 'inherit', shell: process.platform === 'win32' },
);

let bannerShown = false;

async function isUp(url) {
  try {
    // 4xx/5xx 도 "떠 있음"으로 간주한다. 연결이 되는지만 본다.
    await fetch(url, { signal: AbortSignal.timeout(1500) });
    return true;
  } catch {
    return false;
  }
}

function printBanner() {
  const lines = TARGETS.map((t) => `  ${t.name}  ${t.url}`);
  const width = Math.max(...lines.map((l) => l.length)) + 2;
  const bar = '─'.repeat(width);

  process.stdout.write(
    `\n\x1b[32m┌${bar}┐\n` +
      `│${' 개발 서버 준비 완료'.padEnd(width - 8)}│\n` +
      `├${bar}┤\n` +
      lines.map((l) => `│\x1b[0m${l.padEnd(width)}\x1b[32m│`).join('\n') +
      `\n└${bar}┘\x1b[0m\n\n`,
  );
}

async function waitForServers() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline && !bannerShown && child.exitCode === null) {
    if (await isUp(READY_URL)) {
      bannerShown = true;
      printBanner();
      return;
    }
    await new Promise((r) => setTimeout(r, 700));
  }
}

waitForServers();

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => child.kill(sig));
}

child.on('exit', (code, signal) => {
  process.exit(signal ? 1 : (code ?? 0));
});
