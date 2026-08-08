import { useState } from 'react';
import { toast } from 'sonner';
import { updateMarketingConsent } from '../api/user';

export function useMarketingConsent(initial: boolean) {
  const [enabled, setEnabled] = useState(initial);

  const toggle = async (checked: boolean) => {
    setEnabled(checked);
    const { error } = await updateMarketingConsent(checked);

    if (error) {
      setEnabled(!checked);
      toast.error(error.message ?? '설정 변경에 실패했습니다');
      return;
    }

    toast.success(
      checked
        ? '마케팅 정보 수신에 동의했습니다'
        : '마케팅 정보 수신을 거부했습니다',
      { duration: 3000 },
    );
  };

  return { enabled, toggle };
}
