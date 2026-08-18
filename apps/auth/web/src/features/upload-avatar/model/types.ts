import type { useUploadAvatar } from './use-upload-avatar';

// useUploadAvatar 가 돌려주는 것. 트리거와 모달이 나눠 쓴다.
export type UploadAvatarController = ReturnType<typeof useUploadAvatar>;
