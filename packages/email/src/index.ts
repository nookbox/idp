import { render, toPlainText } from 'react-email';

import {
  OTP_COPY,
  VerifyOtp,
  type OtpPurpose,
  type VerifyOtpProps,
} from './templates/verify-otp';
import {
  VERIFY_EMAIL_LINK_SUBJECT,
  VerifyEmailLink,
  type VerifyEmailLinkProps,
} from './templates/verify-email-link';

export { OTP_COPY, VerifyOtp, VERIFY_EMAIL_LINK_SUBJECT, VerifyEmailLink };
export type { OtpPurpose, VerifyOtpProps, VerifyEmailLinkProps };

/** 발송 라이브러리(Resend 등)에 그대로 넘길 수 있는 형태. */
export interface RenderedEmail {
  subject: string;
  html: string;
  /**
   * 텍스트 대체본. 안 넣으면 일부 스팸 필터가 감점을 주고,
   * 텍스트 전용 클라이언트에서는 빈 메일로 보인다.
   */
  text: string;
}

export async function renderVerifyOtp(
  props: VerifyOtpProps,
): Promise<RenderedEmail> {
  const element = VerifyOtp(props);

  const html = await render(element);
  const text = toPlainText(html);

  return {
    subject: OTP_COPY[props.purpose].subject(props.otp),
    html,
    text,
  };
}

export async function renderVerifyEmailLink(
  props: VerifyEmailLinkProps,
): Promise<RenderedEmail> {
  const element = VerifyEmailLink(props);

  const html = await render(element);
  const text = toPlainText(html);

  return {
    subject: VERIFY_EMAIL_LINK_SUBJECT,
    html,
    text,
  };
}
