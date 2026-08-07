import { authClient } from '@/shared/api/auth-client';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useController, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  clearSavedEmail,
  getErrorMessage,
  getSavedEmail,
  saveEmail,
} from './lib';
import { SigninFormValues, SigninSchema } from './schema';

export function useSigninForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SigninFormValues>({
    resolver: standardSchemaResolver(SigninSchema),
    defaultValues: { email: '', password: '', saveEmail: false },
  });

  const { field: saveEmailField } = useController({
    control,
    name: 'saveEmail',
  });

  useEffect(() => {
    // 클라이언트에서만 실행되어 하이드레이션 에러 방지
    const savedValue = getSavedEmail();
    if (savedValue) {
      reset({ email: savedValue, password: '', saveEmail: true });
    }
  }, [reset]);

  async function submit(values: SigninFormValues) {
    if (values.saveEmail) {
      saveEmail(values.email);
    } else {
      clearSavedEmail();
    }

    const { data, error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });

    if (error) {
      toast.error(getErrorMessage(error.message));
      return;
    }

    const redirectUrl = (data as { url?: string } | null)?.url;
    if (redirectUrl) {
      window.location.assign(redirectUrl);
    } else {
      router.push('/');
    }
  }

  return {
    register,
    errors,
    isSubmitting,
    saveEmail: saveEmailField.value,
    setSaveEmail: (checked: boolean) => setValue('saveEmail', checked),
    onSubmit: handleSubmit(submit),
  };
}
