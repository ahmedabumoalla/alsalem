# Current task state

Updated: 2026-09-28 17:02 +03:00. Repository: foam-sales; base commit a069664.

## Ahmed salary and total
- Completed: `src/components/reports/invoice-report-summary.tsx` now labels commission, fixed salary (SAR 2,500), and total (commission + salary), for Ahmed only. Shared component serves desktop and mobile; existing currency formatting and theme tokens retained.
- RUN/PASS: `npx eslint src/components/reports/invoice-report-summary.tsx` and `git diff --check`, 2026-09-28 17:02 +03:00, Windows / Node v20.20.2, base a069664 plus this component diff and commission changes below. Dependencies/configuration unchanged.
- Source/diff review: salary is added once to the displayed commission; other sellers retain the dash. No backend, authorization, or stored accounting changes.
- REUSED: accounting evidence below; calculation utility, tests, and their dependencies unchanged since that run. NOT RUN: browser/full build (small presentation change). No outstanding work.

## Ahmed commission
- Completed: removed the 30% tier. Commission is 20% of full profit at 20,000 and above; existing lower tiers and rounding remain unchanged.
- Read: `src/lib/utils/invoice-report.ts` owns the calculation; `src/components/reports/invoice-report-summary.tsx` uses it for both amount and displayed percentage. No persistence or authorization changes.
- Uncommitted implementation: `src/lib/utils/invoice-report.ts`; regression assertions: `scripts/verify-accounting.ts` (20,001, 30,000, 30,001, 50,000 and 1,000,000).
- RUN/PASS: `npm run verify:accounting`, 2026-09-28 16:59 +03:00, Windows / Node v20.20.2, about 3 seconds. Includes commission boundaries and existing accounting/report assertions. Inputs: base a069664 plus the changes described above; dependencies and configuration unchanged.
- RUN/PASS: `git diff --check` at the same time; source review confirms amount and percentage share the updated function.
- NOT RUN: browser, full build, full test suite; change is isolated arithmetic covered by the accounting check. No live backend changes or verification required. No outstanding work.
