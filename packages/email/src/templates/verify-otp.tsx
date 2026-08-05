import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
  pixelBasedPreset,
} from 'react-email';

export type OtpPurpose =
  'sign-in' | 'email-verification' | 'forget-password' | 'change-email';

interface OtpCopy {
  /** 메일 제목. 코드를 앞에 두면 알림 목록에서 열지 않고도 읽힌다. */
  subject: (otp: string) => string;
  heading: string;
  description: string;
}

export const OTP_COPY: Record<OtpPurpose, OtpCopy> = {
  // 가입 흐름에서는 나가지 않는다. 사용자가 계정 화면에서 직접 인증을 요청할 때만
  // 발송되므로 "가입을 마치려면" 같은 문구를 쓰면 안 된다.
  'email-verification': {
    subject: (otp) => `${otp} — NookBox 이메일 인증 코드`,
    heading: '이메일 주소를 확인해주세요',
    description:
      '이 주소가 회원님의 것인지 확인하기 위해 아래 인증 코드를 입력해주세요.',
  },
  'sign-in': {
    subject: (otp) => `${otp} — NookBox 로그인 코드`,
    heading: '로그인 코드',
    description: '로그인 화면에 아래 코드를 입력해주세요.',
  },
  'forget-password': {
    subject: (otp) => `${otp} — NookBox 비밀번호 재설정 코드`,
    heading: '비밀번호를 재설정합니다',
    description:
      '비밀번호 재설정 화면에 아래 코드를 입력하면 새 비밀번호를 정할 수 있습니다.',
  },
  'change-email': {
    subject: (otp) => `${otp} — NookBox 이메일 변경 코드`,
    heading: '새 이메일 주소를 확인해주세요',
    description:
      '이 주소를 NookBox 계정 이메일로 사용하려면 아래 코드를 입력해주세요.',
  },
};

export interface VerifyOtpProps {
  /** 이 메일이 어떤 흐름에서 나갔는지. 문구와 제목이 여기서 갈린다. */
  purpose: OtpPurpose;
  /** 사용자가 화면에 입력할 일회용 코드. */
  otp: string;
  /** 받는 사람 이름. 없으면 인사말을 생략한다. */
  userName?: string;
  /**
   * 코드 유효 시간(분).
   * ⚠️ auth 앱의 emailOTP({ expiresIn }) 과 반드시 같은 값이어야 한다.
   *    여기 숫자만 고치면 "10분"이라 써놓고 5분에 만료되는 메일이 나간다.
   */
  expiresInMinutes?: number;
}

export const VerifyOtp = ({
  purpose,
  otp,
  userName,
  expiresInMinutes = 10,
}: VerifyOtpProps) => {
  const copy = OTP_COPY[purpose];

  return (
    <Html lang="ko">
      <Head>
        {/*
          iOS Mail 은 6자리 숫자를 전화번호로 보고 자동으로 tel: 링크를 건다.
          그러면 코드가 파란 링크가 되어 탭했을 때 전화 앱이 뜬다. 이걸 막는다.
        */}
        <meta name="format-detection" content="telephone=no" />
      </Head>

      {/*
        코드를 미리보기에 넣으면 알림만 보고도 입력할 수 있어 이탈이 준다.
        대신 잠금화면에도 노출되므로, 민감도를 더 높이려면 여기서 코드를 빼면 된다.
      */}
      <Preview>{`${otp} · ${expiresInMinutes}분 안에 입력해주세요`}</Preview>

      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Body className="bg-neutral-100 py-10 font-sans">
          <Container className="mx-auto w-full max-w-[480px] rounded-[10px] border border-solid border-neutral-200 bg-white px-10 py-10">
            <Heading className="m-0 text-[20px] font-semibold text-neutral-950">
              {copy.heading}
            </Heading>

            <Text className="mt-4 mb-0 text-[15px] leading-[24px] text-neutral-600">
              {userName ? `${userName}님, ` : ''}
              {copy.description}
            </Text>

            <Section className="mt-8 mb-8">
              <Text className="m-0 rounded-[10px] bg-neutral-100 py-5 text-center font-mono text-[32px] leading-[40px] font-semibold tracking-[8px] text-neutral-950">
                {otp}
              </Text>
            </Section>

            <Text className="m-0 text-[13px] leading-[20px] text-neutral-500">
              이 코드는 {expiresInMinutes}분 후 만료됩니다. 코드는 요청한 화면에
              직접 입력해주세요.
            </Text>

            <Hr className="my-8 border-neutral-200" />

            <Text className="m-0 text-[13px] leading-[20px] text-neutral-500">
              본인이 요청한 것이 아니라면 이 코드를 입력하지 마세요.
              <br />
              NookBox는 어떤 경우에도 이 코드를 묻지 않습니다.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

// react-email 프리뷰(:3002)에서 이 값으로 렌더된다. 실제 발송에는 쓰이지 않는다.
VerifyOtp.PreviewProps = {
  purpose: 'email-verification',
  otp: '284913',
  userName: '홍길동',
  expiresInMinutes: 10,
} satisfies VerifyOtpProps;

export default VerifyOtp;
