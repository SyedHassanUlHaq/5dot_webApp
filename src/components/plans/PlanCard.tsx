import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

type Cta = 'gray' | 'green' | 'dark';
const CTA: Record<Cta, string> = {
  gray: 'bg-gray-200 text-gray-700',
  green: 'bg-action-green text-white hover:opacity-90', // web: AA-safe green (see tokens.ts)
  dark: 'bg-black text-white hover:bg-gray-900',
};

/** Port of mobile PlanCard. `dark` + `popular` is the Pro treatment. */
export function PlanCard({
  name,
  price,
  period,
  scanLimit,
  features,
  ctaLabel,
  ctaVariant = 'dark',
  dark,
  popular,
  disabled,
  onPress,
}: {
  name: string;
  price: string;
  period: string;
  scanLimit: string;
  features: string[];
  ctaLabel: string;
  ctaVariant?: Cta;
  dark?: boolean;
  popular?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  return (
    <article
      aria-label={`${name} plan`}
      className={cn(
        'relative flex flex-col rounded-[20px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]',
        dark ? 'bg-gray-900 text-white' : 'bg-surface',
      )}
    >
      {popular ? (
        <span className="absolute -top-3 left-5 rounded-pill bg-tamper px-3 py-1 text-[10px] font-extrabold tracking-wider text-black">
          MOST POPULAR
        </span>
      ) : null}
      <h3 className="text-h3 font-semibold">{name}</h3>
      <p className="mt-1 flex items-baseline gap-1">
        <span className="text-[34px] font-extrabold">{price}</span>
        <span className={cn('text-[13px]', dark ? 'text-white/70' : 'text-ink-2')}>{period}</span>
      </p>
      <hr className={cn('my-3', dark ? 'border-white/15' : 'border-line')} />
      <p className={cn('text-[13px] font-semibold', dark ? 'text-white/70' : 'text-ink-2')}>
        {scanLimit}
      </p>
      <ul className="my-3 flex-1 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex gap-2 text-[14px]">
            <Check
              className={cn(
                'mt-0.5 size-3.5 shrink-0',
                dark ? 'text-authentic' : 'text-authentic-dark',
              )}
              aria-hidden
            />{' '}
            {f}
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={disabled}
        onClick={onPress}
        className={cn(
          'rounded-pill py-3 font-semibold transition-colors disabled:cursor-default',
          CTA[ctaVariant],
        )}
      >
        {ctaLabel}
      </button>
    </article>
  );
}
