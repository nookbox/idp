import { randomUUID } from 'node:crypto';

import { Logger } from '@nestjs/common';
import {
  renderResetPasswordLink,
  renderVerifyEmailLink,
  renderVerifyOtp,
  type OtpPurpose,
  type RenderedEmail,
} from '@nook/email';
import { Resend } from 'resend';

const logger = new Logger('Mailer');

const isProduction = process.env.NODE_ENV === 'production';

export const OTP_EXPIRES_IN_SECONDS = 20; // 테스트용, 추후 600으로 변경
export const OTP_EXPIRES_IN_MINUTES = OTP_EXPIRES_IN_SECONDS / 60;

/**
 * 이메일 인증 링크 유효 시간.
 * OTP 와 달리 사용자가 메일함을 나중에 열어도 되도록 넉넉하게 잡는다.
 */
export const VERIFY_LINK_EXPIRES_IN_SECONDS = 60 * 60;
export const VERIFY_LINK_EXPIRES_IN_MINUTES =
  VERIFY_LINK_EXPIRES_IN_SECONDS / 60;

/**
 * 비밀번호 재설정 링크 유효 시간.
 * 이메일 인증 링크(1시간)보다 짧게 잡는다. 이 링크를 쥔 사람은 비밀번호를
 * 바꿀 수 있으므로, 메일함이 잠깐 열려 있던 사이에 새는 창을 줄인다.
 */
export const RESET_PASSWORD_LINK_EXPIRES_IN_SECONDS = 30 * 60;
export const RESET_PASSWORD_LINK_EXPIRES_IN_MINUTES =
  RESET_PASSWORD_LINK_EXPIRES_IN_SECONDS / 60;

const apiKey = process.env.RESEND_API_KEY;

/**
 * 반드시 Resend 에서 도메인 인증(SPF/DKIM)을 끝낸 주소여야 한다.
 * 인증 안 된 도메인으로 보내면 발송 자체가 거부되거나 스팸함으로 직행한다.
 * 형식: "표시이름 <주소>"
 */
const from = process.env.EMAIL_FROM ?? 'NookBox <onboarding@resend.dev>';

if (isProduction && !apiKey) {
  throw new Error(
    'RESEND_API_KEY 가 없습니다. 메일을 보낼 수 없으므로 기동을 중단합니다.',
  );
}
if (!apiKey) {
  logger.warn(
    'RESEND_API_KEY 가 없습니다. 메일은 발송되지 않고 코드·링크가 이 콘솔에 출력됩니다.',
  );
} else if (!process.env.EMAIL_FROM) {
  logger.warn(
    `EMAIL_FROM 이 없어 기본값(${from})을 씁니다. 이 주소는 Resend 가입 계정 본인 메일로만 발송됩니다.`,
  );
}

const resend = apiKey ? new Resend(apiKey) : null;

interface DeliverParams {
  to: string;
  /** 로그 문구에 쓰이는 메일 종류. "OTP", "인증 링크" 처럼 사람이 읽을 이름. */
  kind: string;
  /** 렌더는 발송이 확정된 뒤에만 돈다. dev 폴백에서는 아예 호출되지 않는다. */
  render: () => Promise<RenderedEmail>;
  /**
   * 모든 로그에 붙는 식별 정보.
   * ⚠️코드·토큰 같은 비밀값을 넣으면 안 된다. 운영 로그에 그대로 남는다.
   */
  context?: string;
  /** dev 폴백 로그에만 붙는다. 메일이 안 나가므로 코드·링크를 여기 담아 확인한다. */
  devContext?: string;
}

function tag(...parts: (string | undefined)[]): string {
  const joined = parts.filter(Boolean).join(' ');
  return joined ? ` ${joined}` : '';
}

async function deliver({
  to,
  kind,
  render,
  context,
  devContext,
}: DeliverParams): Promise<void> {
  try {
    if (!resend) {
      logger.warn(
        `[DEV] RESEND_API_KEY 없음 — 메일 대신 콘솔 출력. to=${to}${tag(context, devContext)}`,
      );
      return;
    }

    const { subject, html, text } = await render();

    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
      headers: {
        // Gmail 은 제목이 비슷한 메일을 한 스레드로 묶는다. 그러면 사용자가 접힌
        // 예전 메일을 열어 만료된 코드·링크를 쓰고 "안 된다"가 반복된다.
        // 매번 다른 참조 ID 를 주면 각 메일이 별도 스레드로 분리된다.
        'X-Entity-Ref-ID': randomUUID(),
      },
    });

    if (error) {
      logger.error(
        `${kind} 메일 발송 실패 (Resend 응답).${tag(context)} name=${error.name} message=${error.message}`,
      );
      return;
    }

    logger.log(`${kind} 메일 발송 완료.${tag(context)} id=${data?.id}`);
  } catch (err) {
    // 렌더 실패, 네트워크 오류 등.
    logger.error(
      `${kind} 메일 발송 실패 (예외).${tag(context)}`,
      err instanceof Error ? err.stack : String(err),
    );
  }
}

/**
 * OTP 메일 발송.
 */
export function sendOtpEmail(params: {
  email: string;
  otp: string;
  purpose: OtpPurpose;
  userName?: string;
}): Promise<void> {
  const { email, otp, purpose, userName } = params;

  return deliver({
    to: email,
    kind: 'OTP',
    context: `purpose=${purpose}`,
    devContext: `otp=${otp}`,
    render: () =>
      renderVerifyOtp({
        purpose,
        otp,
        userName,
        expiresInMinutes: OTP_EXPIRES_IN_MINUTES,
      }),
  });
}

/**
 * 이메일 인증 링크 메일 발송.
 */
export function sendVerificationLinkEmail(params: {
  email: string;
  url: string;
  userName?: string;
}): Promise<void> {
  const { email, url, userName } = params;

  return deliver({
    to: email,
    kind: '인증 링크',
    devContext: `url=${url}`,
    render: () =>
      renderVerifyEmailLink({
        url,
        userName,
        expiresInMinutes: VERIFY_LINK_EXPIRES_IN_MINUTES,
      }),
  });
}

/**
 * 비밀번호 재설정 링크 메일 발송.
 */
export function sendResetPasswordLinkEmail(params: {
  email: string;
  url: string;
  userName?: string;
}): Promise<void> {
  const { email, url, userName } = params;

  return deliver({
    to: email,
    kind: '비밀번호 재설정',
    devContext: `reset-url=${url}`,
    render: () =>
      renderResetPasswordLink({
        url,
        userName,
        expiresInMinutes: RESET_PASSWORD_LINK_EXPIRES_IN_MINUTES,
      }),
  });
}
