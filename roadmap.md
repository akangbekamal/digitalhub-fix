# Responsive audit roadmap

- [x] Patch shared admin/customer layout overflow risks without changing desktop layouts.
- [x] Patch route-specific mobile controls, cards, forms, tabs, and dialogs.
- [x] Verify public and authenticated-route shells at 320, 375, 390, 430, tablet, and desktop widths.
- [x] Confirm build remains clean and no business logic changed.

## Compact customer phone dashboard
- [x] Compact customer-only header, navigation, statistics, actions and recent orders; preserve desktop/admin.
- [x] Verify 320, 375, 390, 414 and 430px plus desktop with isolated browser layout fixtures: no overflow, menu works, Orders quick action opens the order list, no page errors. Live customer-session testing unavailable; no authentication or backend changes made.

## Professional mobile admin
- [ ] Compact sticky admin header and grouped drawer linking every existing section.
- [ ] Compact overview metrics, actions and operational lists; phone-safe tables and forms.
- [ ] Verify five phone widths, navigation, representative controls, desktop and unchanged access gates.
