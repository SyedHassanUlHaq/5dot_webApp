'use client';
import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, useState } from 'react';
import { Input, type InputProps } from '@/components/ui/Input';

export const PasswordField = forwardRef<
  HTMLInputElement,
  Omit<InputProps, 'type' | 'endAdornment'>
>(function PasswordField(props, ref) {
  const [show, setShow] = useState(false);
  return (
    <Input
      ref={ref}
      type={show ? 'text' : 'password'}
      endAdornment={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
          className="rounded-full p-2 text-ink-2 hover:bg-gray-100"
        >
          {show ? (
            <EyeOff className="size-[18px]" aria-hidden />
          ) : (
            <Eye className="size-[18px]" aria-hidden />
          )}
        </button>
      }
      {...props}
    />
  );
});
