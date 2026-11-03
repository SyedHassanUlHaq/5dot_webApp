'use client';
import { useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  Bell,
  ChevronRight,
  CreditCard,
  Flag,
  HelpCircle,
  Info,
  LogOut,
  Shield,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { messageOf, useErrorModal } from '@/components/auth/useErrorModal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { apiRequest } from '@/lib/api/client';
import { UserSchema, type User } from '@/lib/api/schemas';
import { ME_KEY, useMe, useSignOut } from '@/lib/auth/session';
import { cn } from '@/lib/cn';
import { Colors } from '@/styles/tokens';

// Same avatar palette as mobile. The backend stores only the first color (avatarColor).
const AVATAR_GRADIENTS: [string, string][] = [
  [Colors.brand, Colors.videoPurple],
  [Colors.audioPink, Colors.tamper],
  [Colors.authenticDark, '#0EA5E9'],
  [Colors.aiRed, '#7F1D1D'],
  [Colors.videoPurple, '#2563EB'],
  [Colors.tamper, '#CA8A04'],
];
const gradientFor = (color: string | undefined) =>
  AVATAR_GRADIENTS.find((g) => g[0] === color) ?? AVATAR_GRADIENTS[0]!;

type Item = { Icon: LucideIcon; label: string; href: string };
const SECTIONS: { title: string; items: Item[] }[] = [
  {
    title: 'Account',
    items: [
      { Icon: Bell, label: 'Notifications', href: '/notifications' },
      { Icon: Shield, label: 'Privacy & security', href: '/account' },
      { Icon: CreditCard, label: 'Billing & subscription', href: '/plans' },
    ],
  },
  { title: 'Data', items: [{ Icon: BarChart3, label: 'Usage stats', href: '/usage' }] },
  {
    title: 'Support',
    items: [
      { Icon: HelpCircle, label: 'Help & support', href: '/help' },
      { Icon: Flag, label: 'Report a bug', href: '/help#bug' },
      { Icon: Info, label: 'About 5dot', href: '/about' },
    ],
  },
];

export default function ProfilePage() {
  const { data: user } = useMe();
  const signOut = useSignOut();
  const qc = useQueryClient();
  const { show, modal } = useErrorModal();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    name: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    gradient: 0,
  });

  if (!user) return null;
  const [c1, c2] = gradientFor(user.avatarColor);

  const open = () => {
    setDraft({
      name: user.name,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      phoneNumber: user.phoneNumber ?? '',
      gradient: AVATAR_GRADIENTS.findIndex((g) => g[0] === user.avatarColor),
    });
    setEditing(true);
  };
  const save = async () => {
    setSaving(true);
    try {
      const body = {
        name: draft.name.trim() || undefined,
        avatarColor: AVATAR_GRADIENTS[Math.max(0, draft.gradient)]![0],
        firstName: draft.firstName.trim() || undefined,
        lastName: draft.lastName.trim() || undefined,
        phoneNumber: draft.phoneNumber.trim() || undefined,
      };
      const updated: User = await apiRequest('users/me', UserSchema, {
        method: 'PATCH',
        json: body,
      });
      qc.setQueryData(ME_KEY, updated);
      setEditing(false);
    } catch (e) {
      show('Could not save', messageOf(e, 'Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 font-bold">Profile</h1>
        <Button variant="outline" size="sm" onClick={open}>
          Edit
        </Button>
      </div>

      <Card className="flex items-center gap-4">
        <span
          className="flex size-16 shrink-0 items-center justify-center rounded-full text-h3 font-bold text-white"
          style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
          aria-hidden
        >
          {user.avatarInitials}
        </span>
        <div className="min-w-0">
          <p className="truncate text-h3 font-semibold">{user.name}</p>
          <p className="truncate text-ink-2">{user.email}</p>
          <p className="mt-1 inline-block rounded-pill bg-brand/10 px-2.5 py-0.5 text-caption font-bold capitalize text-brand">
            {user.plan} plan
          </p>
        </div>
      </Card>

      <Card className="grid grid-cols-2 divide-x divide-line text-center">
        <div>
          <p className="text-h2 font-extrabold">{user.scansUsedThisMonth}</p>
          <p className="text-caption text-ink-2">Analyses this month</p>
        </div>
        <div>
          <p className="text-h2 font-extrabold">{user.scansLimitThisMonth ?? '∞'}</p>
          <p className="text-caption text-ink-2">Monthly limit</p>
        </div>
      </Card>

      {SECTIONS.map((s) => (
        <section key={s.title} aria-label={s.title}>
          <h2 className="mb-2 text-label font-semibold uppercase tracking-[1.2px] text-ink-2">
            {s.title}
          </h2>
          <Card className="divide-y divide-line p-0">
            {s.items.map(({ Icon, label, href }) => (
              <Link
                key={label}
                href={href}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-100 first:rounded-t-card last:rounded-b-card"
              >
                <span className="flex size-9 items-center justify-center rounded-input bg-gray-100">
                  <Icon className="size-[17px] text-gray-700" aria-hidden />
                </span>
                <span className="flex-1 font-semibold">{label}</span>
                <ChevronRight className="size-4 text-ink-3" aria-hidden />
              </Link>
            ))}
          </Card>
        </section>
      ))}

      <button
        type="button"
        onClick={signOut}
        className="flex w-full items-center justify-center gap-2 rounded-pill border-[1.5px] border-ai/40 py-3 font-semibold text-[#B52E4A] hover:bg-ai/5"
      >
        <LogOut className="size-4" aria-hidden /> Sign out
      </button>

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit profile"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={save}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-semibold text-gray-700">Avatar color</legend>
            <div className="flex gap-2">
              {AVATAR_GRADIENTS.map((g, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Color ${i + 1}`}
                  aria-pressed={draft.gradient === i}
                  onClick={() => setDraft((d) => ({ ...d, gradient: i }))}
                  className={cn(
                    'size-8 rounded-full ring-offset-2',
                    draft.gradient === i && 'ring-2 ring-ink',
                  )}
                  style={{ background: `linear-gradient(135deg, ${g[0]}, ${g[1]})` }}
                />
              ))}
            </div>
          </fieldset>
          <Input
            label="Full name"
            placeholder="Your full name"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First name"
              value={draft.firstName}
              onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))}
            />
            <Input
              label="Last name"
              value={draft.lastName}
              onChange={(e) => setDraft((d) => ({ ...d, lastName: e.target.value }))}
            />
          </div>
          <Input
            label="Phone number"
            type="tel"
            placeholder="Phone number (optional)"
            value={draft.phoneNumber}
            onChange={(e) => setDraft((d) => ({ ...d, phoneNumber: e.target.value }))}
          />
          <Input
            label="Email"
            value={user.email}
            readOnly
            aria-readonly
            hint="Email can't be changed here."
          />
        </div>
      </Modal>
      {modal}
    </div>
  );
}
