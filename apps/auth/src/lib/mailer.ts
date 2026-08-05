import { randomUUID } from 'node:crypto';

import { Logger } from '@nestjs/common';
import { renderVerifyOtp, type OtpPurpose } from '@nook/email';
import { Resend } from 'resend';

const logger = new Logger('Mailer');

const isProduction = process.env.NODE_ENV === 'production';

export const OTP_EXPIRES_IN_SECONDS = 600;
export const OTP_EXPIRES_IN_MINUTES = OTP_EXPIRES_IN_SECONDS / 60;

const apiKey = process.env.RESEND_API_KEY;

/**
 * 반드시 Resend 에서 도메인 인증(SPF/DKIM)을 끝낸 주소여야 한다.
 * 인증 안 된 도메인으로 보내면 발송 자체가 거부되거나 스팸함으로 직행한다.
 * 형식: "표시이름 <주소>"
 */
const from = process.env.EMAIL_FROM ?? 'NookBox <onboarding@resend.dev>';

if (isProduction && !apiKey) {
  throw new Error(
    'RESEND_API_KEY 가 없습니다. OTP 메일을 보낼 수 없으므로 기동을 중단합니다.',
  );
}

const resend = apiKey ? new Resend(apiKey) : null;

/**
 * OTP 메일 발송.
 *
 * ⚠️ 이 함수는 절대 throw 하지 않는다.
 *    better-auth 는 "이메일 발송을 await 하지 말라"고 권고한다. 발송 성공 여부가
 *    응답 시간에 드러나면 공격자가 그 차이로 가입된 주소인지 알아낼 수 있기 때문이다.
 *    그래서 호출부는 결과를 기다리지 않고, 실패는 여기서 로그로만 남긴다.
 *    대신 메일이 안 갔는데 API 는 200 을 주므로, 이 error 로그를 반드시 모니터링해야 한다.
 */
export async function sendOtpEmail(params: {
  email: string;
  otp: string;
  purpose: OtpPurpose;
  userName?: string;
}): Promise<void> {
  const { email, otp, purpose, userName } = params;

  try {
    if (!resend) {
      logger.warn(
        `[DEV] RESEND_API_KEY 없음 — 메일 대신 콘솔 출력. to=${email} purpose=${purpose} otp=${otp}`,
      );
      return;
    }

    const { subject, html, text } = await renderVerifyOtp({
      purpose,
      otp,
      userName,
      expiresInMinutes: OTP_EXPIRES_IN_MINUTES,
    });

    const { data, error } = await resend.emails.send({
      from,
      to: email,
      subject,
      html,
      text,
      headers: {
        // Gmail 은 제목이 비슷한 메일을 한 스레드로 묶는다. 그러면 사용자가
        // 접힌 예전 코드를 보고 입력해서 "코드가 틀렸다"가 반복된다.
        // 매번 다른 참조 ID 를 주면 각 메일이 별도 스레드로 분리된다.
        'X-Entity-Ref-ID': randomUUID(),
      },
    });

    // Resend SDK 는 API 오류를 throw 하지 않고 error 필드에 담아 돌려준다.
    // 이 분기를 빼면 발송 실패가 성공으로 조용히 지나간다.
    if (error) {
      logger.error(
        `OTP 메일 발송 실패 (Resend 응답). purpose=${purpose} name=${error.name} message=${error.message}`,
      );
      return;
    }

    logger.log(`OTP 메일 발송 완료. purpose=${purpose} id=${data?.id}`);
  } catch (err) {
    // 렌더 실패, 네트워크 오류 등. 여기서 막지 않으면 unhandled rejection 이 된다.
    logger.error(
      `OTP 메일 발송 실패 (예외). purpose=${purpose}`,
      err instanceof Error ? err.stack : String(err),
    );
  }
}
