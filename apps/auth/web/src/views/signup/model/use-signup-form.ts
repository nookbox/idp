import { authClient } from '@/shared/api/auth-client';
import { getAuthErrorMessage } from '@/shared/lib/auth-error';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { SIGNUP_ERROR_MESSAGES, SIGNUP_FALLBACK_ERROR } from './constants';
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
      toast.error(
        getAuthErrorMessage(
          error,
          SIGNUP_FALLBACK_ERROR,
          SIGNUP_ERROR_MESSAGES,
        ),
      );
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
