import { ScanView } from './ScanView';

export const metadata = { title: 'Analysis · 5dot' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ScanView id={id} />;
}
