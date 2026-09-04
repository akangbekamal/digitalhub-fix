# Responsive layout fixes

## Scope
Preserve the existing desktop design and business logic. Apply only breakpoint-scoped layout changes that prevent mobile overflow and improve touch usability.

## Implementation
- Harden Admin and Customer dashboard shells: add safe horizontal nav scrolling, viewport-aware notification dropdown sizing, and shrinkable content containers.
- Fix dense admin interfaces: scrollable Message Center tabs, stacked customer/order controls, smaller phone modal padding, responsive filter/date controls, and safer inventory access-link rows.
- Fix customer flows: responsive cart rows, full-width mobile product actions, wrapping checkout/payment details, and mobile-friendly order/card action groups.
- Keep genuinely wide data tables inside their existing horizontal scroll containers rather than shrinking their content.

## Verification
- Measure document width and inspect screenshots at 320, 375, 390, 430, 768, and 1280px.
- Check mobile navigation and representative Admin, Customer Dashboard, shop, product, cart, checkout, orders, support, and auth routes.
- Confirm desktop classes and visual structure remain unchanged at existing desktop breakpoints; check build diagnostics after edits.
