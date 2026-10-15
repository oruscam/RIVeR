import { REPORT_FLOW } from '../constants/constants';

export interface FlowBlock {
  id: string;
  height: number;
}

/** Pages of block ids, in order. A block never splits; a block taller than the page gets a page of its own. */
export function paginate(blocks: FlowBlock[], pageHeight: number, gap: number): string[][] {
  const pages: string[][] = [[]];
  let used = 0;
  blocks.forEach((block) => {
    const page = pages[pages.length - 1];
    const needed = page.length === 0 ? block.height : used + gap + block.height;
    if (page.length > 0 && needed > pageHeight) {
      pages.push([block.id]);
      used = block.height;
      return;
    }
    page.push(block.id);
    used = needed;
  });
  return pages;
}

export function stationChunks(count: number): [number, number][] {
  const first = Math.min(count, REPORT_FLOW.FIRST_CHUNK_STATIONS);
  const chunks: [number, number][] = [[0, first]];
  for (let start = first; start < count; start += REPORT_FLOW.CONTINUATION_CHUNK_STATIONS) {
    chunks.push([start, Math.min(count, start + REPORT_FLOW.CONTINUATION_CHUNK_STATIONS)]);
  }
  return chunks;
}

export function splitInto(start: number, end: number, parts: number): [number, number][] {
  const count = end - start;
  if (count <= 0) return [];
  const columns = Math.min(parts, count);
  const base = Math.floor(count / columns);
  const extra = count % columns;
  const ranges: [number, number][] = [];
  let from = start;
  for (let k = 0; k < columns; k++) {
    const to = from + base + (k < extra ? 1 : 0);
    ranges.push([from, to]);
    from = to;
  }
  return ranges;
}
