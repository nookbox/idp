import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
  pixelBasedPreset,
} from 'react-email';

export interface VerifyEmailProps {
  /** 받는 사람 이름 */
  userName?: string;
  /** 클릭 시 인증이 완료되는 절대 URL. */
  verificationUrl: string;
  /** 링크 유효 시간(분) */
  expiresInMinutes?: number;
}

export const VerifyEmail = ({
  userName,
  verificationUrl,
  expiresInMinutes = 60,
}: VerifyEmailProps) => (
  <Html lang="ko">
    <Head />

    <Preview>{`이메일 주소를 확인해주세요 · ${expiresInMinutes}분 안에 완료해야 합니다`}</Preview>

    <Tailwind config={{ presets: [pixelBasedPreset] }}>
      <Body className="bg-neutral-100 py-10 font-sans">
        <Container className="mx-auto w-full max-w-[480px] rounded-[10px] border border-solid border-neutral-200 bg-white px-10 py-10">
          <Heading className="m-0 text-[20px] font-semibold text-neutral-950">
            이메일 주소를 확인해주세요
          </Heading>

          <Text className="mt-4 mb-0 text-[15px] leading-[24px] text-neutral-600">
            {userName ? `${userName}님, ` : ''}
            NookBox 계정 생성을 마치려면 아래 버튼을 눌러 이메일 주소를
            확인해주세요.
          </Text>

          <Section className="mt-8 mb-8">
            <Button
              href={verificationUrl}
              className="box-border block rounded-[10px] bg-neutral-900 px-5 py-3 text-center text-[15px] font-medium text-white no-underline"
            >
              이메일 인증하기
            </Button>
          </Section>

          {/*
            버튼이 막히는 환경(사내메일, 텍스트 모드)을 위한 대체 경로.
            빼면 그런 환경의 사용자는 인증을 아예 못 한다.
          */}
          <Text className="m-0 text-[13px] leading-[20px] text-neutral-500">
            버튼이 눌리지 않으면 아래 주소를 복사해 브라우저에 붙여넣으세요.
          </Text>
          <Text className="mt-2 mb-0 text-[13px] leading-[20px] break-all">
            <Link href={verificationUrl} className="text-neutral-900 underline">
              {verificationUrl}
            </Link>
          </Text>

          <Hr className="my-8 border-neutral-200" />

          <Text className="m-0 text-[13px] leading-[20px] text-neutral-500">
            이 링크는 {expiresInMinutes}분 후 만료됩니다.
            <br />
            본인이 요청한 것이 아니라면 이 메일을 무시하셔도 됩니다.
          </Text>

          {/* 1. TODO: nookbox 랜딩페이지로보내고 */}
          {/* 2. TODO: nookbox가 어떤 서비스인지 설명하기 */}
          {/* 
          <Text className="mt-6 mb-0 text-[12px] leading-[18px] text-neutral-400">
              <Link href={v} className="text-neutral-900 underline">
              NookBox
            </Link>,
          </Text> */}
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

// react-email 프리뷰(:3002)에서 이 값으로 렌더된다. 실제 발송에는 쓰이지 않는다.
VerifyEmail.PreviewProps = {
  userName: '홍길동',
  // better-auth 는 auth 서버(로컬 3001)의 /api/auth 에 마운트돼 있다. main.ts:54
  verificationUrl:
    'http://localhost:3001/api/auth/verify-email?token=eyJhbGciOiJIUzI1NiJ9.example-token-value',
  expiresInMinutes: 60,
} satisfies VerifyEmailProps;

export default VerifyEmail;
