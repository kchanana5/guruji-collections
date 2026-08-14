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
  const create = await fetch(`${API}/orders/create/adhoc`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${bearer}` },
    body: JSON.stringify({
      order_id: input.orderId,
      order_date: input.orderDate,
      pickup_location: pickupLocation,
      billing_customer_name: input.customerName,
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
  if (!create.ok) throw new Error(`Shiprocket order creation failed: ${create.status} ${await create.text()}`);
  const created = await create.json();
  const shipmentId = Number(created.shipment_id || created.shipment?.shipment_id);
  const shiprocketOrderId = String(created.order_id || created.order?.order_id || "");
  if (!shipmentId) throw new Error("Shiprocket did not return a shipment id");

  const awb = await fetch(`${API}/courier/assign/awb`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${bearer}` },
    body: JSON.stringify({ shipment_id: shipmentId }),
  });
  if (!awb.ok) throw new Error(`Shiprocket AWB assignment failed: ${awb.status} ${await awb.text()}`);
  const awbData = await awb.json();
  const shipment = awbData.response?.data?.shipment || awbData.response?.shipment || awbData.shipment || {};
  return {
    shiprocketOrderId,
    shipmentId,
    awbCode: shipment.awb_code || awbData.response?.data?.awb_code || null,
    courierName: shipment.courier_name || awbData.response?.data?.courier_name || null,
    raw: { create: created, awb: awbData },
  };
}
