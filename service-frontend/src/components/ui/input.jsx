import * as React from 'react';

import { cn } from '@/lib/utils';

const Input = React.forwardRef(({ className, type = 'text', ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md border border-[#0A847C]/35 bg-white px-3 py-2 text-sm text-[#0A3B66] placeholder:text-[#7c8f9f] focus-visible:border-[#0A847C] focus-visible:ring-[3px] focus-visible:ring-[#0A847C]/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export { Input };
