'use client';
import { useQueryClient } from '@tanstack/react-query';
import { Check, FileAudio, Link as LinkIcon, UploadCloud, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { messageOf, useErrorModal } from '@/components/auth/useErrorModal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Tabs } from '@/components/ui/Tabs';
import { cn } from '@/lib/cn';
import { useMe } from '@/lib/auth/session';
import type { DetectionKind, ScanResponse } from '@/lib/api/schemas';
import { submitScanUrl, uploadScanFile, type UploadHandle } from '@/lib/scan/api';
import { formatBytes } from '@/lib/scan/format';
import { DETECTION_KINDS, DETECTION_META } from '@/lib/scan/meta';
import {
  allowedExtensions,
  formatInfoForSelection,
  validateFile,
  validateUrl,
} from '@/lib/scan/validate';

type Source = 'file' | 'url';
const isKind = (v: string | null): v is DetectionKind =>
  !!v && (DETECTION_KINDS as string[]).includes(v);

export function UploadForm() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const { data: user } = useMe();
  const { show, modal } = useErrorModal();

  const initialKind = params.get('kind');
  const initialUrl = params.get('url') ?? '';
  const [kinds, setKinds] = useState<DetectionKind[]>([
    isKind(initialKind) ? initialKind : 'ai_video',
  ]);
  const [source, setSource] = useState<Source>(initialUrl ? 'url' : 'file');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState(initialUrl);
  const [urlError, setUrlError] = useState<string>();
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const handle = useRef<UploadHandle | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => () => handle.current?.abort(), []);

  const limit = user?.scansLimitThisMonth ?? null;
  const limitReached = !!user && limit !== null && user.scansUsedThisMonth >= limit;
  const primary = kinds[0] ?? DETECTION_KINDS[0]!;
  const color = DETECTION_META[primary].color;

  const fileProblem = file ? validateFile(file, kinds) : null;
  const toggle = (k: DetectionKind) =>
    setKinds((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  const choose = (f: File | undefined) => {
    if (!f) return;
    const problem = validateFile(f, kinds);
    if (problem) show('Cannot use this file', problem, 'warning');
    setFile(f);
  };

  const onDone = (scan: ScanResponse) => {
    qc.setQueryData(['scan', scan.requestId], scan);
    void qc.invalidateQueries({ queryKey: ['history'] });
    void qc.invalidateQueries({ queryKey: ['stats'] });
    void qc.invalidateQueries({ queryKey: ['me'] });
    router.push(`/scan/${encodeURIComponent(scan.requestId)}`);
  };
  const onFail = (e: unknown) => {
    if (e instanceof DOMException && e.name === 'AbortError') return;
    show('Upload failed', messageOf(e, 'Could not start the analysis. Please try again.'));
  };

  const submitFile = async () => {
    if (!file || fileProblem || busy || kinds.length === 0) return;
    setBusy(true);
    setProgress(0);
    handle.current = uploadScanFile(file, kinds, setProgress);
    try {
      onDone(await handle.current.promise);
    } catch (e) {
      onFail(e);
      setBusy(false);
    }
  };

  const submitUrl = async () => {
    const problem = validateUrl(url);
    setUrlError(problem ?? undefined);
    if (problem || busy || kinds.length === 0) return;
    setBusy(true);
    try {
      onDone(await submitScanUrl(url.trim(), kinds));
    } catch (e) {
      onFail(e);
      setBusy(false);
    }
  };

  const canSubmit = kinds.length > 0 && !limitReached && !busy;
  const uploadingBytes = busy && source === 'file';

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-h1 font-bold">New analysis</h1>
      <p className="mb-5 text-ink-2">Choose what to check, then add a file or a link.</p>

      {user ? (
        <p
          className={cn('mb-4 text-[13px]', limitReached ? 'font-semibold text-ai' : 'text-ink-2')}
          aria-live="polite"
        >
          {limitReached
            ? `You've used all ${limit} analyses this month on the ${user.plan} plan.`
            : `${user.scansUsedThisMonth}${limit !== null ? ` of ${limit}` : ''} analyses used this month.`}{' '}
          {limitReached || user.plan === 'free' ? (
            <Link href="/plans" className="font-semibold text-brand underline">
              See plans
            </Link>
          ) : null}
        </p>
      ) : null}

      <fieldset className="mb-5" disabled={busy}>
        <legend className="mb-2 text-label font-semibold uppercase tracking-[1.2px] text-ink-2">
          What should we check?
        </legend>
        <div className="grid grid-cols-3 gap-3">
          {DETECTION_KINDS.map((k) => {
            const meta = DETECTION_META[k];
            const on = kinds.includes(k);
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(k)}
                className={cn(
                  'relative flex flex-col items-center gap-2 rounded-card border-2 bg-surface px-2 py-4 transition-colors disabled:opacity-60',
                  on ? '' : 'border-transparent hover:bg-gray-100',
                )}
                style={on ? { borderColor: meta.color } : undefined}
              >
                {on ? (
                  <span
                    className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full text-white"
                    style={{ background: meta.color }}
                  >
                    <Check className="size-2.5" strokeWidth={3} aria-hidden />
                  </span>
                ) : null}
                <span
                  className="flex size-10 items-center justify-center rounded-input"
                  style={
                    on
                      ? { background: meta.color, color: '#fff' }
                      : { background: `${meta.color}20`, color: meta.color }
                  }
                >
                  <meta.icon className="size-5" aria-hidden />
                </span>
                <span
                  className={cn('text-[13px]', on ? 'font-extrabold' : 'font-semibold')}
                  style={on ? { color: meta.color } : undefined}
                >
                  {meta.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
        {kinds.length === 0 ? (
          <p role="alert" className="mt-2 text-caption text-ai">
            Pick at least one check.
          </p>
        ) : null}
      </fieldset>

      <Tabs
        label="Source"
        value={source}
        onChange={setSource}
        items={[
          { id: 'file', label: 'Upload a file' },
          { id: 'url', label: 'Paste a link' },
        ]}
      />

      <Card className="mt-4" role="tabpanel" aria-labelledby={`tab-${source}`}>
        {source === 'file' ? (
          <div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                if (!busy) choose(e.dataTransfer.files[0]);
              }}
              className={cn(
                'flex flex-col items-center gap-2 rounded-card border-2 border-dashed p-8 text-center transition-colors',
                dragging ? 'bg-gray-100' : '',
              )}
              style={{
                borderColor: dragging ? color : `${color}66`,
                background: dragging ? undefined : `${color}0D`,
              }}
            >
              <span
                className="flex size-16 items-center justify-center rounded-[20px]"
                style={{ background: `${color}20` }}
              >
                {file ? (
                  <FileAudio className="size-8" style={{ color }} aria-hidden />
                ) : (
                  <UploadCloud className="size-8" style={{ color }} aria-hidden />
                )}
              </span>
              {file ? (
                <>
                  <p className="max-w-full truncate font-semibold" title={file.name}>
                    {file.name}
                  </p>
                  <p
                    className={cn('text-[13px]', fileProblem ? 'text-ai' : 'text-ink-2')}
                    role={fileProblem ? 'alert' : undefined}
                  >
                    {fileProblem ?? formatBytes(file.size)}
                  </p>
                </>
              ) : (
                <p className="font-semibold">Drag a file here, or choose one</p>
              )}
              <p className="text-caption text-ink-2">{formatInfoForSelection(kinds)}</p>
              <input
                ref={input}
                type="file"
                className="sr-only"
                aria-label="Choose a file to analyze"
                tabIndex={-1}
                accept={allowedExtensions(kinds)
                  .map((e) => `.${e}`)
                  .join(',')}
                onChange={(e) => {
                  choose(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <Button
                variant="secondary"
                size="sm"
                disabled={busy || kinds.length === 0}
                onClick={() => input.current?.click()}
              >
                {file ? 'Choose another file' : 'Choose file'}
              </Button>
            </div>

            {uploadingBytes ? (
              <div className="mt-4" aria-live="polite">
                <div className="mb-1 flex justify-between text-[13px] text-gray-700">
                  <span>{progress < 100 ? 'Uploading…' : 'Starting analysis…'}</span>
                  <span>{progress}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Upload progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                  className="h-2 overflow-hidden rounded-full bg-gray-200"
                >
                  <div
                    className="h-full rounded-full bg-brand transition-[width]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex gap-3">
              <Button
                fullWidth
                disabled={!file || !!fileProblem || !canSubmit}
                loading={busy}
                onClick={submitFile}
              >
                {busy ? 'Uploading…' : 'Upload & analyze'}
              </Button>
              {busy ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    handle.current?.abort();
                    setBusy(false);
                  }}
                >
                  <X className="size-4" aria-hidden /> Cancel
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitUrl();
            }}
            noValidate
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-input bg-video/10">
                <LinkIcon className="size-5 text-video" aria-hidden />
              </span>
              <div>
                <p className="font-semibold">Paste URL</p>
                <p className="text-caption text-ink-2">YouTube, TikTok, IG, FB, X</p>
              </div>
            </div>
            <Input
              label="Link"
              type="url"
              inputMode="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              error={urlError}
              disabled={busy}
            />
            <Button
              type="submit"
              fullWidth
              className="mt-4"
              disabled={!url.trim() || !canSubmit}
              loading={busy}
            >
              Analyze URL
            </Button>
          </form>
        )}
      </Card>
      {modal}
    </div>
  );
}
