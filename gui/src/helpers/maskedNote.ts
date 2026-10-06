/** Which Processing note to show for a technique's masked-station preview. */
export const maskedNote = (flags: boolean[]): { key: 'none' | 'some' | 'all'; count: number } => {
  const count = flags.filter(Boolean).length;
  if (count === 0) return { key: 'none', count };
  return { key: count === flags.length ? 'all' : 'some', count };
};
