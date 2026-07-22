const CANONICAL_KEYS = ['d12', 'd23', 'd34', 'd41', 'd13', 'd24'] as const;

/**
 * Converts a cell value to a float, handling regional decimal formats.
 * - Numbers pass through directly.
 * - Strings handle both '19,97' (EU) and '1.234,56' (EU with thousands).
 * - Anything else returns NaN.
 */
export const smartParseFloat = (cell: unknown): number => {
  if (typeof cell === 'number') return cell;
  if (typeof cell !== 'string') return NaN;

  const s = cell.trim();
  if (s === '') return NaN;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  if (hasComma && hasDot) {
    // Both separators present — the last one is the decimal separator.
    // e.g. '1.234,56' → remove dots → '1234,56' → replace comma → '1234.56'
    // e.g. '1,234.56' → remove commas → '1234.56'
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    if (lastComma > lastDot) {
      return parseFloat(s.replace(/\./g, '').replace(',', '.'));
    } else {
      return parseFloat(s.replace(/,/g, ''));
    }
  }

  if (hasComma) {
    // Only commas — treat as decimal separator. e.g. '19,97' → '19.97'
    return parseFloat(s.replace(',', '.'));
  }

  return parseFloat(s);
};

// Detects Excel date serial numbers — large integers that SheetJS returns when
// a cell like "1-2" was auto-converted to a date by Excel on save.
// Small integers (< 1000) are never date serials for modern dates.
const isDateSerial = (cell: unknown): cell is number =>
  typeof cell === 'number' && Number.isInteger(cell) && cell > 1000;

// Converts an Excel date serial back to a "M-D" string (e.g. 46054 → "2-1").
// normalizeDistanceKey sorts the digits, so "2-1" and "1-2" both map to "d12".
const dateSerialToLabel = (serial: number): string => {
  const date = new Date((serial - 25569) * 86400 * 1000);
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return `${month}-${day}`;
};

/**
 * Normalizes a distance label to a canonical key like 'd12', 'd23', etc.
 * Accepts: 'd12' 'D12' '12' '1-2' '1_2' '1 2' '1,2' '1;2'
 * Also accepts Excel date serials (e.g. 46054) produced when SheetJS reads
 * an XLSX where "1-2" was auto-converted to a date.
 * The d41 pair is a special case — '4-1' and '1-4' both map to 'd41'.
 */
export const normalizeDistanceKey = (rawKey: unknown): string => {
  const key = isDateSerial(rawKey) ? dateSerialToLabel(rawKey) : String(rawKey);
  const stripped = key.trim().replace(/[dD\-_\s,;\.]/g, '');
  if (stripped === '41' || stripped === '14') {
    return 'd41';
  }
  return `d${stripped.split('').sort().join('')}`;
};

/**
 * Parses a raw 2D grid (from SheetJS sheet_to_json with header:1) into a
 * structured distances object. Pure function — no I/O, no side effects.
 *
 * Handles:
 *  - 1-column format: 6 numeric values in canonical order
 *  - 2-column format: [label, value] pairs in any order
 *  - Optional header row (detected, not assumed by row count alone)
 *  - Regional decimal separators ('19,97' → 19.97)
 *  - Blank/empty rows anywhere in the grid
 */
export const parseDistancesData = (grid: unknown[][]): Record<string, number> => {
  // Step 1: strip empty rows
  const rows = grid.filter((row) =>
    row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== '')
  );

  // Step 2: detect and strip header
  // A row is a header if none of its cells parse as a finite number.
  const rowHasNumber = (row: unknown[]) => row.some((cell) => isFinite(smartParseFloat(cell)));

  let data = rows;
  if (rows.length === 7) {
    if (!rowHasNumber(rows[0])) {
      data = rows.slice(1);
    } else {
      throw new Error('invalidDistancesFileFormat');
    }
  }

  if (data.length !== 6) {
    throw new Error('invalidDistancesFileFormat');
  }

  // Step 3: detect shape
  // A distance label is: optional d/D, one digit, optional separator, one digit.
  // e.g. 'd12' 'D12' '12' '1-2' '1_2' '1 2' '1,2' '1;2'
  // This is intentionally stricter than smartParseFloat so that '2,3' (label)
  // is not confused with 2.3 (a float).
  const isDistanceLabel = (cell: unknown): boolean => {
    if (isDateSerial(cell)) return true; // XLSX date serial from a "1-2" label
    if (typeof cell !== 'string') return false;
    return /^[dD]?\d[\-_\s,;.]?\d$/.test(cell.trim());
  };

  // 2-col: col[0] is a distance label, col[1] is a parseable number — for all 6 rows.
  // 1-col: col[0] is a parseable number — for all 6 rows.
  const isTwoCol = data.every((row) => isDistanceLabel(row[0]) && isFinite(smartParseFloat(row[1])));

  const isOneCol = data.every((row) => isFinite(smartParseFloat(row[0])));

  // Step 4 & 5: parse values and (for 2-col) normalize keys
  let values: number[];

  if (isTwoCol) {
    const distanceMap: Record<string, number> = {};
    for (const row of data) {
      const key = normalizeDistanceKey(row[0]);
      // smartParseFloat is safe here because isTwoCol already confirmed col[1] is finite
      distanceMap[key] = smartParseFloat(row[1]);
    }

    values = CANONICAL_KEYS.map((key) => {
      if (!(key in distanceMap)) {
        throw new Error('invalidDistancesFileFormat');
      }
      return distanceMap[key];
    });
  } else if (isOneCol) {
    values = data.map((row) => smartParseFloat(row[0]));
  } else {
    throw new Error('invalidDistancesFileFormat');
  }

  // Step 6: validate and build result
  const result: Record<string, number> = {};
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (!isFinite(v)) throw new Error('invalidDistancesNotValidValue');
    if (v < 0) throw new Error('invalidDistancesNegativeValue');
    result[CANONICAL_KEYS[i]] = v;
  }

  return result;
};
