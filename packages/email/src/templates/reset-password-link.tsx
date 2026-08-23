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

export interface ResetPasswordLinkProps {
  /** 클릭하면 재설정 화면이 열리는 일회용 URL. better-auth 가 토큰을 붙여 넘겨준다. */
  url: string;
  /** 받는 사람 이름. */
  userName?: string;
  /**
   * 링크 유효 시간(분).
   * ⚠️ auth 앱의 emailAndPassword({ resetPasswordTokenExpiresIn }) 과 반드시 같은
   *    값이어야 한다. 여기 숫자만 고치면 "30분"이라 써놓고 5분에 만료되는 메일이 나간다.
   */
  expiresInMinutes?: number;
}

export const RESET_PASSWORD_LINK_SUBJECT = 'NookBox 비밀번호 재설정';

export const ResetPasswordLink = ({
  url,
  userName,
  expiresInMinutes = 30,
}: ResetPasswordLinkProps) => (
  <Html lang="ko">
    <Head />

    <Preview>{`아래 버튼을 눌러 ${expiresInMinutes}분 안에 새 비밀번호를 정해주세요`}</Preview>

    <Tailwind config={{ presets: [pixelBasedPreset] }}>
      <Body className="bg-neutral-100 py-10 font-sans">
        <Container className="mx-auto w-full max-w-[480px] rounded-[10px] border border-solid border-neutral-200 bg-white px-10 py-10">
          <Heading className="m-0 text-[20px] font-semibold text-neutral-950">
            비밀번호를 재설정합니다
          </Heading>

          <Text className="mt-4 mb-0 text-[15px] leading-[24px] text-neutral-600">
            {userName ? `${userName}님, ` : ''}아래 버튼을 누르면 새 비밀번호를
            정하는 화면이 열립니다.
          </Text>

          <Section className="mt-8 mb-8 text-center">
            <Button
              href={url}
              className="rounded-[8px] bg-violet-600 px-6 py-3 text-center text-[15px] font-semibold text-white"
            >
              비밀번호 재설정하기
            </Button>
          </Section>

          <Text className="m-0 text-[13px] leading-[20px] text-neutral-500">
            버튼이 눌리지 않으면 아래 주소를 복사해 브라우저에 붙여넣어주세요.
          </Text>
          <Link
            href={url}
            className="mt-2 block text-[13px] leading-[20px] break-all text-violet-600"
          >
            {url}
          </Link>

          <Text className="mt-6 mb-0 text-[13px] leading-[20px] text-neutral-500">
            이 링크는 {expiresInMinutes}분 후 만료되며, 한 번만 쓸 수 있습니다.
          </Text>

          <Hr className="my-8 border-neutral-200" />

          <Text className="m-0 text-[13px] leading-[20px] text-neutral-500">
            본인이 요청한 것이 아니라면 이 메일을 무시하셔도 됩니다.
            <br />
            링크를 누르지 않는 한 비밀번호는 그대로 유지됩니다.
          </Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

// react-email 프리뷰(:3002)에서 이 값으로 렌더된다. 실제 발송에는 쓰이지 않는다.
ResetPasswordLink.PreviewProps = {
  url: 'https://auth.nookbox.dev/api/auth/reset-password/preview-token?callbackURL=%2Freset-password',
  userName: '홍길동',
  expiresInMinutes: 30,
} satisfies ResetPasswordLinkProps;

export default ResetPasswordLink;
