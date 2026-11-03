import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ScanResponse } from '@/lib/api/schemas';
import { pollDelay } from '@/lib/scan/hooks';
import { ScanListItem } from './ScanListItem';
import { ScoreTimeline } from './ScoreTimeline';
import { VerdictRing } from './VerdictRing';

vi.mock('next/link', () => ({
  default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...r}>
      {children}
    </a>
  ),
}));

const scan = (over: Partial<ScanResponse> = {}): ScanResponse => ({
  requestId: 'r/1',
  filename: 'clip.mp4',
  status: 'complete',
  progress: 100,
  detections: { ai_video: { requested: true, status: 'complete' } },
  resultData: { ai_video: { score: 0.9, threshold: 0.5 } },
  errorMessage: null,
  createdAt: '2026-01-01T00:00:00Z',
  completedAt: '2026-01-01T00:01:00Z',
  ...over,
});

describe('ScanListItem', () => {
  it('links to the encoded scan route and shows the verdict chip', () => {
    render(<ScanListItem scan={scan()} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/scan/r%2F1');
    expect(screen.getByText('Likely AI')).toBeInTheDocument();
  });
  it('shows Analyzing while there is no result and Failed on failure', () => {
    const { rerender } = render(
      <ScanListItem scan={scan({ status: 'processing', resultData: null, completedAt: null })} />,
    );
    expect(screen.getByText('Analyzing')).toBeInTheDocument();
    rerender(<ScanListItem scan={scan({ status: 'failed', resultData: null })} />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });
});

describe('VerdictRing', () => {
  it('exposes label and score to assistive tech', () => {
    render(<VerdictRing color="#D94060" label="Likely AI" scorePct={77} />);
    expect(screen.getByRole('img', { name: 'Likely AI, score 77%' })).toBeInTheDocument();
  });
});

describe('ScoreTimeline', () => {
  it('renders nothing without points', () => {
    const { container } = render(
      <ScoreTimeline
        series={[{ key: 'a', label: 'A', color: '#000', threshold: 0.5, points: [] }]}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
  it('offers a text alternative table', () => {
    render(
      <ScoreTimeline
        series={[
          {
            key: 'a',
            label: 'Video',
            color: '#000',
            threshold: 0.5,
            points: [{ start: 0, end: 5, score: 0.8 }],
          },
        ]}
      />,
    );
    expect(screen.getByRole('table', { hidden: true })).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });
});

describe('pollDelay', () => {
  it('holds 1.5s then backs off, capped at 5s', () => {
    expect(pollDelay(0)).toBe(1500);
    expect(pollDelay(10)).toBe(1500);
    expect(pollDelay(11)).toBeGreaterThan(1500);
    expect(pollDelay(200)).toBe(5000);
  });
});
