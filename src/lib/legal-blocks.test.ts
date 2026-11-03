import { describe, expect, it } from 'vitest';
import { LEGAL_CONTENT } from '@/content/legal-content';
import { toBlocks } from './legal-blocks';

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

describe('toBlocks', () => {
  it('classifies headings, bullets and paragraphs', () => {
    expect(toBlocks('1. Title\n\nHello\nworld\n\n- a\n- b')).toEqual([
      { t: 'h', text: '1. Title' },
      { t: 'p', text: 'Hello\nworld' },
      { t: 'ul', items: ['a', 'b'] },
    ]);
  });
  it.each(['terms', 'cookies'] as const)(
    'keeps every word of the %s text (no legal wording is lost or changed)',
    (k) => {
      const out = toBlocks(LEGAL_CONTENT[k].body)
        .map((b) => (b.t === 'ul' ? b.items.map((i) => `- ${i}`).join(' ') : b.text))
        .join(' ');
      expect(norm(out)).toBe(norm(LEGAL_CONTENT[k].body));
    },
  );
});
