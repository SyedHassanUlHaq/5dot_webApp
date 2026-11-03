import type { NextRequest } from 'next/server';
import { handleProxy } from '@/server/proxy-handler';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ path: string[] }> };
const run = async (req: NextRequest, ctx: Ctx) => handleProxy(req, (await ctx.params).path);

export { run as GET, run as POST, run as PATCH, run as PUT, run as DELETE };
