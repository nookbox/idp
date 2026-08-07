import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function PrivacyPolicyDialog({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Dialog>
      {children}
      <DialogContent className="max-h-[80dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>개인정보 처리방침</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            NOOKBOX는 회원가입 및 서비스 제공을 위해 아래와 같이 개인정보를
            수집·이용합니다.
          </p>
          <p>
            <strong className="text-foreground">수집 항목:</strong> 이름, 이메일
            주소, 비밀번호
          </p>
          <p>
            <strong className="text-foreground">수집 목적:</strong> 회원 식별,
            서비스 제공, 계정 관리
          </p>
          <p>
            <strong className="text-foreground">보유 기간:</strong> 회원 탈퇴 후
            30일간 보관 후 완전 삭제
          </p>
          <p>
            동의를 거부할 권리가 있으며, 동의 거부 시 회원가입이 제한될 수
            있습니다.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
