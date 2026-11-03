'use client';
import { useRef } from 'react';
import { cn } from '@/lib/cn';

export interface TabItem<T extends string> {
  id: T;
  label: string;
}

/** Segmented tabs with roving tabindex and arrow-key navigation. Render panels yourself with role="tabpanel". */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const move = (dir: 1 | -1) => {
    const i = items.findIndex((t) => t.id === value);
    const next = items[(i + dir + items.length) % items.length];
    if (next) {
      onChange(next.id);
      refs.current[next.id]?.focus();
    }
  };
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex rounded-pill bg-gray-200 p-1"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') move(1);
        if (e.key === 'ArrowLeft') move(-1);
      }}
    >
      {items.map((t) => (
        <button
          key={t.id}
          ref={(el) => {
            refs.current[t.id] = el;
          }}
          role="tab"
          id={`tab-${t.id}`}
          aria-selected={t.id === value}
          tabIndex={t.id === value ? 0 : -1}
          onClick={() => onChange(t.id)}
          className={cn(
            'rounded-pill px-4 py-1.5 text-[13px] font-semibold transition-colors',
            t.id === value ? 'bg-surface text-ink shadow-sm' : 'text-gray-700 hover:text-ink',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
