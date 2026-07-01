'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddProfileDialog({
  open,
  onOpenChange,
}: AddProfileDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="items-center text-center">
          <DialogTitle className="text-[clamp(24px,2.5vw,36px)] font-bold">
            프로필 추가
          </DialogTitle>
          <DialogDescription className="text-base text-foreground">
            Nookbox를 이용할 다른 사용자를 등록하시려면 프로필을 추가하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 py-4">
          <div className="size-20 shrink-0 rounded bg-emerald-500" />
          <div className="relative flex-1">
            <Input
              id="profile-name"
              placeholder=" "
              className="peer h-16 border-2 border-neutral-600 bg-transparent px-3 pt-6 pb-2 text-base focus-visible:border-white focus-visible:ring-0"
            />
            <Label
              htmlFor="profile-name"
              className="text-muted-foreground pointer-events-none absolute left-3 top-2 text-xs transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs"
            >
              이름
            </Label>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button className="w-full">저장</Button>
          <DialogClose asChild>
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground w-full hover:bg-transparent"
            >
              취소
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
