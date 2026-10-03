# New database setup for DIGITALHUBGH

Target: new project `kkuwtplnrvlxybgwmafm` (currently empty: 0 tables, 0 storage areas, 0 users). Nothing is deleted or reset. No sample data.

## Already done (no database changes)
- Website settings now point to the new project; no references to the deleted project remain.
- Old private keys removed from project files; new admin key and access token saved securely (server-only).

## 1. Tables (38, matching what the website already uses)
Built in this order:
1. The 8 saved setup files in `supabase/migrations` (core shop: profiles, user_roles, categories, products, orders, order_items, payments, refunds, downloads, referrals, support tickets/messages, notifications, faqs, site_content, store_settings, coupons, announcements, reviews, activity logs, etc. — 26 tables, plus `has_role`, `is_staff`, new-user profile trigger, and their security rules).
2. The 2 fix files in `db/` (customer status/notes, admin-only settings, staff alert on customer support replies).
3. Changes made in earlier sessions that were never saved as files, rebuilt from the website's table map:
   - Customer fields: `admin_note`, `account_status`, `referred_by`; staff can manage customer profiles.
   - Message Center: `message_logs`, `message_templates`, `message_history`, `automation_rules`, `notification_events`.
   - Digital inventory: `digital_inventory` (profit auto-calculated), `digital_deliveries` (with `updated_at`, one reservation per order+item), `inventory_suppliers`, `inventory_purchases`, `inventory_warranties`, `inventory_access_links`.
   - Announcements upgrade: types, priorities, scheduling, targeting, placements, call-to-action buttons, counters, `announcement_dismissals`.
   - Functions: `reserve_digital_inventory`, `release_digital_inventory`, `get_my_digital_deliveries`, `track_announcement_event`, `update_expired_inventory_warranties`.
   - Live updates switched on for orders and payments.

## 2. Security model (kept as before)
- Every table has row security on. Customers see only their own orders, payments, downloads, tickets, notifications, deliveries.
- Staff-only: inventory, suppliers, message logs/templates, automation, admin settings, activity logs.
- Public read only for: active products, categories, FAQs, site content, published announcements, non-private store settings.
- Roles stay in a separate `user_roles` list; new signups get the `customer` role only.

## 3. Storage (all private)
| Area | Used for | Access |
|---|---|---|
| `payment-proofs` | payment screenshots | owner uploads to own folder; owner + staff view |
| `product-images` | product photos | staff upload; everyone views via short-lived links (as the site already does) |
| `product-files` | downloadable files | staff upload; buyers get 5-minute download links only after payment |

## 4. Sign-in
- Email/password on; Site URL `https://digitalhubgh.vercel.app` plus preview URLs as allowed redirects; reset-password page allowed.
- Google: needs your Google Client ID/Secret entered in the new project's Authentication → Providers → Google (only you can do this; I'll give exact steps).

## 5. Admin account
- After `akangbekamal06@gmail.com` signs up on the new site, that one account gets `super_admin`. No other user gets staff rights.

## 6. Settings you set elsewhere (Vercel)
- Public: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`.
- Private: `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_API_KEY`, `BREVO_FROM_EMAIL`; optional `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `SITE_URL`.

## 7. Then test
Signup/login, profile, products, checkout + proof upload, orders and live status, admin dashboard and role protection, products/orders/inventory/delivery, customers, support, announcements, Message Center, notifications, settings, storage. Configuration issues get fixed without changing the design.

## Risk notes
- Previous customer data, orders and products are not recoverable (the old project was deleted); the site starts empty and you re-add products.
- Rebuilt pieces (section 1.3) follow the website's exact table map; any small mismatch found in testing gets corrected in place.

## Technical details
Applied via Management API SQL in one transaction per step; types regenerated afterwards; result recorded as new migration files so GitHub holds the full schema.
