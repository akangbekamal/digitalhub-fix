# Digital Hub Commerce

BUILD MY COMPLETE DIGITAL STORE — FULL PRODUCTION WEBSITE

IMPORTANT: BUILD THIS AS A COMPLETE, PRODUCTION-READY DIGITAL E-COMMERCE WEBSITE.

Do NOT create a simple demo.
Do NOT create a static frontend.
Do NOT use fake/mock data for core functionality.
Do NOT leave unfinished pages, placeholder buttons, TODOs, or “coming soon” sections.

I want a complete digital products store that I can start using with real customers.

Use a modern, premium, mobile-first design and make the entire application responsive on iPhone, Android, tablet, and desktop.

The project must use:

Lovable for development

Supabase Free for backend

Supabase Authentication

Supabase PostgreSQL database

Supabase Storage

Supabase Row Level Security

Supabase Realtime where appropriate

Vercel-compatible deployment

Secure server-side/edge functions where required

The website should be designed as a professional Ghana-focused digital store.

Brand name:

DIGITAL HUB GH

Use the existing brand name throughout the website.



1. OVERALL WEBSITE

Build a complete digital commerce platform with two major sides:

CUSTOMER WEBSITE
ADMIN DASHBOARD

The customer website must allow customers to:

Browse products

Search products

Filter products

View categories

View product details

Add products to cart

Update cart

Apply coupons

Checkout

Make Mobile Money payment

Upload payment proof where required

Track orders

Download purchased digital products

Manage profile

View invoices

Receive notifications

Contact support

Submit support tickets

Refer friends

Leave product reviews

Receive announcements

The admin dashboard must allow the administrator to manage EVERYTHING on the website.



2. DESIGN

Create a professional digital-store design.

Requirements:

Mobile-first

Fast

Clean

Modern

Premium

Easy navigation

Professional product cards

Responsive tables

Responsive admin dashboard

Good spacing

Clear typography

Accessible buttons

Loading states

Empty states

Error states

Success states

Confirmation dialogs

Toast notifications

Use a consistent design system throughout the entire application.

Do not make the UI unnecessarily complicated.



3. HEADER

Create a responsive header.

Desktop:

Logo

Home

Shop

Categories

About

FAQ

Contact

Search

Cart

Account

Mobile:

Logo

Search

Cart

Menu

Account menu for logged-out users:

Login

Create Account

Account menu for logged-in customers:

Dashboard

My Orders

Downloads

Notifications

Support

Referrals

Profile

Logout

Admin users should additionally see:

Admin Dashboard

Never expose admin functionality to ordinary customers.



4. HOME PAGE

Create a complete homepage.

Include:

Hero section

Main headline

Short store description

Shop Now button

Featured products

Popular products

Categories

Special offers

Announcements

Why choose us

How it works

Customer testimonials

FAQ preview

Contact section

Newsletter/notification signup if appropriate

Footer

The homepage content should be manageable by admin where appropriate.



5. SHOP PAGE

Create a complete product shop.

Features:

Product grid

Product cards

Product images

Product name

Description

Price

Discount price

Stock status

Category

Rating

Add to cart

Buy now

Filters:

Category

Price

Availability

Rating

Popularity

Sorting:

Newest

Price low to high

Price high to low

Most popular

Highest rated

Add search.



6. PRODUCT DETAILS PAGE

Each product needs a professional product page.

Include:

Product image/gallery

Product name

Price

Discount

Description

Features

Category

Availability

Quantity

Add to cart

Buy now

Related products

Reviews

Average rating

Rating breakdown

For digital products include:

Delivery/download information

Estimated delivery time

Product type

Do not expose protected digital files publicly.



7. PRODUCT CATEGORIES

Create categories.

Examples:

Data Bundles

Gift Cards

Streaming

Accounts

Digital Services

Software

Games

Other Digital Products

Admin must be able to create, edit, disable, reorder, and delete categories.

Do not hardcode categories if they need to be managed by admin.



8. SEARCH

Create global product search.

Search by:

Product name

Description

Category

Tags

Show useful search results.

Include empty search results state.



9. SHOPPING CART

Create a complete shopping cart.

Features:

Add product

Remove product

Increase quantity

Decrease quantity

Clear cart

Cart subtotal

Coupon discount

Final total

