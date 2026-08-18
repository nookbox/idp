import { AUTH_URL } from '@/shared/config/auth';

interface UploadAvatarResponse {
  message: string;
  filePath: string;
}

// 크롭된 이미지를 auth 서버에 올린다.
export async function uploadAvatar(blob: Blob): Promise<UploadAvatarResponse> {
  const form = new FormData();

  form.append('avatar', blob, 'avatar.jpg');

  // Content-Type 을 직접 넣지 않는다.
  // FormData 를 그대로 넘기면 브라우저가 multipart 경계(boundary)까지 붙여준다.
  const res = await fetch(`${AUTH_URL}/api/avatars/upload`, {
    method: 'POST',
    body: form,
    credentials: 'include',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? '아바타 업로드에 실패했습니다');
  }
  const json = await res.json();

  return json;
}
