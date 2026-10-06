/** "6–9, 12" from [6, 7, 8, 9, 12]: station numbers as the report prints them. */
export const formatStationRanges = (stations: number[]): string => {
  const sorted = [...new Set(stations)].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) continue;
    const end = sorted[i - 1];
    parts.push(start === end ? `${start}` : `${start}–${end}`);
    start = sorted[i];
  }
  return parts.join(', ');
};
