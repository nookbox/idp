import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface Props {
  labelName: string;
}

export function FloatingLabelInput({ labelName }: Props) {
  return (
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
        {labelName}
      </Label>
    </div>
  );
}
