import { cloneElement, createContext, isValidElement, useContext, useEffect } from 'react';

import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

const DialogContext = createContext({ onOpenChange: () => {} });

function Dialog({ open, onOpenChange, children }) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) {
    return null;
  }

  return (
    <DialogContext.Provider value={{ onOpenChange }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button
          type="button"
          aria-label="Fechar diálogo"
          className="absolute inset-0 cursor-default bg-slate-950/55 backdrop-blur-[2px]"
          onClick={() => onOpenChange(false)}
        />
        <div className="relative z-10 w-full">{children}</div>
      </div>
    </DialogContext.Provider>
  );
}

function DialogContent({ className, children }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className={cn('mx-auto w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200', className)}
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  );
}

function DialogHeader({ className, ...props }) {
  return <div className={cn('flex flex-col space-y-1.5 text-left', className)} {...props} />;
}

function DialogFooter({ className, ...props }) {
  return <div className={cn('flex items-center justify-end gap-2', className)} {...props} />;
}

function DialogTitle({ className, ...props }) {
  return <h2 className={cn('text-lg font-semibold leading-none tracking-tight text-slate-900', className)} {...props} />;
}

function DialogDescription({ className, ...props }) {
  return <p className={cn('text-sm text-slate-500', className)} {...props} />;
}

function DialogClose({ className, asChild = false, children, ...props }) {
  const { onOpenChange } = useContext(DialogContext);

  if (asChild) {
    if (isValidElement(children)) {
      return cloneElement(children, {
        ...props,
        onClick: (event) => {
          children.props?.onClick?.(event);
          onOpenChange(false);
        },
      });
    }

    return null;
  }

  return (
    <button
      type="button"
      className={cn('inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700', className)}
      onClick={() => onOpenChange(false)}
      {...props}
    >
      <X className="h-5 w-5" />
    </button>
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
};