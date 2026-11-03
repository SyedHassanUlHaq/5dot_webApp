export type Block =
  { t: 'h'; text: string } | { t: 'p'; text: string } | { t: 'ul'; items: string[] };

/** Splits the plain-text legal body into headings ("1. Title"), bullet lists ("- item") and paragraphs, without altering any wording. */
export function toBlocks(body: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of body.split(/\n{2,}/)) {
    const lines = chunk
      .split('\n')
      .map((l) => l.trimEnd())
      .filter(Boolean);
    if (!lines.length) continue;
    if (lines.length === 1 && /^\d+\.\s/.test(lines[0]!)) blocks.push({ t: 'h', text: lines[0]! });
    else if (lines.every((l) => l.startsWith('- ')))
      blocks.push({ t: 'ul', items: lines.map((l) => l.slice(2)) });
    else blocks.push({ t: 'p', text: lines.join('\n') });
  }
  return blocks;
}
