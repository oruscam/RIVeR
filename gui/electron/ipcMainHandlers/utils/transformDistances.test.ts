/**
 * Tests for transformDistances / normalizeDistanceKey (issue #148)
 *
 * Run with:  npx ts-node transformDistances.test.ts
 * (no test framework needed — plain assertions)
 */

// ─── inline the implementation so this file is self-contained ────────────────

const normalizeDistanceKey = (rawKey: string): string => {
  const stripped = rawKey.trim().replace(/[dD\-_\s,;]/g, '');
  if (stripped === '41' || stripped === '14') {
    return 'd41';
  }
  return `d${stripped.split('').sort().join('')}`;
};

const transformDistances = (distances: any[]): { [key: string]: number } => {
  const distancesObject: { [key: string]: number } = {};
  const keys = ['d12', 'd23', 'd34', 'd41', 'd13', 'd24'];

  if (distances.length > 7) throw new Error('invalidDistancesFileFormat');

  if (distances.length === 7) distances.shift();

  let newDistances: number[] = [];

  if (
    typeof distances[0][0] === 'string' &&
    typeof distances[0][1] === 'number' &&
    distances.length === 6
  ) {
    const distanceMap: { [key: string]: number } = {};
    distances.forEach(([key, value]: [string, number]) => {
      distanceMap[normalizeDistanceKey(String(key))] = value;
    });
    newDistances = keys.map((key) => {
      if (!(key in distanceMap)) throw new Error('invalidDistancesFileFormat');
      return distanceMap[key];
    });
  } else if (typeof distances[0][0] === 'number' && distances.length === 6) {
    newDistances = distances.map((row) => row[0]);
  } else {
    throw new Error('invalidDistancesFileFormat');
  }

  newDistances.forEach((value, index) => {
    if (typeof value !== 'number') throw new Error('invalidDistancesNotValidValue');
    if (value < 0) throw new Error('invalidDistancesNegativeValue');
    distancesObject[keys[index]] = value;
  });

  return distancesObject;
};

// ─── helpers ─────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(description: string, actual: any, expected: any) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  ✓  ${description}`);
    passed++;
  } else {
    console.error(`  ✗  ${description}`);
    console.error(`     expected: ${JSON.stringify(expected)}`);
    console.error(`     actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

function assertThrows(description: string, fn: () => any, expectedMsg: string) {
  try {
    fn();
    console.error(`  ✗  ${description} — expected throw but did not throw`);
    failed++;
  } catch (e: any) {
    if (e.message === expectedMsg) {
      console.log(`  ✓  ${description}`);
      passed++;
    } else {
      console.error(`  ✗  ${description} — wrong error: ${e.message}`);
      failed++;
    }
  }
}

const EXPECTED = { d12: 19.97, d23: 36.84, d34: 29.30, d41: 19.73, d13: 44.36, d24: 27.14 };

// ─── 1. normalizeDistanceKey ──────────────────────────────────────────────────

console.log('\nnormalizeDistanceKey');
assert('d12',  normalizeDistanceKey('d12'),  'd12');
assert('D12',  normalizeDistanceKey('D12'),  'd12');
assert('12',   normalizeDistanceKey('12'),   'd12');
assert('1-2',  normalizeDistanceKey('1-2'),  'd12');
assert('1_2',  normalizeDistanceKey('1_2'),  'd12');
assert('1 2',  normalizeDistanceKey('1 2'),  'd12');
assert('1,2',  normalizeDistanceKey('1,2'),  'd12');
assert('1;2',  normalizeDistanceKey('1;2'),  'd12');
assert('d41',  normalizeDistanceKey('d41'),  'd41');
assert('d14',  normalizeDistanceKey('d14'),  'd41');
assert('4-1',  normalizeDistanceKey('4-1'),  'd41');
assert('1-4',  normalizeDistanceKey('1-4'),  'd41');
assert('4,1',  normalizeDistanceKey('4,1'),  'd41');

// ─── 2. one-column format (no header) ────────────────────────────────────────

console.log('\none-column format — no header');
const oneColNoHeader = [
  [19.97], [36.84], [29.30], [19.73], [44.36], [27.14],
];
assert('canonical order', transformDistances([...oneColNoHeader]), EXPECTED);

console.log('\none-column format — with header');
const oneColWithHeader = [
  ['distance'], [19.97], [36.84], [29.30], [19.73], [44.36], [27.14],
];
assert('canonical order + header row', transformDistances([...oneColWithHeader]), EXPECTED);

// ─── 3. two-column format — various label styles ──────────────────────────────

const makeTwoCol = (labelFn: (a: number, b: number) => string) => [
  [labelFn(1, 2), 19.97],
  [labelFn(2, 3), 36.84],
  [labelFn(3, 4), 29.30],
  [labelFn(4, 1), 19.73],
  [labelFn(1, 3), 44.36],
  [labelFn(2, 4), 27.14],
];

console.log('\ntwo-column format — label styles (in-order)');
assert('dXY',  transformDistances(makeTwoCol((a, b) => `d${a}${b}`)),  EXPECTED);
assert('DXY',  transformDistances(makeTwoCol((a, b) => `D${a}${b}`)),  EXPECTED);
assert('XY',   transformDistances(makeTwoCol((a, b) => `${a}${b}`)),   EXPECTED);
assert('X-Y',  transformDistances(makeTwoCol((a, b) => `${a}-${b}`)),  EXPECTED);
assert('X_Y',  transformDistances(makeTwoCol((a, b) => `${a}_${b}`)),  EXPECTED);
assert('X Y',  transformDistances(makeTwoCol((a, b) => `${a} ${b}`)),  EXPECTED);
assert('X,Y',  transformDistances(makeTwoCol((a, b) => `${a},${b}`)),  EXPECTED);
assert('X;Y',  transformDistances(makeTwoCol((a, b) => `${a};${b}`)),  EXPECTED);

console.log('\ntwo-column format — shuffled order');
const shuffled = [
  ['d13', 44.36],
  ['d24', 27.14],
  ['d12', 19.97],
  ['d34', 29.30],
  ['d23', 36.84],
  ['d41', 19.73],
];
assert('reordered rows', transformDistances([...shuffled]), EXPECTED);

console.log('\ntwo-column format — shuffled + mixed label styles');
const mixedStyles = [
  ['1;3',  44.36],
  ['2 4',  27.14],
  ['d12',  19.97],
  ['3-4',  29.30],
  ['2,3',  36.84],
  ['4_1',  19.73],
];
assert('mixed styles + reordered', transformDistances([...mixedStyles]), EXPECTED);

console.log('\ntwo-column format — with header row');
const twoColWithHeader = [
  ['label', 'value'],
  ['d12', 19.97],
  ['d23', 36.84],
  ['d34', 29.30],
  ['d41', 19.73],
  ['d13', 44.36],
  ['d24', 27.14],
];
assert('header row discarded', transformDistances([...twoColWithHeader]), EXPECTED);

// ─── 4. error cases ───────────────────────────────────────────────────────────

console.log('\nerror cases');
assertThrows(
  'too many rows',
  () => transformDistances([[1],[2],[3],[4],[5],[6],[7],[8]]),
  'invalidDistancesFileFormat',
);
assertThrows(
  'negative value',
  () => transformDistances([[-1],[2],[3],[4],[5],[6]]),
  'invalidDistancesNegativeValue',
);
assertThrows(
  'missing label in 2-col',
  () => transformDistances([
    ['d12', 1], ['d23', 2], ['d34', 3], ['d41', 4], ['d13', 5], ['dXX', 6],
  ]),
  'invalidDistancesFileFormat',
);

// ─── summary ─────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
