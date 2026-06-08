import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

const Textarea = forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-24 w-full rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-white px-3 py-2 text-sm text-[var(--gray-900)] shadow-sm transition-colors placeholder:text-[var(--gray-400)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green-700)]/20 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  />
));

Textarea.displayName = 'Textarea';

export { Textarea };