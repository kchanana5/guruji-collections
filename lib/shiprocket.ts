const API = "https://apiv2.shiprocket.in/v1/external";

async function token() {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  if (!email || !password) throw new Error("Shiprocket is not configured");
  const res = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }), cache: "no-store" });
  if (!res.ok) throw new Error(`Shiprocket auth failed: ${res.status}`);
  const data = await res.json();
  if (!data.token) throw new Error("Shiprocket did not return a token");
  return data.token as string;
}

async function getPickupLocation(bearer: string) {
  const configured = process.env.SHIPROCKET_PICKUP_LOCATION?.trim();
  if (configured) return configured;
  const res = await fetch(`${API}/settings/company/pickup`, { headers: { Authorization: `Bearer ${bearer}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`Shiprocket pickup locations failed: ${res.status}`);
  const data = await res.json();
  const locations = data?.data?.shipping_address || data?.shipping_address || [];
  const active = locations.filter((x: any) => x.status === 1 || x.status === true);
  const preferred = active.find((x: any) => x.is_default === 1 || x.is_default === true || x.default_location === 1);
  const name = preferred?.pickup_location || preferred?.pickup_code || active[0]?.pickup_location || active[0]?.pickup_code;
  if (!name) throw new Error("No active Shiprocket pickup location found. Add a pickup location in Shiprocket or set SHIPROCKET_PICKUP_LOCATION.");
  return String(name);
}

function splitCustomerName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "Customer", lastName: "Customer" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") || "Customer" };
}

async function assignAwb(bearer: string, shipmentId: number) {
  const awb = await fetch(`${API}/courier/assign/awb`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${bearer}` },
    body: JSON.stringify({ shipment_id: shipmentId }),
  });
  const raw = await awb.text();
  let data: any = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { raw }; }
  const shipment = data.response?.data?.shipment || data.response?.shipment || data.shipment || {};
  const awbCode = shipment.awb_code || data.response?.data?.awb_code || null;
  const courierName = shipment.courier_name || data.response?.data?.courier_name || null;
  return { ok: awb.ok, awbCode: awbCode ? String(awbCode) : null, courierName: courierName ? String(courierName) : null, raw: data };
}

export async function assignExistingShiprocketAwb(shipmentId: number) {
  const bearer = await token();
  return assignAwb(bearer, shipmentId);
}

export async function createShiprocketShipment(input: {
  orderId: string;
  orderDate: string;
  pickupLocation?: string;
  customerName: string;
  phone: string;
  email?: string;
  address: string;
  address2?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  items: { sku: string; name: string; units: number; sellingPrice: number }[];
  subtotal: number;
  totalDiscount?: number;
  paymentMethod?: "Prepaid" | "COD";
  weightKg: number;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
}) {
  const bearer = await token();
  const pickupLocation = input.pickupLocation || await getPickupLocation(bearer);
  const { firstName, lastName } = splitCustomerName(input.customerName);

  const create = await fetch(`${API}/orders/create/adhoc`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${bearer}` },
    body: JSON.stringify({
      order_id: input.orderId,
      order_date: input.orderDate,
      pickup_location: pickupLocation,
      billing_customer_name: input.customerName,
      billing_first_name: firstName,
      billing_last_name: lastName,
      billing_phone: input.phone,
      billing_email: input.email || "",
      billing_address: input.address,
      billing_address_2: input.address2 || "",
      billing_city: input.city,
      billing_state: input.state,
      billing_country: input.country,
      billing_pincode: input.pincode,
      shipping_is_billing: true,
      shipping_customer_name: input.customerName,
      shipping_first_name: firstName,
      shipping_last_name: lastName,
      shipping_phone: input.phone,
      shipping_address: input.address,
      shipping_address_2: input.address2 || "",
      shipping_city: input.city,
      shipping_state: input.state,
      shipping_country: input.country,
      shipping_pincode: input.pincode,
      order_items: input.items.map((i) => ({ sku: i.sku, name: i.name, units: i.units, selling_price: i.sellingPrice })),
      payment_method: input.paymentMethod || "Prepaid",
      total_discount: Number(input.totalDiscount || 0),
      sub_total: input.subtotal,
      length: input.lengthCm,
      breadth: input.breadthCm,
      height: input.heightCm,
      weight: input.weightKg,
    }),
  });

  if (!create.ok) {
    const raw = await create.text();
    let message = `Shiprocket order creation failed: ${create.status}`;
    try {
      const details = JSON.parse(raw);
      const validation = details?.errors;
      if (validation && typeof validation === "object") {
        const fields = Object.entries(validation).map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(", ") : String(value)}`);
        if (fields.length) message += ` — ${fields.join("; ")}`;
      } else if (details?.message) message += ` — ${details.message}`;
    } catch { if (raw) message += ` — ${raw.slice(0, 300)}`; }
    throw new Error(message);
  }

  const created = await create.json();
  const shipmentId = Number(created.shipment_id || created.shipment?.shipment_id);
  const shiprocketOrderId = String(created.order_id || created.order?.order_id || "");
  if (!shipmentId) throw new Error("Shiprocket did not return a shipment id");

  const awbResult = await assignAwb(bearer, shipmentId);
  return {
    shiprocketOrderId,
    shipmentId,
    awbCode: awbResult.awbCode,
    courierName: awbResult.courierName,
    raw: { create: created, awb: awbResult.raw },
  };
}
