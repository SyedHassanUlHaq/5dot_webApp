import { notFound } from 'next/navigation';
import { KitchenSink } from './KitchenSink';

export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <KitchenSink />;
}
