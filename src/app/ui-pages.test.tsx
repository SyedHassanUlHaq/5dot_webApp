import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlanCard } from '@/components/plans/PlanCard';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...r}>
      {children}
    </a>
  ),
}));

import DeleteAccountPage from './(app)/account/delete/page';

afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
});

describe('DeleteAccountPage', () => {
  const setup = () =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <DeleteAccountPage />
      </QueryClientProvider>,
    );

  it('stays disabled until DELETE is typed (case-insensitive)', async () => {
    setup();
    const btn = screen.getByRole('button', { name: /permanently delete account/i });
    expect(btn).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/to confirm/i), 'delete');
    expect(btn).toBeEnabled();
  });

  it('calls DELETE /users/me via the proxy, then signs out', async () => {
    const f = vi
      .fn()
      .mockImplementation(async (url: string) =>
        url.includes('signout')
          ? new Response('{"ok":true}', { status: 200 })
          : new Response(null, { status: 204 }),
      );
    vi.stubGlobal('fetch', f);
    setup();
    await userEvent.type(screen.getByLabelText(/to confirm/i), 'DELETE');
    await userEvent.click(screen.getByRole('button', { name: /permanently delete account/i }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/sign-in'));
    expect(f.mock.calls[0]![0]).toBe('/api/proxy/users/me');
    expect(f.mock.calls[0]![1].method).toBe('DELETE');
    expect(f.mock.calls[1]![0]).toBe('/api/auth/signout');
  });

  it('shows the backend error and stays on the page when deletion fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ detail: 'Cannot delete right now' }), { status: 409 }),
        ),
    );
    setup();
    await userEvent.type(screen.getByLabelText(/to confirm/i), 'DELETE');
    await userEvent.click(screen.getByRole('button', { name: /permanently delete account/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot delete right now');
    expect(replace).not.toHaveBeenCalled();
  });
});

describe('PlanCard', () => {
  it('renders features and fires onPress; disabled CTA does not', async () => {
    const onPress = vi.fn();
    const { rerender } = render(
      <PlanCard
        name="Pro"
        price="$9"
        period="per month"
        scanLimit="500 analyses / month"
        features={['Lip-sync detection']}
        ctaLabel="Start 7-day trial"
        popular
        dark
        onPress={onPress}
      />,
    );
    expect(screen.getByText('MOST POPULAR')).toBeInTheDocument();
    expect(screen.getByText('Lip-sync detection')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Start 7-day trial' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    rerender(
      <PlanCard
        name="Free"
        price="$0"
        period="forever"
        scanLimit="20 analyses / month"
        features={[]}
        ctaLabel="Current plan"
        disabled
        onPress={onPress}
      />,
    );
    expect(screen.getByRole('button', { name: 'Current plan' })).toBeDisabled();
  });
});
