'use client';
import { useQuery } from '@tanstack/react-query';
import { Award, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { PlanCard } from '@/components/plans/PlanCard';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { apiRequest } from '@/lib/api/client';
import { PlansResponseSchema, type Plan } from '@/lib/api/schemas';
import { useMe } from '@/lib/auth/session';
import { SUPPORT_EMAIL } from '@/lib/billing';

function ctaFor(
  plan: Plan,
  current: boolean,
): { label: string; variant: 'gray' | 'green' | 'dark'; disabled?: boolean } {
  if (current) return { label: 'Current plan', variant: 'gray', disabled: true };
  if (plan.price === 0) return { label: 'Free plan', variant: 'gray', disabled: true }; // web: don't offer "Upgrade" on the free tier
  if (plan.id === 'team') return { label: 'Contact sales', variant: 'dark' };
  if (plan.trialDays) return { label: `Start ${plan.trialDays}-day trial`, variant: 'green' };
  return { label: 'Upgrade', variant: 'dark' };
}

export default function PlansPage() {
  const { data: user } = useMe();
  const plans = useQuery({
    queryKey: ['plans'],
    queryFn: () => apiRequest('plans', PlansResponseSchema),
    staleTime: 10 * 60_000,
  });
  const [dialog, setDialog] = useState<'sales' | 'soon' | null>(null);

  const select = (p: Plan) => setDialog(p.id === 'team' ? 'sales' : 'soon');

  return (
    <div>
      <p className="mb-2 inline-flex items-center gap-1.5 rounded-pill bg-tamper/15 px-3 py-1 text-[13px] font-bold text-[#8A5300]">
        <Award className="size-3.5" aria-hidden /> Upgrade
      </p>
      <h1 className="text-h1 font-bold">Verify without limits.</h1>
      <p className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold text-authentic-dark">
        <CheckCircle2 className="size-3.5" aria-hidden /> Cancel anytime · 7-day free trial
      </p>

      <div
        className="my-5 flex items-center gap-3 rounded-card bg-authentic/12 p-4"
        style={{ background: '#52A87C1F' }}
      >
        <ShieldCheck className="size-6 shrink-0 text-authentic-dark" aria-hidden />
        <div>
          <p className="font-semibold">Built for trust.</p>
          <p className="text-[13px] text-gray-700">
            Every result comes with confidence, evidence, and an explanation a human can read.
          </p>
        </div>
      </div>

      {plans.isPending ? (
        <div className="grid gap-4 md:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-[20px] bg-gray-200 motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : plans.isError ? (
        <div role="alert" className="py-8 text-center">
          <p className="mb-3 text-ink-2">{plans.error.message}</p>
          <Button variant="outline" onClick={() => void plans.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="grid items-stretch gap-5 pt-3 md:grid-cols-3">
          {plans.data.plans.map((p) => {
            const cta = ctaFor(p, user?.plan === p.id);
            return (
              <PlanCard
                key={p.id}
                name={p.name}
                price={p.price === 0 ? '$0' : `$${p.price}`}
                period={p.billingPeriod === 'forever' ? 'forever' : 'per month'}
                scanLimit={
                  p.scansPerMonth === null
                    ? 'Unlimited analyses'
                    : `${p.scansPerMonth} analyses / month`
                }
                features={p.features}
                ctaLabel={cta.label}
                ctaVariant={cta.variant}
                disabled={cta.disabled}
                dark={p.id === 'pro'}
                popular={p.id === 'pro'}
                onPress={() => select(p)}
              />
            );
          })}
        </div>
      )}

      <Modal
        open={dialog === 'sales'}
        onClose={() => setDialog(null)}
        title="Contact sales"
        footer={<Button onClick={() => setDialog(null)}>OK</Button>}
      >
        Reach out to{' '}
        <a className="font-semibold text-brand underline" href={`mailto:${SUPPORT_EMAIL}`}>
          {SUPPORT_EMAIL}
        </a>{' '}
        to set up a Team plan.
      </Modal>
      <Modal
        open={dialog === 'soon'}
        onClose={() => setDialog(null)}
        title="Payments coming soon"
        footer={<Button onClick={() => setDialog(null)}>OK</Button>}
      >
        Upgrading isn&apos;t available yet. Paid plans will be purchasable here soon, and will show
        up on your mobile account too.
      </Modal>
    </div>
  );
}
