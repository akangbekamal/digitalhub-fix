# DigitalHubGH integrated wallet and deposit approvals

## Scope and verified starting point
Preserve the existing website, external database, customer profiles, roles, checkout, orders, delivery, Mobile Money methods, Brevo emails, Message Center, notifications and activity logs. No replacement backend, redesign, deletion, reset or invented financial records.

Read-only inspection confirmed 38 public tables, no existing wallet equivalents, existing customer/staff role policies, and a private `payment-proofs` bucket. Database management access now works after secure credential replacement. No database changes have been applied.

**Resolved proof privacy:** use strictly authenticated administrator proof viewing. Emails contain a secure VIEW FULL PAYMENT PROOF link, not embedded images. Showing an image directly in Gmail would expose a temporary bearer URL without administrator authentication. The protected viewer supports multiple JPG/JPEG/PNG/WEBP images and PDFs and renews short-lived links after authorization.

## Phase 1 — Database and financial security
Add only these integrated records:
- `wallets`: one per authenticated customer, GH₵ decimal balance, frozen/enabled state and timestamps.
- `wallet_transactions`: immutable ledger, signed balance movement, before/after balance, customer/wallet, transaction type, unique reference and idempotency key, optional order/deposit/refund relationship, administrator and timestamps.
- `wallet_deposit_requests`: amount, method, customer payment references, immutable proof paths, six required statuses and review metadata.
- `wallet_approval_tokens`: cryptographically random token hashes, deposit/action binding, expiration and consumption. No plaintext token storage.
- `wallet_decision_history`: append-only deposit decisions and reasons, authenticated actor and timestamps.

Reuse `store_settings` for public wallet/payment options and private email/decision settings; `orders`, `order_items`, `payments`, `refunds`, `order_status_history`, `notifications`, `message_logs`, and `admin_activity_logs` remain authoritative. No duplicate order, payment, email queue or notification system.

Enforce explicit grants and RLS on every new table. Customers read only their own financial records; no direct balance or ledger writes. Financial administrators are `admin` and `super_admin`, not all existing staff roles. No new administrator grants. Protect all mutations with authenticated database functions, fixed search paths and narrow execution privileges.

Use row locks, balance constraints, database transactions and unique event keys for exactly-once approval, debit, purchase and refund. Financial history must not cascade-delete when a customer/order is removed. Validate customer status, currency, finite two-decimal amounts, configured limits, existing proof ownership and approved payment methods inside the trusted boundary.

**Gate:** verify deployed schema, privileges, RLS, immutable ledger enforcement and mutation authorization before Phase 2. Do not create financial transactions to claim passing tests.

## Phase 2 — Wallet operations and existing order integration
- Create a single zero-balance wallet for existing customers and future registrations without changing profile/role creation; provide safe idempotent recovery for missing wallets.
- Implement deposit submission, customer-owned history, pending deposits and totals.
- Implement administrator decisions, mandatory-reason adjustments and eligible order refunds.
- Add an atomic wallet-only checkout operation that reprices products/coupons, validates stock and discounts, locks the wallet, creates the existing order/items/payment/history and wallet debit together. An insufficient balance or failed write rolls back everything.
- Keep current Mobile Money checkout unchanged; wallet purchases use the existing verified-payment and digital-delivery process.
- Prevent duplicate approvals, concurrent spending and refunds exceeding or duplicating the original eligible order amount.

**Gate:** verify state transitions and ledger/balance invariants before email work. Real credit/purchase/refund verification requires an actual customer deposit/payment or an explicitly authorized real transaction; no fake approvals.

## Phase 3 — Brevo email decisions and private proofs
- Send one configured administrator email per submitted deposit through the existing Brevo integration, with the specified subject, GH₵ amount, complete customer/payment details, secure proof link and three action links.
- GET links only open confirmation. Require administrator sign-in and recent authentication before any decision; do not consume tokens or change financial state when scanners open links.
- Approve/reject/request-information use authenticated POST operations with hashed expiring tokens, action/deposit binding, durable attempt limits, single-use consumption and decision audit in the same financial transaction.
- MORE_INFORMATION_REQUIRED remains unresolved and uncredited; provide customer responses with additional references/proofs and re-review without overwriting original evidence.
- Send approval/rejection/information emails and in-app notifications after durable changes. Record failures in existing Message Center history and support retry without repeating financial actions. Brevo acceptance is not claimed as inbox delivery.
- Keep proof storage private. Only financial administrators receive fresh short-lived viewing URLs through the protected deposit viewer; existing non-wallet proof behavior is preserved.

**Gate:** verify GET safety, expired/replayed tokens, admin authorization and exactly-once credit before dashboard work.

## Phase 4 — Existing screens and settings
- Add Wallet to existing customer navigation: balance, deposited/spent/refunded totals, pending deposits, Add Money form, filters, details and references.
- Add Wallet Balance payment option to current checkout with live balance, insufficiency handling and Add Money link.
- Add admin Wallet Management with customer search, wallet/deposit totals, histories, authenticated proofs, decisions, adjustments, refunds and transaction export.
- Extend existing settings with wallet/checkout enablement, deposit limits, methods, manual deposits, refund permissions, notification switches/recipient, token expiry and test email/history.
- Follow existing dark design tokens, components, toast patterns and compact phone layouts; preserve desktop and all existing routes.

## Phase 5 — Verification and report
Run focused automated tests for each financial rule, database permission/invariant checks, concurrent approval/spending/refund tests, token expiry/replay/GET safety, proof privacy and real authenticated flows. Check phone widths 320/375/390/414/430 and desktop.

Verify registration/email login/Google login, existing payment checkout, orders, delivery and admin access without changing their configuration. Human Google consent, receipt in Gmail and actual payment verification remain explicitly unverified until exercised with the user.

Provide a detailed report listing created/modified/reused records and functions, RLS/security safeguards, dashboard/settings/email changes, tests performed/passed/failed/not run, and remaining configuration. Never call the complete system production-ready while a phase or required real flow remains unverified.

## Technical implementation constraints
- Use existing TanStack authenticated server functions with bearer middleware and database RPC transactions; no browser service keys or generic unauthenticated financial endpoints.
- Inspect the live role functions when authorizing: existing `has_role` and `is_staff` only succeed for `auth.uid()`, so service-role calls cannot substitute for user-scoped authorization.
- Store financial arithmetic as `numeric`, rejecting non-finite values and precision truncation; keep shared UI amounts representational only.
- Existing checkout writes are sequential; wallet payment must have its own atomic database branch before any order/debit is committed, not add a balance subtraction to that sequential path.
- Existing public settings policy excludes only `admin_notify`; extend its exclusion for private wallet-email settings in the same migration.
- Keep private proof paths and signed URLs out of public settings and stored email/audit bodies; renew viewing links on the authenticated page.
- No live financial test data or approvals without actual payment or explicit authorization; rollback-only isolated invariant tests are reported separately from real-money end-to-end verification.