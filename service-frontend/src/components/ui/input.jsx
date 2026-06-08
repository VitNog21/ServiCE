import * as React from 'react';

import { cn } from '@/lib/utils';

const Input = React.forwardRef(({ className, type = 'text', ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-white px-3 py-2 text-sm text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus-visible:border-[var(--green-700)] focus-visible:ring-[3px] focus-visible:ring-[var(--green-700)]/10 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export { Input };
