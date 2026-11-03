import { cn } from '@/lib/cn';

export function Card({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-card bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]', className)}
      {...rest}
    />
  );
}
