/**
 * The number nearest a point of a die texture, as pixel indices of a `size`×`size` mask
 * (`lit[i]` = 1 where a number is drawn). Pieces closer than `gap` pixels belong to one number,
 * so "10", "17" and the dot under a 6 or 9 stay together. Empty when no number is within
 * `searchRadius` pixels of the point.
 */
export function findNumber(
  lit: Uint8Array,
  size: number,
  u: number,
  v: number,
  searchRadius: number,
  gap: number
): number[] {
  const cx = Math.floor(u * size);
  const cy = Math.floor(v * size);
  let seed = -1;
  let best = Infinity;
  for (let y = Math.max(0, cy - searchRadius); y <= Math.min(size - 1, cy + searchRadius); y++) {
    for (let x = Math.max(0, cx - searchRadius); x <= Math.min(size - 1, cx + searchRadius); x++) {
      const d = (x - cx) ** 2 + (y - cy) ** 2;
      if (lit[y * size + x] && d < best && d <= searchRadius ** 2) {
        best = d;
        seed = y * size + x;
      }
    }
  }
  if (seed < 0) {
    return [];
  }
  const seen = new Uint8Array(size * size);
  const found: number[] = [];
  const queue = [seed];
  seen[seed] = 1;
  while (queue.length > 0) {
    const i = queue.pop()!;
    found.push(i);
    const x0 = i % size;
    const y0 = Math.floor(i / size);
    for (let y = Math.max(0, y0 - gap); y <= Math.min(size - 1, y0 + gap); y++) {
      for (let x = Math.max(0, x0 - gap); x <= Math.min(size - 1, x0 + gap); x++) {
        const j = y * size + x;
        if (lit[j] && !seen[j]) {
          seen[j] = 1;
          queue.push(j);
        }
      }
    }
  }
  return found;
}
