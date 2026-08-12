# Guruji Collections — Product Vision

## Brand

**Name:** Guruji Collections  
**Short brand:** GJC

GJC is a modern fashion commerce brand. The initial store experience should feel premium, simple, fast, trustworthy, and mobile-first.

## Owner experience

The owner should be able to:

1. Sign in to an admin dashboard.
2. Upload one or more product images.
3. Enter or confirm price, stock, and optional notes.
4. Run AI enrichment.
5. Review/edit the generated title, description, category, attributes, tags, and SEO fields.
6. Publish the product.
7. Manage inventory and variants.
8. Process orders and initiate shipping.
9. View payment, order, and sales status.

## Customer experience

Customers should be able to:

- Browse products by category.
- Search and filter by size, color, price, and availability.
- View product images, variants, pricing, descriptions, and stock.
- Add products to cart or wishlist.
- Sign in and manage addresses.
- Checkout securely.
- Pay online and receive an order confirmation.
- View order history and status.
- Track eligible shipments.
- Leave product reviews after purchase.

## MVP priorities

### P0

- Storefront shell
- Products and product variants
- Admin authentication
- Admin product CRUD
- Supabase data model
- Cart
- Checkout foundation
- Order creation
- Responsive design

### P1

- Payment gateway
- Shiprocket integration
- Inventory tracking
- Customer accounts
- Coupons
- Wishlist
- Reviews

### P2

- AI catalog enrichment
- AI-assisted SEO
- Advanced analytics
- Abandoned cart flows
- Product recommendations
- Marketing automation

## Architecture rules

- Keep business logic separate from UI components.
- Validate server-side for all sensitive operations.
- Never expose service secrets to the browser.
- Use role-based access for admin functionality.
- Use idempotency for payment and fulfillment callbacks.
- Model products and variants separately so size/color inventory is accurate.
- Keep payment and shipping providers behind service interfaces.