Persist the cart appropriately.

Before checkout, revalidate:

Product exists

Product is active

Product price

Product availability

Quantity

Inventory

Never trust frontend prices.



10. CUSTOMER AUTHENTICATION

Use Supabase Auth.

Implement:

Sign up

Login

Logout

Forgot password

Reset password

Email verification

Session persistence

Protected routes

Signup fields:

Full name

Email

Phone number

Password

Confirm password

Create a profile record automatically after signup.



11. CUSTOMER DASHBOARD

Create a complete customer dashboard.

Dashboard overview:

Total orders

Pending orders

Completed orders

Total spending

Available downloads

Referral count

Unread notifications

Dashboard navigation:

Overview

Profile

Orders

Order Tracking

Downloads

Invoices

Notifications

Support

Referrals

Reviews

Settings

Logout



12. CUSTOMER PROFILE

Customers can edit:

Full name

Phone

Profile photo

Other allowed profile information

Allow:

Change password

Logout from current session

Do NOT allow customers to modify:

User ID

Role

Admin status

Protected database fields



13. ORDERS

Customer order history.

Show:

Order number

Date

Products

Quantity

Amount

Payment status

Order status

Allow:

View order

Track order

View invoice

Download purchased products when available

Add:

Search

Filters

Status filters



14. ORDER TRACKING

Create a visual order timeline.

Statuses:

Order placed

Payment pending

Payment confirmed

Processing

Ready

Completed

Cancelled

Refunded

Show date/time for status updates.



15. INVOICES

Customers can view and download invoices.

Invoice must include:

Store name

Customer information

Invoice/order number

Date

Products

Quantity

Price

Discount

Total

Payment status

Never allow a customer to access another customer’s invoice.



16. DIGITAL DOWNLOAD CENTER

Create a secure download center.

Customers can see products they purchased.

Show:

Product

Order

Download status

Download availability

Expiry

Download button

Use secure expiring download URLs.

Never expose permanent public download URLs for protected products.

Verify ownership before generating downloads.

Admin must be able to configure:

Download expiry

Maximum downloads

Downloadable file

Product access



17. CHECKOUT

Build a complete secure checkout.

Steps:

Cart

Customer information

Coupon

Payment method

Payment summary

Order confirmation

Payment status

Checkout must validate everything server-side.

Calculate:

Subtotal

Discount

Fees if applicable

Final total

Never trust frontend totals.

Prevent:

Negative prices

Fake discounts

Invalid products

Invalid quantities

Expired coupons

Duplicate orders



18. MOBILE MONEY PAYMENT

Use a Ghana-focused Mobile Money payment workflow.

Support the existing/manual Mobile Money business model.

Show:

Payment method

Amount to pay

Merchant number/instructions

Customer payment instructions

Transaction/reference field

Payment proof upload if required

Payment statuses:

Pending

Submitted

Verified

Failed

Refunded

Allow customer to upload payment proof securely.

Admin must be able to review the proof.

DO NOT claim automatic payment confirmation unless a real payment API is connected.

Design the payment system so a payment provider can be integrated later.



19. CHECKOUT RESULT PAGES

Create:

Order success page

Payment pending page

Payment failed page

Payment verification page

Show:

Order number

Amount

Status

Next steps



20. COUPONS

Complete coupon system.

Admin can:

Create coupon

Edit coupon

Delete coupon

Enable/disable

Percentage discount

Fixed discount

Expiration

Minimum order

Maximum usage

Usage count

Per-user usage limits

Customer can apply coupon during checkout.

Validate coupons securely.



21. PRODUCT REVIEWS

Customers can review purchased products.

Review includes:

1–5 star rating

Review title

Review text

Allow:

Create review

Edit review

Delete review

Only eligible customers can review products.

Prevent duplicate reviews unless editing the existing review.

Show approved reviews on product pages.



22. REVIEW MODERATION

Customers can report reviews.

Reasons:

Spam

Abuse

Offensive

Fraud

Other

Admin review moderation page:

View reviews

Search

Filter

Approve

Reject

Remove

View reports

Resolve reports

Ban abusive reviewers

Keep moderation history/audit records.



23. CUSTOMER NOTIFICATIONS

Create notification center.

Notify customers about:

Account creation

Order placed

Payment submitted

Payment confirmed

