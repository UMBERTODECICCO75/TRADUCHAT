# TraduChat — Payment and account audit

## Implemented after approved plan (19 October 2026)
- Catalog is shared across public prices, assistant checkout, fulfillment and tests. Each checkout is a server-created authenticated order, amount/currency/type checked, tied to a transaction before opening Paddle.js in Italian. Phone accounts enter a real receipt email separately from sign-in identity.
- Environment-scoped balances preserve the existing free-only balances; the audited legacy purchase count was zero, so there were no existing paid entitlements to attribute. New test purchases cannot fund live balances. Legacy purchase item data is backfilled for compatibility.
- Fulfillment is atomic and idempotent; signed events and completed-order recovery use the same helper. Duplicate notifications do not add credits twice. Missing event delivery is recoverable for bound orders.
- Assistant request UUIDs reserve one credit, store successful answers for replay, release failures and recover interrupted reservations after five minutes. Browser retries keep UUIDs during uncertain network outcomes. A real preview question returned its answer and moved the test balance from 9 to 8.
- Approved refund totals are calculated cumulatively using tax-inclusive adjustment totals. Partial rounding happens once, not once per tiny refund. Chargeback reversals restore entitlement; stale snapshots cannot reverse newer results. Available balance stays nonnegative, while signed internal accounting prevents a refunded pending credit reappearing after failure recovery.
- Purchase history is paginated with explicit retry/errors, actual purchased credit totals and refund credit amounts. Confirmation checks a committed purchase, never a query-string flag.
- Phone login uses a private immutable number-to-account mapping; mutable profile contacts are neither login identity nor admin-promotion targets. Admin promotion uses an account UUID and verifies the actual Auth identity. Signup quota errors fail closed; code attempts and code claims are atomic. Phone password recovery no longer tries synthetic email.
- Assisted deletion and support/privacy/copyright requests are stored, owner-readable and reviewable only after admin authorization. Review does not delete shared conversations or financial records; operator handles retention and actual closure separately.
- Terms and privacy now name Umbertodecicco Association; the owner-confirmed 30-day full refund guarantee applies even after partial credit use. Public legal email/address/registration details still need the owner.
- Hosted Google, Apple and Microsoft providers were read/configured as already enabled. Full external OAuth and email/SMS recovery completion were not exercised during this audit.
- Final regression run: 38 tests passed, 151 assertions, including direct isolated-database concurrency, first purchase, refunds/reversals, stale snapshots, recovered reservations, restricted financial RPCs, role writes and private identity reads. Preview build log reports build OK.
- Authenticated preview verified checkout opening with test mode and 2.99 EUR, answer generation/debit, purchase-history read and persisted support-request acknowledgment. The requesting account was correctly denied admin access; admin review UI was not exercised as an admin. Test support rows and isolated ledger accounts were removed.

## Remaining limitations, not claimed fixed
- Seller identity verification and live approval require the owner in Payments; no bank payout is verified.
- Checkout opening works, but payment card entry and actual provider refund approval remain manual checks. Automated ledger tests do not prove a real provider transaction was completed.
- Public support/privacy email was supplied and linked in Terms, Privacy and Refunds. Professional address and applicable registration details have not been supplied.
- Verified login-email/phone changes and account merging are intentionally not added: profile fields are contacts only. Changing the actual login identity remains an assisted ownership-check process.
- If both transaction binding and event delivery fail, the unbound provider transaction still requires operator investigation; normal bound orders recover automatically.
- Refund reconciliation is enforced on access, not an always-running scheduler; long purchase histories require provider calls before balance/assistant use.

## Manual preview checklist
1. Sign in and note the explicitly labelled test balance. Open Recharge credits and select 50 credits.
2. Enter test card **4242 4242 4242 4242**, **CVC 123**, any name and a future expiry.
3. Check exactly +50 credits, one purchase entry and no second credit grant after reload.
4. Ask one question: exactly -1 credit when the answer succeeds. On a failed answer, verify no permanent debit.
5. Try decline card **4000 0000 0000 0002**: no credits or purchase fulfillment.
6. In Payments (test view), approve full and partial refunds; refresh balance/history twice and verify each deduction only once.
7. Test account request submission/status with an expendable test account; do not request deletion of an account you want to retain.
8. Test real payments only after approval. Test cards never transfer money to a bank.

## Historical baseline (before changes)

