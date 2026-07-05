import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Props extends React.ComponentProps<typeof Input> {
  labelName: string;
}

export function FloatingLabelInput({
  labelName,
  id,
  className,
  ...props
}: Props) {
  return (
    <div className="relative flex-1">
      <Input
        id={id}
        placeholder=" "
        className={cn(
          'peer h-16 border-2 border-neutral-600 bg-transparent px-3 pt-6 pb-2 text-base focus-visible:border-white focus-visible:ring-0',
          // 크롬 자동완성 시 inset shadow로 크롬 강제 배경을 덮음
          'autofill:shadow-[inset_0_0_0_1000px_#2d3140] autofill:[-webkit-text-fill-color:#fff] autofill:[caret-color:#fff]',
          className,
        )}
        {...props}
      />
      <Label
        htmlFor={id}
        className="text-muted-foreground pointer-events-none absolute left-3 top-2 text-xs transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs"
      >
        {labelName}
      </Label>
    </div>
  );
}
