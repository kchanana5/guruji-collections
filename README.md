# Guruji Collections (GJC)

Modern, AI-assisted e-commerce platform for Guruji Collections, focused initially on fashion and clothing.

## Vision

GJC is designed so the owner can upload a product image, provide basic commercial information such as price, and let the platform assist with the remaining catalog work: title, description, category, attributes, tags, SEO content, and publishing.

The platform will also support customer accounts, product discovery, cart, checkout, payments, order management, inventory, shipping integrations, and an admin dashboard.

## Initial stack

- Next.js + TypeScript
- Tailwind CSS
- Supabase for PostgreSQL, authentication, and storage
- AI provider abstraction for catalog enrichment
- Payment gateway adapter (India-first)
- Shiprocket adapter for shipping and fulfillment
- GitHub for source control
- Deployment designed around free/low-cost tiers during MVP development

## Core areas

- Storefront
- Product catalog
- Cart and checkout
- Customer accounts
- Orders and order tracking
- Admin dashboard
- AI product assistant
- Inventory
- Payments
- Shipping
- Coupons and promotions
- Reviews
- SEO and analytics

## Development principle

Keep external services behind adapters so the application is not tightly coupled to one payment provider, AI provider, or shipping provider.

## Status

Project initialized. Phase 1 foundation is being established.