## Verified current behavior
- Three active, one-time EUR prices match in test and live: 50 credits / 299 cents, 200 / 999, 1000 / 3999. No trial or billing cycle; renewal, upgrade, downgrade and subscription cancellation are not applicable.
- Authentication covers private pages and balance/history/assistant functions. Credit ownership is by immutable user UUID, not contact email. Email/password, email verification, phone verification and social sign-in paths exist; hosted provider settings were not independently read.
- Checkout resolves external price IDs via the authenticated connector gateway, loads Paddle.js, passes customer email and user UUID, and redirects to /app?checkout=success. Webhook verifies Paddle signature before fulfillment.
- Applied database schema and consume/grant/deduct RPCs match migrations 0014/0015. Wallet/purchase reads have own-user RLS; mutations are privileged. Atomic decrement prevents negative balances, but surrounding workflows are not atomic.
- Public home, pricing, terms, refunds and privacy return 200 with app-specific titles. Test checkout opened with the requesting user's real session; displayed 2.99 EUR including tax. Balance read was 9; purchase history and aggregate purchase query were empty. No completed test payment or bank payout was verified.
- Current provider readiness: privacy, refunds, public pricing, site content and acceptable use pass. Terms require actual legal operator details. Identity/domain/business/final reviews remain unfinished; live checkout is unavailable. Earlier acceptable-use failure is no longer current.

## Confirmed repair scope
1. Purchase insert and credit grant must commit together; current duplicate handling can permanently skip fulfillment after a grant failure.
2. Initialize free allowance atomically: current balance upsert can reset concurrently credited balances, and purchase-first initialization omits 10 free credits.
3. Isolate test and live wallets and consumption; current shared wallet lets simulated payments fund real usage.
4. Refund reconciliation must apply approved adjustments only, account for partial line refunds, commit deduction and adjustment record together, and prevent duplicate deductions. Current pending-refund/full-purchase deduction is incorrect. Paginate reconciliation and enforce it server-side, not only on assistant page mount. Existing webhook subscriptions cannot be assumed to include adjustment events.
5. Reserve/settle assistant credits idempotently and release on failed generation; current provider failure consumes a credit without a response.
6. Validate environments, allowlist catalog prices, check upstream response status and item quantities. Bind an authenticated checkout order to the intended user server-side rather than trusting browser custom data alone. Do not prefill synthetic phone-login email as a real billing address.
7. Centralize pack definitions across pricing, checkout, tests and fulfillment. History needs pagination, explicit errors/retry, aggregate/line-item labels and refund amounts. Checkout completion query text is not proof of fulfilled payment; confirm the committed purchase and poll with cleanup.
8. Profile contact changes must not break phone-login identity lookup; keep contact fields distinct from verified identity. Account linking/merging is not implemented and must not transfer wallets without ownership proof.
9. Admin promotion target must be an immutable user ID with actual Auth identity, not editable profile email. Keep the caller's existing authenticated admin-role check.
10. Email signup quota errors must fail closed; failed verification attempts must be atomic and profile creation failures checked. Normalize social-sign-in error handling; keep recovery-session safeguards. Hosted OAuth settings and complete signup/recovery flows remain unverified.
11. Account deletion promised by terms has no implementation. Decide request versus automatic deletion, remaining credits and financial retention before deleting profiles (wallet/purchase FK cascades currently apply). Preserve shared conversations and media belonging to others.
12. Publish real legal operator and public support/privacy contact. The 30-day unconditional refund guarantee was previously authored without explicit owner confirmation.

## Safe defaults for the proposed plan
- Preserve prices, 10 free credits, one credit per successful assistant response, non-expiring prepaid credits and refund deduction floored at zero.
- No subscription, automatic account merging or new call/agenda features.
- Separate test entitlements from live entitlements without resetting existing live user balances; document migration provenance for currently unsplit balances.
- Keep contact editing separate from sign-in identity until verified identity-change workflows can prove ownership.

## Verification after implementation
- Regression tests: catalog amounts, 10-credit initialization, first purchase, duplicate/concurrent fulfillment, failed-fulfillment rollback, balance/consume races, successful/failed AI generation, full/partial/pending/duplicate refunds, test/live isolation, unauthorized reads/mutations, admin-target spoofing and phone identity lookup after contact edits.
- Authenticated preview: buy a pack, read back its committed purchase and balance, ask one question, verify exactly one credit consumed, reload history; verify errors and pagination.
- Manual test card: 4242 4242 4242 4242, CVC 123, any future expiry and cardholder name. Decline card: 4000 0000 0000 0002. Test full/partial refunds in Payments and verify balance/history after approval. Test purchases never generate real payouts.
- Automated browser testing can open checkout and verify post-payment app state, but card submission remains manual. Live payments/payouts require completed personal verification and real transactions; never claim funds reached a bank based on a simulated transaction.