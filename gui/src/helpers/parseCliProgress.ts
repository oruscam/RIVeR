export interface CliProgress {
  percentage: string;
  time: string;
}

/**
 * Extracts a percentage and remaining time from a tqdm-formatted stdout/stderr
 * line (e.g. "45%|████      | 9/20 [00:12<00:15, 1.29it/s]"). Returns empty
 * strings for either field when the line doesn't contain that data.
 */
export const parseCliProgress = (text: string): CliProgress => {
  const percentageMatch = text.match(/(\d+%)\|/);
  const percentage = percentageMatch ? percentageMatch[1] : '';

  const timeMatch = text.match(/\[(\d{2}:\d{2})<(\d{2}:\d{2})/);
  const time = timeMatch ? timeMatch[2] : '';

  return { percentage, time };
};
