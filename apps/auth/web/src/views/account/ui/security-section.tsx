'use client';

import { Checkbox } from '@/shared/ui/checkbox';
import { FloatingLabelInput } from '@/shared/ui/floating-label-input';
import { Label } from '@/shared/ui/label';
import { SubmitButton } from '@/shared/ui/submit-button';
import { useChangePassword } from '../model/use-change-password';

export function SecuritySection() {
  const {
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    revokeOthers,
    setRevokeOthers,
    loading,
    submit,
  } = useChangePassword();

  return (
    <section className="py-2.5">
      <p className="text-sm font-medium">비밀번호 변경</p>

      <form onSubmit={submit} className="space-y-4 py-5">
        <FloatingLabelInput
          id="current-password"
          labelName="현재 비밀번호"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
        <FloatingLabelInput
          id="new-password"
          labelName="새 비밀번호"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <FloatingLabelInput
          id="confirm-password"
          labelName="새 비밀번호 확인"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <p className="text-muted-foreground text-xs">
          8자 이상, 숫자와 특수문자를 포함해야 합니다.
        </p>
        <div className="flex items-center gap-2">
          <Checkbox
            id="revoke-others"
            checked={revokeOthers}
            onCheckedChange={(checked) => setRevokeOthers(checked === true)}
          />
          <Label
            htmlFor="revoke-others"
            className="cursor-pointer text-sm font-normal"
          >
            모든 디바이스에서 로그아웃
          </Label>
        </div>
        <SubmitButton loading={loading} loadingText="변경 중">
          비밀번호 변경
        </SubmitButton>
      </form>
    </section>
  );
}
