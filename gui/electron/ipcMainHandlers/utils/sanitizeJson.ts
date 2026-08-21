// The Python backend's json.dump() emits bare NaN/Infinity/-Infinity tokens by default for
// float('nan')/inf values (e.g. displacement at zero-depth bank stations) — valid for
// Python's own lenient json.loads, but not valid strict JSON, so Node's JSON.parse rejects
// it. Sanitize to null before parsing, consistent with how the frontend already treats
// missing/invalid values everywhere else (velocity/displacement arrays are typed
// (number | null)[] throughout). Only matches the bare token as a JSON value (preceded by
// ':', '[' or ',' and followed by ',', ']' or '}'), so it never touches a quoted "NaN" string.
export function sanitizeNonStandardJsonTokens(raw: string): string {
  return raw
    .replace(/(?<=[:[,]\s*)-?Infinity(?=\s*[,\]}])/g, 'null')
    .replace(/(?<=[:[,]\s*)NaN(?=\s*[,\]}])/g, 'null');
}