Order processing

Order completed

Download ready

Support reply

Refund update

Referral reward

Important announcements

Customers can:

View

Mark read

Mark all read

Delete where appropriate

Use Supabase Realtime where appropriate.



24. ANNOUNCEMENT SYSTEM

IMPORTANT:

Admin must have COMPLETE control over website announcements.

Create an admin announcement management page.

Admin can:

Create announcement

Edit announcement

Delete announcement

Publish/unpublish

Schedule announcement

Set priority

Set start date

Set end date

Choose audience

Add title

Add message

Add optional link/button

Announcements can appear:

Homepage

Customer dashboard

Notification center

Announcement banner

Customers should receive notifications when appropriate.



25. SUPPORT SYSTEM

Create complete customer support.

Customer can:

Create ticket

Subject

Category

Priority

Message

Attach files where appropriate

View ticket

Reply

Close ticket

Ticket statuses:

Open

In progress

Waiting for customer

Resolved

Closed

Admin can:

View all tickets

Search

Filter

Assign ticket

Change priority

Reply

Change status

Add internal notes

Close ticket

Customer receives notification when admin replies.



26. ADMIN DASHBOARD

Create a professional admin dashboard.

Admin homepage shows real data:

Revenue

Orders

Customers

Products

Pending payments

Completed orders

Refunds

Support tickets

Downloads

Reviews

Low inventory

Recent activity

Use real Supabase data.

No fake statistics.



27. ADMIN SIDEBAR

Create admin navigation:

Dashboard

Products

Categories

Inventory

Orders

Payments

Refunds

Customers

Coupons

Reviews

Support

Announcements

Notifications

Downloads

Referrals

Analytics

Content

Homepage

Settings

Admin Users

Activity Logs



28. ADMIN PRODUCT MANAGEMENT

Admin can:

Create products

Edit products

Delete products

Enable/disable products

Upload images

Upload digital files

Set price

Set discount

Set category

Set stock

Set SKU

Add description

Add features

Add tags

Set download limits

Set download expiry

Configure product visibility



29. INVENTORY MANAGEMENT

Show:

Stock

Sold

Available

Low stock

Out of stock

Admin can manually adjust stock.

Create inventory history.

Record:

Previous quantity

New quantity

Adjustment

Reason

Admin

Date



30. ORDER MANAGEMENT

Admin can:

View orders

Search

Filter

Sort

View order details

View customer

View products

View payment

View payment proof

Update order status

Update payment status

Cancel order

Refund order

Add internal notes



31. PAYMENT MANAGEMENT

Admin payment page.

Show:

Payment ID

Order

Customer

Amount

Method

Status

Proof

Date

Actions:

Approve

Reject

Mark pending

View proof

Every important payment action should be recorded.



32. REFUNDS

Admin can:

View refund requests

Search

Filter

Approve

Reject

Add notes

Change refund status

Statuses:

Requested

Approved

Processing

Completed

Rejected

Do not falsely claim that funds were automatically returned if the refund is handled manually.



33. CUSTOMER MANAGEMENT

Admin can:

View customers

Search

Filter

View profile

View orders

View spending

View support tickets

View activity

Admin actions:

Ban

Unban

Disable

Enable

Add admin note

Do not delete customers accidentally.



34. ADMIN USER MANAGEMENT

Create secure admin user management.

Admin can:

View admins

Add admin

Remove admin role

Change admin permissions if role system supports it

Disable admin access

Never allow a normal customer to make themselves admin.

Use secure role-based access control.



35. ROLE/PERMISSION SYSTEM

Create roles such as:

Customer

Admin

Super Admin

Support Admin

Product Admin

Order Admin

If implementing granular permissions, support permissions such as:

manage_products

manage_orders

manage_customers

manage_payments

manage_refunds

manage_coupons

manage_reviews

manage_support

manage_announcements

manage_content

view_analytics

manage_admins

Super Admin has full access.



36. ANALYTICS

Create complete analytics.

Show:

Revenue

Orders

Customers

Average order value

Conversion-related metrics where data permits

Best-selling products

Best categories

Daily revenue

Weekly revenue

Monthly revenue

Payment status

Order status

Refund totals

Use real database data.



37. REFERRAL SYSTEM

Every customer can have a referral code.

Create:

