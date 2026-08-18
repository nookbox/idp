'use client';

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
import AvatarEditor from 'react-avatar-editor';
import {
  ACCEPTED_TYPES,
  MAX_SCALE,
  MIN_SCALE,
} from '../model/use-upload-avatar';
import type { UploadAvatarController } from '../model/types';

/**
 * 파일 선택 input + 크롭 편집 모달.
 *
 * 드롭다운·팝오버 같은 "닫히면 사라지는" 영역 바깥에서 렌더해야 한다.
 * 안에 두면 드롭다운이 닫히는 순간 input 이 언마운트돼 파일을 골라도 아무 일도
 * 일어나지 않는다.
 */
export function AvatarEditorDialog({
  upload,
}: {
  upload: UploadAvatarController;
}) {
  const {
    editorRef,
    inputRef,
    zoomAreaRef,
    file,
    scale,
    saving,
    setScale,
    selectFile,
    close,
    save,
  } = upload;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        onChange={selectFile}
        className="hidden"
      />

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
