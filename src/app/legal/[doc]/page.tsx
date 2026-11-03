import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Info } from 'lucide-react';
import { LEGAL_CONTENT, type LegalDocType } from '@/content/legal-content';
import { toBlocks } from '@/lib/legal-blocks';

export const dynamicParams = false;
export const generateStaticParams = () => [
  { doc: 'terms' },
  { doc: 'cookies' },
  { doc: 'privacy' },
];

export default async function LegalDoc({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  if (doc === 'privacy') redirect('/privacy'); // the HTML policy is the maintained version
  if (!(doc in LEGAL_CONTENT)) notFound();
  const d = LEGAL_CONTENT[doc as LegalDocType];

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <Link href="/" className="text-[13px] font-semibold text-brand hover:underline">
        ← 5dot
      </Link>
      <h1 className="mt-3 mb-4 text-h1 font-bold">{d.title}</h1>
      {'isPlaceholder' in d && d.isPlaceholder ? (
        <p
          className="mb-4 flex gap-2 rounded-input bg-gray-200 p-3 text-[13px] text-gray-700"
          role="note"
        >
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden /> Placeholder. The final copy
          hasn&apos;t been published yet.
        </p>
      ) : null}
      <article className="space-y-3 leading-[22px] text-gray-700">
        {toBlocks(d.body).map((b, i) =>
          b.t === 'h' ? (
            <h2 key={i} className="pt-3 text-h3 font-semibold text-ink">
              {b.text}
            </h2>
          ) : b.t === 'ul' ? (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {b.items.map((it, j) => (
                <li key={j}>{it}</li>
              ))}
            </ul>
          ) : (
            <p key={i} className="whitespace-pre-line">
              {b.text}
            </p>
          ),
        )}
      </article>
    </main>
  );
}
