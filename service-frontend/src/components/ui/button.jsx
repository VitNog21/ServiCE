import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] text-sm font-medium transition-[background-color,color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--green-700)]/30 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[var(--green-700)] text-white hover:bg-[var(--green-800)]',
        outline: 'border border-[var(--green-700)]/35 bg-white text-[var(--gray-900)] hover:bg-[var(--green-50)]',
        ghost: 'bg-transparent text-[var(--gray-600)] hover:bg-[var(--gray-100)]',
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