Referral code

Referral link

Referral count

Successful referrals

Rewards if configured

Referral history

Admin can:

View referrals

Configure referral reward

Enable/disable referrals

Review referral activity

Prevent obvious self-referrals and abuse.



38. CONTENT MANAGEMENT

Admin must be able to manage website content.

Create content management for:

Homepage

About page

FAQ

Contact page

Privacy Policy

Terms & Conditions

Refund Policy

Download Policy

Delivery information

Admin can:

Edit content

Publish/unpublish

Save changes

Avoid hardcoding content that should be editable.



39. FAQ MANAGEMENT

Admin can:

Add FAQ

Edit FAQ

Delete FAQ

Reorder FAQ

Publish/unpublish

Customer FAQ page should load from database.



40. HOMEPAGE MANAGEMENT

Admin can manage:

Hero title

Hero description

Hero image

CTA text

Featured products

Popular products

Announcement banners

Promotional sections

Testimonials

FAQ sections

Do not make the admin interface unnecessarily complicated.



41. STORE SETTINGS

Create admin store settings.

Admin can configure:

Store name

Logo

Favicon

Contact email

WhatsApp number

Phone number

Social links

Currency

Payment instructions

Mobile Money details

Store address

Business hours

Order settings

Download settings

Coupon settings

Referral settings

Notification settings

Never expose private API keys or secrets in public settings.



42. EMAIL NOTIFICATIONS

Create a notification architecture for email.

Support events:

Account created

Email verification

Password changed

Order placed

Payment submitted

Payment confirmed

Order completed

Download ready

Refund update

Support reply

Referral reward

Announcement

Use secure environment variables.

Do not expose private credentials in frontend code.

If EmailJS is used, structure it correctly and securely.



43. TELEGRAM ADMIN NOTIFICATIONS

Create server-side Telegram notifications.

Admin alerts for:

New customer

New order

Payment submitted

Payment confirmed

Order completed

Refund request

Refund decision

New support ticket

New review/report

Important admin events

Telegram bot token must NEVER be exposed in frontend code.

Use environment variables/secrets.



44. SUPABASE REALTIME

Use Supabase Realtime for appropriate live updates:

New orders

Payment status

Order status

Notifications

Support messages

Admin updates

Announcements where appropriate

Clean up subscriptions properly.

Prevent duplicate subscriptions and memory leaks.



45. DATABASE

Create a proper normalized Supabase database.

Include appropriate tables for:

profiles

user_roles

products

categories

product_images

product_files

inventory

inventory_logs

carts if needed

orders

order_items

payments

payment_proofs

coupons

coupon_usage

reviews

review_reports

notifications

support_tickets

support_messages

referrals

referral_rewards

refunds

downloads

announcements

announcement_reads

site_content

faqs

store_settings

admin_activity_logs

Use foreign keys, indexes, timestamps, and appropriate constraints.



46. SUPABASE STORAGE

Create secure storage buckets as needed for:

Product images

Digital product files

Payment proofs

Customer uploads

Support attachments

Private files must remain private.

Use signed URLs for protected downloads.



47. ROW LEVEL SECURITY

THIS IS CRITICAL.

Enable proper Supabase RLS.

Customers can only access their own:

Profile

Orders

Payments

Payment proofs

Downloads

Notifications

Support tickets

Referral data

Reviews

Refund requests

Customers cannot:

Change their role

Access admin records

Access another customer’s information

Change product prices

Approve payments

Approve reviews

Ban users

Modify announcements

Access private files belonging to others

Admin access must be securely enforced.

Never rely only on hiding buttons in the frontend.



48. SECURITY

Implement:

Authentication

Authorization

RLS

Protected routes

Input validation

Server-side validation

Secure file access

Secure download URLs

Price validation

Coupon validation

Order validation

Payment validation

Rate limiting where appropriate

Safe error handling

Never expose:

Supabase service role key

Telegram bot token

Private API keys

Server secrets

Admin credentials

in frontend code.



49. ACTIVITY LOGS

Create admin activity logging.

Record:

Admin

Action

Target

Description

Timestamp

Relevant metadata

Log important events:

Product changes

Order changes

Payment approval

Refund actions

Customer bans

Coupon changes

Review moderation

Announcement changes

Settings changes

Admin role changes



