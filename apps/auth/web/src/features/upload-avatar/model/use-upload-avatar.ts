'use client';

import { useCallback, useRef, useState, type ChangeEvent } from 'react';
import type { AvatarEditorRef } from 'react-avatar-editor';
import { toast } from 'sonner';

import { authClient } from '@/shared/api/auth-client';
import { uploadAvatar } from '../api/upload-avatar';

// 서버의 limits.fileSize 와 동일하게 맞춘다.
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// 서버 FileTypeValidationPipe 의 허용 목록과 동일.
export const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp';

export const MIN_SCALE = 1;
export const MAX_SCALE = 3;

const DEFAULT_SCALE = 1.2;

// 휠 감도.
//
// deltaY 는 입력 장치마다 스케일이 완전히 다르다.
// 마우스 휠은 한 칸에 100 안팎, 맥 트랙패드는 3~10 정도가 연속으로 들어온다.
// 그래서 뺄셈으로 하면 한쪽 기준에 맞추는 순간 다른 쪽이 안 움직인다.
//
// exp 를 써서 비율로 곱하면 양쪽 다 자연스럽다.
// deltaY 100 -> 약 18% 축소, deltaY 3 -> 약 0.6% 축소(트랙패드는 초당 수십 번 들어와 누적된다).
const WHEEL_SENSITIVITY = 0.002;

// 한 번에 너무 크게 튀지 않도록 제한한다.
const MAX_DELTA = 100;

const clamp = (value: number) =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

/** 캔버스를 Blob 으로 변환 */
function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) =>
    // jpeg 0.9. 기본값인 png 로 두면 사진 한 장이 수 MB 까지 커진다.
    canvas.toBlob(resolve, 'image/jpeg', 0.9),
  );
}

export function useUploadAvatar() {
  const editorRef = useRef<AvatarEditorRef>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // file 이 있으면 편집 모달이 열린 상태
  const [file, setFile] = useState<File | null>(null);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [saving, setSaving] = useState(false);

  // 휠로 확대·축소.
  const zoomAreaRef = useCallback((area: HTMLDivElement | null) => {
    if (!area) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      // deltaMode 1 은 값이 '줄' 단위라 픽셀로 환산한다.
      const raw = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      const delta = Math.max(-MAX_DELTA, Math.min(MAX_DELTA, raw));

      // 위로 굴리면 deltaY 가 음수 -> 확대
      setScale((prev) => clamp(prev * Math.exp(-delta * WHEEL_SENSITIVITY)));
    };

    area.addEventListener('wheel', handleWheel, { passive: false });
    return () => area.removeEventListener('wheel', handleWheel);
  }, []);

  const openFilePicker = () => inputRef.current?.click();

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];

    // 같은 파일을 다시 골라도 change 가 발생하도록 값을 비운다.
    event.target.value = '';

    if (!selected) return;

    if (selected.size > MAX_FILE_SIZE) {
      toast.error('이미지는 5MB 이하만 올릴 수 있습니다');
      return;
    }

    setScale(DEFAULT_SCALE);
    setFile(selected);
  };

  const close = () => {
    if (saving) return;
    setFile(null);
  };

  const save = async () => {
    const canvas = editorRef.current?.getImageScaledToCanvas();
    if (!canvas || saving) return;

    setSaving(true);
    try {
      const blob = await canvasToBlob(canvas);
      if (!blob) throw new Error('이미지를 변환하지 못했습니다');

      await uploadAvatar(blob);

      toast.success('프로필 사진을 변경했습니다');
      setFile(null);

      // router.refresh()로는 안되고, better-auth의 세션 캐시를 갱신해서 이미지 업데이트된거를 갱신해줌
      authClient.$store.notify('$sessionSignal');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '아바타 업로드에 실패했습니다',
      );
    } finally {
      setSaving(false);
    }
  };

  return {
    editorRef,
    inputRef,
    zoomAreaRef,
    file,
    scale,
    saving,
    setScale,
    openFilePicker,
    selectFile,
    close,
    save,
  };
}
