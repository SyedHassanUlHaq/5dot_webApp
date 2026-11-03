import type { NextRequest } from 'next/server';
import { handleAuth } from '@/server/auth-handler';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  return handleAuth(req, action);
}
