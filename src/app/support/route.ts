import { legalHtmlResponse } from '@/server/legal';

export const dynamic = 'force-static';

export const GET = () => legalHtmlResponse('support.html');
