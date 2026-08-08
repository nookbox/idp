import { nameSchema } from '@/entities/user';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { updateUserName } from '../api/user';

const nameFormSchema = z.object({ name: nameSchema });
type NameFormValues = z.infer<typeof nameFormSchema>;

export function useEditName(currentName: string) {
  const [editing, setEditing] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NameFormValues>({
    resolver: standardSchemaResolver(nameFormSchema),
    mode: 'onChange',
    defaultValues: { name: currentName },
  });

  const cancel = () => {
    setEditing(false);
    reset({ name: currentName });
  };

  const save = async ({ name }: NameFormValues) => {
    if (name === currentName) {
      setEditing(false);
      return;
    }
    const { error } = await updateUserName(name);
    if (error) {
      toast.error(error.message ?? '이름 변경에 실패했습니다');
      return;
    }
    setEditing(false);
    reset({ name });
    toast.success('이름이 변경되었습니다');
  };

  return {
    editing,
    start: () => setEditing(true),
    cancel,
    submit: handleSubmit(save),
    register,
    errors,
    isSubmitting,
  };
}
