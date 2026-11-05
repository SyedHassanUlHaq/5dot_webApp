import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const replace = vi.fn();
let search = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(search),
}));

import { SignInForm } from './SignInForm';

const user = {
  id: 'u1',
  email: 'a@b.c',
  name: 'A',
  firstName: 'A',
  lastName: 'B',
  phoneNumber: null,
  avatarInitials: 'A',
  avatarColor: '#fff',
  plan: 'free',
  modelVersion: 'x',
  scansUsedThisMonth: 0,
  scansLimitThisMonth: 20,
  planResetDate: 'd',
  createdAt: 'd',
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } });

// jsdom lacks <dialog>.showModal
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});
afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
  search = '';
});

const setup = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SignInForm />
    </QueryClientProvider>,
  );

describe('SignInForm', () => {
  it('signs in via the BFF and redirects to a safe next path', async () => {
    search = 'next=/history';
    const f = vi.fn().mockResolvedValue(json({ user }));
    vi.stubGlobal('fetch', f);
    setup();
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.c');
    await userEvent.type(screen.getByLabelText('Password'), 'pw');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/history'));
    expect(f.mock.calls[0]![0]).toBe('/api/auth/signin');
    expect(JSON.parse(f.mock.calls[0]![1].body)).toEqual({ email: 'a@b.c', password: 'pw' });
  });
  it('ignores an open-redirect next param', async () => {
    search = 'next=//evil.com';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ user })));
    setup();
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.c');
    await userEvent.type(screen.getByLabelText('Password'), 'pw');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
  });
  it('shows the backend error message in a modal', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ detail: 'Invalid credentials' }, 401)));
    setup();
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.c');
    await userEvent.type(screen.getByLabelText('Password'), 'bad');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
  it('shows "Missing details" when fields are empty, without calling the API', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    setup();
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('Please enter your email and password.')).toBeInTheDocument();
    expect(f).not.toHaveBeenCalled();
  });
  it('shows the signed-out notice when reason=expired', async () => {
    search = 'reason=expired';
    setup();
    expect(
      await screen.findByText('Your session expired. Please sign in again.'),
    ).toBeInTheDocument();
  });
  it('toggles password visibility', async () => {
    setup();
    const pw = screen.getByLabelText('Password');
    expect(pw).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(pw).toHaveAttribute('type', 'text');
  });
});
