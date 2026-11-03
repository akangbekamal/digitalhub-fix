# Responsive audit roadmap

- [x] Patch shared admin/customer layout overflow risks without changing desktop layouts.
- [x] Patch route-specific mobile controls, cards, forms, tabs, and dialogs.
- [x] Verify public and authenticated-route shells at 320, 375, 390, 430, tablet, and desktop widths.
- [x] Confirm build remains clean and no business logic changed.

## Compact customer phone dashboard
- [x] Compact customer-only header, navigation, statistics, actions and recent orders; preserve desktop/admin.
- [x] Verify 320, 375, 390, 414 and 430px plus desktop with isolated browser layout fixtures: no overflow, menu works, Orders quick action opens the order list, no page errors. Live customer-session testing unavailable; no authentication or backend changes made.

## Professional mobile admin
- [x] Compact sticky admin header and grouped drawer linking every existing section; reuse existing tabs/settings rather than add capabilities.
- [x] Compact overview metrics, actions and operational lists; phone-safe tables and forms.
- [x] Verify loaded screens at 320/375/390/414/430 with isolated fixtures, grouped drawer/categories navigation, delivery dialog, inventory details, support reply field, Message Center history, desktop and customer UI gate; build clean.
- [ ] Live signed-in admin transactions remain unverified: external backend session unavailable. No production data or security changes made.

## Integrated wallet and deposit approval
- [x] Phase 1 inspection: restored secure management access; inspected all 38 public tables, functions, policies, constraints, indexes, roles and buckets read-only. No equivalent wallet tables exist; payment-proofs is private.
- [ ] Phase 1 implementation: additive schema/functions and verification of authorization, atomicity and constraints. Awaiting approval of the financial implementation plan before database changes.
- [ ] Phase 2: verified wallet creation, deposits, ledger, atomic checkout, adjustments and refunds. Depends on Phase 1.
- [ ] Phase 3: existing Brevo emails, hashed expiring decision tokens, authenticated GET-safe confirmation, private admin proof viewer, decision history and notifications; verify exactly-once credit. Depends on Phase 2.
- [ ] Phase 4: integrate customer Wallet, existing checkout, admin wallet management and settings without redesign. Depends on Phase 3.
- [ ] Phase 5: real authorized flow, concurrency/security/regression tests and detailed implementation report. No fabricated approvals or transactions.
