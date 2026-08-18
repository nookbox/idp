import { join } from 'path';

/**
 * 업로드 파일이 쌓이는 루트 (프로세스 실행 위치 기준 상대 경로).
 * main.ts 가 이 디렉터리를 정적 서빙한다.
 */
export const UPLOAD_ROOT = 'uploads';

/** 업로드 파일을 외부에 노출하는 URL 접두사 */
export const UPLOAD_PUBLIC_PREFIX = '/uploads';

/** 아바타 파일이 저장되는 디렉터리 */
export const AVATAR_DIR = join(UPLOAD_ROOT, 'avatars');

/** 저장된 아바타가 노출되는 URL 경로 */
export const AVATAR_PUBLIC_PATH = `${UPLOAD_PUBLIC_PREFIX}/avatars`;

/** 업로드 허용 최대 크기. 프론트의 MAX_FILE_SIZE 와 맞춰야 한다. */
export const AVATAR_MAX_SIZE = 5 * 1024 * 1024;
