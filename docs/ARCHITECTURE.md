# Guruji Collections — Architecture

## Application layers

```text
Browser
  |
  v
Next.js App Router
  |
  +--> Storefront UI
  +--> Admin UI
  +--> Server Actions / Route Handlers
             |
             +--> Domain services
             |      +--> Catalog
             |      +--> Cart
             |      +--> Orders
             |      +--> Customers
             |      +--> Inventory
             |      +--> AI Catalog
             |      +--> Payments
             |      +--> Shipping
             |
             +--> Supabase
             |      +--> PostgreSQL
             |      +--> Auth
             |      +--> Storage
             |
             +--> External adapters
                    +--> AI provider
                    +--> Payment gateway
                    +--> Shiprocket
```

## Suggested project structure

```text
app/
  (store)/
  admin/
  api/
components/
lib/
  db/
  auth/
  catalog/
  cart/
  orders/
  payments/
  shipping/
  ai/
  validation/
supabase/
  migrations/
public/
docs/
```

## Data model direction

Core entities:

- profiles
- addresses
- categories
- products
- product_images
- product_variants
- inventory
- carts
- cart_items
- orders
- order_items
- payments
- shipments
- coupons
- reviews
- ai_generation_jobs

A product is the customer-facing catalog entity. Variants hold sellable combinations such as size and color and own inventory quantities and SKU information.

## Security direction

- Supabase Row Level Security is mandatory for customer-owned data.
- Admin operations require an explicit admin role.
- Payment and Shiprocket credentials stay server-side.
- Webhook signatures are verified before state changes.
- Prices are calculated server-side from authoritative product/variant data.
- Client-supplied totals are never trusted.

## External integrations

Payment and shipping should be implemented behind interfaces. This lets us start with one provider and swap providers later without rewriting order logic.

Example interfaces:

```ts
interface PaymentProvider {
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;
  refundPayment(input: RefundPaymentInput): Promise<RefundPaymentResult>;
}

interface ShippingProvider {
  createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult>;
  trackShipment(input: TrackShipmentInput): Promise<TrackShipmentResult>;
  cancelShipment(input: CancelShipmentInput): Promise<CancelShipmentResult>;
}
```

## AI product workflow

```text
Upload image
   -> store original image
   -> AI vision/catalog enrichment
   -> structured draft
   -> owner review/edit
   -> product validation
   -> publish
```

AI suggestions are drafts. The owner remains the final authority before publishing price, stock, claims, or customer-facing content.
