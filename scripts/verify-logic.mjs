/**
 * Manual verification script for FoamSales core logic.
 * Run: node scripts/verify-logic.mjs
 */

function calculateInvoiceTotals(input) {
  const productSubtotal = input.unitSalePrice * input.quantity;
  const invoiceTotal = productSubtotal + input.deliveryFee;
  const totalCost = input.unitCost * input.quantity;
  const netProfit = invoiceTotal - totalCost;
  const profitMargin =
    invoiceTotal > 0 ? (netProfit / invoiceTotal) * 100 : 0;
  return { productSubtotal, invoiceTotal, totalCost, netProfit, profitMargin };
}

const result = calculateInvoiceTotals({
  unitSalePrice: 1200,
  unitCost: 900,
  quantity: 12,
  deliveryFee: 200,
});

const checks = [
  ["productSubtotal", result.productSubtotal, 14400],
  ["invoiceTotal", result.invoiceTotal, 14600],
  ["totalCost", result.totalCost, 10800],
  ["netProfit", result.netProfit, 3800],
  ["profitMargin", Math.round(result.profitMargin * 10) / 10, 26],
];

let passed = 0;
for (const [name, actual, expected] of checks) {
  const ok = actual === expected;
  console.log(`${ok ? "✓" : "✗"} ${name}: ${actual} ${ok ? "" : `(expected ${expected})`}`);
  if (ok) passed++;
}

console.log(`\n${passed}/${checks.length} calculation checks passed`);
process.exit(passed === checks.length ? 0 : 1);
