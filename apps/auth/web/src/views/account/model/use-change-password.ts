import { passwordSchema } from '@/entities/user';
import { useState } from 'react';
import { toast } from 'sonner';
import { changePassword } from '../api/user';

export function useChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [revokeOthers, setRevokeOthers] = useState(true);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('새 비밀번호가 서로 일치하지 않습니다');
      return;
    }

    const parsed = passwordSchema.safeParse(newPassword);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const { error } = await changePassword({
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
    toast.success('비밀번호가 업데이트되었습니다');
  };

  return {
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
  };
}
