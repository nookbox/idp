import { authClient } from '@/shared/api/auth-client';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { FormValues, schema } from './schema';

export function useSignupForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: standardSchemaResolver(schema),
    mode: 'onChange',
    defaultValues: { privacy: false, marketing: false },
  });

  async function submit(values: FormValues) {
    const { data, error } = await authClient.signUp.email({
      email: values.email,
      password: values.password,
      name: values.name,
      marketingConsent: values.marketing,
    });

    if (error) {
      console.error('가입에러:', error);
      toast.error(error.message ?? '가입에 실패했습니다');
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
    control,
    errors,
    isSubmitting,
    onSubmit: handleSubmit(submit),
  };
}
