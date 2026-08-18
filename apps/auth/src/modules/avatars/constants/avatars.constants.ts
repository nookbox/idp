import { join } from 'path';

/**
 * 아바타 파일이 저장되는 디렉터리.
 *
 * 운영에서는 컨테이너에 마운트된 볼륨 경로가 들어온다
 * (docker-compose.prod.yml 의 AVATAR_DIR / AVATAR_HOST_DIR).
 * 레포 안에 쌓으면 컨테이너를 새로 만들 때 파일이 전부 사라진다.
 */
export const AVATAR_DIR = process.env.AVATAR_DIR ?? join('uploads', 'avatars');

/**
 * 저장된 아바타가 노출되는 URL 경로.
 * main.ts 가 AVATAR_DIR 을 이 경로로 정적 서빙한다.
 */
export const AVATAR_PUBLIC_PATH = '/uploads/avatars';

/** 업로드 허용 최대 크기. 프론트의 MAX_FILE_SIZE 와 맞춰야 한다. */
export const AVATAR_MAX_SIZE = 5 * 1024 * 1024;
