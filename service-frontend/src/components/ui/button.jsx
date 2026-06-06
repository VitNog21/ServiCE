import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[background-color,color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-[#10B981]/30 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[#10B981] text-white hover:bg-[#059669]',
        outline: 'border border-[#10B981]/35 bg-white text-[#0A3B66] hover:bg-[#f2fbfa]',
        ghost: 'bg-transparent text-[#0A3B66] hover:bg-[#eaf8f4]',
        unstyled: '',
      },
      size: {
        default: 'h-10 px-4 py-2',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

function Button({ className, variant, size, ...props }) {
  return (
    <button className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}

export { Button, buttonVariants };
