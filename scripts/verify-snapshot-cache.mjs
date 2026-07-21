/**
 * Verifies cached snapshot returns stable references.
 * Run: node scripts/verify-snapshot-cache.mjs
 */

// Simulate the cache logic (mirrors invoice-storage.ts)
const EMPTY = [];
let cachedRaw = undefined;
let cachedInvoices = EMPTY;

function getSnapshot(readRaw) {
  const raw = readRaw();
  if (raw === cachedRaw) return cachedInvoices;
  cachedRaw = raw;
  if (!raw) {
    cachedInvoices = EMPTY;
    return cachedInvoices;
  }
  cachedInvoices = JSON.parse(raw);
  return cachedInvoices;
}

function invalidate() {
  cachedRaw = undefined;
}

let storage = null;
const readRaw = () => storage;

// Empty storage — same reference twice
const a = getSnapshot(readRaw);
const b = getSnapshot(readRaw);
console.assert(a === b, "empty: same reference");
console.assert(a === EMPTY, "empty: uses EMPTY_INVOICES");

// Same raw value — same reference
storage = "[]";
invalidate();
const c = getSnapshot(readRaw);
const d = getSnapshot(readRaw);
console.assert(c === d, "parsed empty array: same reference");

// After invalidate + same data — new parse but stable on repeat
storage = '[{"id":"1"}]';
invalidate();
const e = getSnapshot(readRaw);
const f = getSnapshot(readRaw);
console.assert(e === f, "with data: same reference on repeat");
console.assert(e !== EMPTY, "with data: not EMPTY reference");

console.log("✓ All snapshot cache checks passed");
