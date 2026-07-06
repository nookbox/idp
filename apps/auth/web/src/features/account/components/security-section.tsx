'use client';

import { SubmitButton } from '@/components/button';
import { FloatingLabelInput } from '@/components/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { useState } from 'react';
import { toast } from 'sonner';
import { SectionCard } from './section-card';

export function SecuritySection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [revokeOthers, setRevokeOthers] = useState(true);
  const [loading, setLoading] = useState(false);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('새 비밀번호가 서로 일치하지 않습니다', {});
      return;
    }
    if (newPassword.length < 8) {
      toast.error('비밀번호는 8자 이상이어야 합니다', { duration: Infinity });
      return;
    }
    if (!/\d/.test(newPassword) || !/[^a-zA-Z0-9]/.test(newPassword)) {
      toast.error('비밀번호에 숫자와 특수문자가 포함되어야 합니다', {});
      return;
    }

    setLoading(true);
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: revokeOthers,
    });
    setLoading(false);

    if (error) {
      toast.error(
        error.code === 'INVALID_PASSWORD'
          ? '현재 비밀번호가 올바르지 않습니다'
          : (error.message ?? '비밀번호 변경에 실패했습니다'),
      );
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    toast.success('비밀번호가 업데이트되었습니다', { duration: Infinity });
  };

  return (
    <SectionCard title="비밀번호 변경">
      <form onSubmit={changePassword} className="space-y-4 px-5 py-5">
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
    </SectionCard>
  );
}
