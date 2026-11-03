import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Load-balancer / container health check. Deliberately does not call the backend, so an API outage can't take the web tier out of rotation. */
export function GET() {
  return NextResponse.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
}