50. FOOTER

Create complete footer.

Include:

Logo

Store description

Shop

Categories

About

FAQ

Contact

Privacy Policy

Terms

Refund Policy

Download Policy

Customer Dashboard

Support

Social links

Copyright

Every link must work.



51. ERROR/LOADING STATES

Every page must have:

Loading state

Empty state

Error state

Success state

Buttons should show loading indicators during requests.

Prevent accidental duplicate submissions.



52. RESPONSIVENESS

Test every important page on mobile.

Especially:

Home

Shop

Product

Cart

Checkout

Customer dashboard

Admin dashboard

Tables

Support

Orders

Analytics

Settings

The website must be usable on small phone screens.



53. SEO

Implement basic SEO:

Page titles

Meta descriptions

Open Graph metadata

Proper headings

Clean URLs

Product metadata

Favicon

Robots configuration where appropriate



54. PERFORMANCE

Optimize:

Images

Database queries

Product loading

Lazy loading

Realtime subscriptions

Bundle size

Avoid unnecessary API calls.



55. FINAL END-TO-END TEST

Before considering the project complete, verify this entire flow:

CUSTOMER:

Sign up
↓
Verify email
↓
Login
↓
Browse products
↓
Search
↓
Open product
↓
Add to cart
↓
Apply coupon
↓
Checkout
↓
Submit Mobile Money payment
↓
Upload payment proof
↓
Order created
↓
Admin receives notification
↓
Admin reviews payment
↓
Payment approved
↓
Customer receives notification
↓
Order processed
↓
Digital product becomes available
↓
Customer receives download notification
↓
Customer downloads securely
↓
Customer views invoice
↓
Customer leaves review
↓
Customer contacts support
↓
Admin responds
↓
Customer receives notification

ADMIN:

Login
↓
Open admin dashboard
↓
View statistics
↓
Manage products
↓
Manage categories
↓
Manage inventory
↓
View orders
↓
Review payments
↓
Approve/reject payment
↓
Manage refunds
↓
Manage customers
↓
Ban/unban customer
↓
Manage coupons
↓
Moderate reviews
↓
Manage support
↓
Create announcements
↓
Manage homepage
↓
Edit FAQ
↓
Edit policies
↓
View analytics
↓
View activity logs
↓
Manage store settings

EVERYTHING MUST BE CONNECTED TO THE REAL SUPABASE DATABASE.



56. FINAL QUALITY REQUIREMENT

DO NOT stop after creating the UI.

Build the actual backend functionality.

Connect every button.

Connect every form.

Connect every dashboard statistic.

Connect every table.

Connect every status update.

Connect notifications.

Connect authentication.

Connect Supabase.

Connect storage.

Connect RLS.

Connect admin permissions.

Connect customer permissions.

Connect checkout.

Connect orders.

Connect payments.

Connect downloads.

Connect support.

Connect announcements.

Connect reviews.

Connect analytics.

Make the application production-ready.

If something requires an external secret or configuration that Lovable cannot automatically know, create the correct environment-variable/configuration structure and clearly identify the exact value I need to add. Do not fake the integration.

Do not use mock data for functionality that should use Supabase.

Do not leave TODOs.

Do not leave placeholder pages.

Do not leave broken links.

Do not create duplicate features.

Keep the code clean, organized, maintainable, and secure.

MOST IMPORTANT:

I WANT TO START USING THIS WEBSITE TODAY.

BUILD THE COMPLETE DIGITAL STORE IN THIS PROJECT FROM THE START.

DO NOT GIVE ME A PARTIAL DEMO.

DO NOT TELL ME TO BUILD THE REST MYSELF.

FINISH THE CUSTOMER WEBSITE, ADMIN DASHBOARD, DATABASE, AUTHENTICATION, SECURITY, PAYMENTS, ORDERS, DOWNLOADS, SUPPORT, ANNOUNCEMENTS, REVIEWS, ANALYTICS, NOTIFICATIONS, CONTENT MANAGEMENT, AND SETTINGS.

THE FINAL RESULT MUST BE A FULLY FUNCTIONAL DIGITAL E-COMMERCE PLATFORM READY TO DEPLOY TO VERCEL AND CONNECT TO SUPABASE.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/797f6827-c674-4afe-86e4-1f3ccb2d3990).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
