'use client';

import { UserAvatar, type User } from '@/entities/user';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Spinner } from '@/shared/ui/spinner';
import { Camera } from 'lucide-react';
import AvatarEditor from 'react-avatar-editor';
import {
  ACCEPTED_TYPES,
  MAX_SCALE,
  MIN_SCALE,
  useUploadAvatar,
} from '../model/use-upload-avatar';

interface Props {
  user: Pick<User, 'name' | 'image'>;
  className?: string;
  fullbackClassname?: string;
}

export function UploadAvatar({ user, className, fullbackClassname }: Props) {
  const {
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
  } = useUploadAvatar();

  return (
    <>
      <button
        type="button"
        onClick={openFilePicker}
        aria-label="프로필 사진 변경"
        className="group relative inline-block cursor-pointer"
      >
        <UserAvatar
          user={user}
          className={className}
          fullbackClassname={fullbackClassname}
        />

        <span
          className={cn(
            'absolute right-0 bottom-0 rounded-full p-1.5',
            'transition-all group-hover:text-blue-100',
          )}
        >
          <Camera className="size-4" />
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        onChange={selectFile}
        className="hidden"
      />

      {/* file 이 있을 때만 편집 모달을 띄운다. */}
      <Dialog open={Boolean(file)} onOpenChange={close}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>프로필 사진 편집</DialogTitle>
            <DialogDescription>
              드래그해서 위치를 맞추고, 휠이나 슬라이더로 확대·축소하세요.
            </DialogDescription>
          </DialogHeader>

          {file && (
            <div className="flex flex-col items-center gap-4">
              {/* 휠 이벤트를 받으려고 감싼다. 편집기 위에서만 줌이 걸린다. */}
              <div ref={zoomAreaRef}>
                <AvatarEditor
                  ref={editorRef}
                  image={file}
                  width={250}
                  height={250}
                  border={25}
                  borderRadius={125} // 원형 아바타라 반지름을 절반으로
                  color={[0, 0, 0, 0.5]}
                  scale={scale}
                />
              </div>

              <input
                type="range"
                min={MIN_SCALE}
                max={MAX_SCALE}
                step={0.01}
                value={scale}
                onChange={(event) => setScale(Number(event.target.value))}
                aria-label="확대 배율"
                className="w-full"
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={saving}>
              취소
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Spinner />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
