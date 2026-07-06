'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { toast } from 'sonner';
import { z } from 'zod';
import { authClient } from '@/lib/auth-client';
import { nameSchema } from '@/lib/name-schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { SectionCard, SectionRow } from './section-card';

const nameFormSchema = z.object({ name: nameSchema });
type NameFormValues = z.infer<typeof nameFormSchema>;

type User = {
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  marketingConsent?: boolean;
};

export function OverviewSection({ user }: { user: User }) {
  const [editingName, setEditingName] = useState(false);
  const [marketing, setMarketing] = useState(user.marketingConsent ?? false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NameFormValues>({
    resolver: standardSchemaResolver(nameFormSchema),
    mode: 'onChange',
    defaultValues: { name: user.name },
  });

  const cancelEditName = () => {
    setEditingName(false);
    reset({ name: user.name });
  };

  const saveName = async ({ name }: NameFormValues) => {
    if (name === user.name) {
      setEditingName(false);
      return;
    }
    const { error } = await authClient.updateUser({ name });
    if (error) {
      toast.error(error.message ?? '이름 변경에 실패했습니다');
      return;
    }
    setEditingName(false);
    reset({ name });
    toast.success('이름이 변경되었습니다');
  };

  const toggleMarketing = async (checked: boolean) => {
    setMarketing(checked);
    const { error } = await authClient.updateUser({
      marketingConsent: checked,
    });
    if (error) {
      setMarketing(!checked);
      toast.error(error.message ?? '설정 변경에 실패했습니다');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-5">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt={user.name}
            className="size-20 rounded-full object-cover"
          />
        ) : (
          <div className="flex size-20 items-center justify-center rounded-full bg-violet-600 text-3xl font-semibold text-white">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-xl font-semibold">{user.name}</p>
          <p className="text-muted-foreground text-sm">{user.email}</p>
        </div>
      </div>

      <SectionCard title="기본 정보">
        <SectionRow
          label="이름"
          description={
            editingName ? (
              <div className="mt-1 space-y-1">
                <Input
                  {...register('name')}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && handleSubmit(saveName)()
                  }
                  className="h-9 max-w-xs"
                  autoFocus
                />
                {errors.name && (
                  <p className="text-destructive text-xs">
                    {errors.name.message}
                  </p>
                )}
              </div>
            ) : (
              user.name
            )
          }
        >
          {editingName ? (
            <div className="flex shrink-0 gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={isSubmitting}
                onClick={cancelEditName}
              >
                취소
              </Button>
              <Button
                size="sm"
                disabled={isSubmitting}
                onClick={handleSubmit(saveName)}
              >
                저장
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingName(true)}
            >
              변경
            </Button>
          )}
        </SectionRow>

        <SectionRow
          label="이메일"
          description={
            <span className="flex items-center gap-2">
              {user.email}
              {user.emailVerified ? (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">
                  인증됨
                </span>
              ) : (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">
                  미인증
                </span>
              )}
            </span>
          }
        />
      </SectionCard>

      <SectionCard title="수신 설정">
        <SectionRow
          label="마케팅 정보 수신"
          description="이벤트·혜택 소식을 이메일로 받아요"
        >
          <Switch checked={marketing} onCheckedChange={toggleMarketing} />
        </SectionRow>
      </SectionCard>
    </div>
  );
}
