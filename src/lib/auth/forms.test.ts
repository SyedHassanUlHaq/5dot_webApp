import { describe, expect, it } from 'vitest';
import { digitsOnly, resetSchema, safeNext, signUpSchema, verifySchema } from './forms';

describe('safeNext', () => {
  it.each([
    ['/scan', '/scan'],
    ['/history?x=1', '/history?x=1'],
    ['//evil.com', '/'],
    ['https://evil.com', '/'],
    ['/\\evil.com', '/'],
    [null, '/'],
    ['', '/'],
  ])('%s -> %s', (input, out) => expect(safeNext(input)).toBe(out));
});

describe('schemas', () => {
  const base = {
    firstName: 'A',
    lastName: 'B',
    email: 'a@b.co',
    password: 'longenough',
    confirmPassword: 'longenough',
  };
  it('signup accepts valid input', () => expect(signUpSchema.safeParse(base).success).toBe(true));
  it('signup rejects short password and mismatch', () => {
    expect(
      signUpSchema.safeParse({ ...base, password: 'short', confirmPassword: 'short' }).success,
    ).toBe(false);
    const r = signUpSchema.safeParse({ ...base, confirmPassword: 'different1' });
    expect(r.success).toBe(false);
    expect(!r.success && r.error.issues[0]?.path).toEqual(['confirmPassword']);
  });
  it('otp must be exactly 6 digits', () => {
    expect(verifySchema.safeParse({ email: 'a@b.co', otp: '12345' }).success).toBe(false);
    expect(verifySchema.safeParse({ email: 'a@b.co', otp: '123456' }).success).toBe(true);
  });
  it('reset requires matching new passwords', () => {
    expect(
      resetSchema.safeParse({
        email: 'a@b.co',
        otp: '123456',
        newPassword: 'password1',
        confirmPassword: 'password2',
      }).success,
    ).toBe(false);
  });
  it('digitsOnly strips non-digits and caps at 6', () =>
    expect(digitsOnly('12a3-45678')).toBe('123456'));
});
