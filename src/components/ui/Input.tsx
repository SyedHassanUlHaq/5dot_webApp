import { forwardRef, useId } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  /** Rendered inside the field, right-aligned (e.g. show/hide password). */
  endAdornment?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, endAdornment, className, id, ...rest },
  ref,
) {
  const auto = useId();
  const inputId = id ?? auto;
  const descId = `${inputId}-desc`;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-semibold text-gray-700">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? descId : undefined}
          className={cn(
            'w-full rounded-input border bg-surface px-4 py-3 text-body text-ink placeholder:text-ink-3',
            error ? 'border-ai' : 'border-line',
            endAdornment && 'pr-12',
          )}
          {...rest}
        />
        {endAdornment ? (
          <div className="absolute inset-y-0 right-2 flex items-center">{endAdornment}</div>
        ) : null}
      </div>
      {error || hint ? (
        <p
          id={descId}
          role={error ? 'alert' : undefined}
          className={cn('mt-1 text-caption', error ? 'text-ai' : 'text-ink-2')}
        >
          {error ?? hint}
        </p>
      ) : null}
    </div>
  );
});
