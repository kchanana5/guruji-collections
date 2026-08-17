"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import GjcLogo from "@/components/gjc-logo";

declare global { interface Window { Razorpay: any } }

type Form = { email: string; recipientName: string; phone: string; line1: string; line2: string; city: string; state: string; postalCode: string };
type Errors = Partial<Record<keyof Form, string>>;
type SavedAddress = { id: string; label: string; recipient_name: string; phone: string; line1: string; line2: string | null; city: string; state: string; postal_code: string; country: string; is_default: boolean };

const emptyForm: Form = { email: "", recipientName: "", phone: "", line1: "", line2: "", city: "", state: "", postalCode: "" };
const DRAFT_KEY = "gjc-checkout-form";

export default function CheckoutPage() {
  const [items, setItems] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [form, setForm] = useState<Form>(emptyForm);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "cod">("razorpay");
  const [shippingCharge, setShippingCharge] = useState(69);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(499);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const cart = JSON.parse(localStorage.getItem("gjc-cart") || "[]");
        const coupon = JSON.parse(localStorage.getItem("gjc-coupon") || "null");
        const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
        if (!mounted) return;
        setItems(Array.isArray(cart) ? cart : []);
        if (coupon) { setCouponCode(coupon.code || ""); setCouponDiscount(Number(coupon.discount || 0)); }
        if (draft && typeof draft === "object") setForm({ ...emptyForm, ...draft });

        const shippingResponse = await fetch("/api/checkout/shipping", { cache: "no-store" });
        if (shippingResponse.ok) {
          const shipping = await shippingResponse.json();
          if (mounted) {
            setShippingCharge(Number(shipping.shippingCharge ?? 69));
            setFreeShippingThreshold(Number(shipping.freeShippingThreshold ?? 499));
          }
        }

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!mounted) return;
        setLoggedIn(!!user);
        if (user) {
          const { data: addresses } = await supabase.from("addresses").select("id,label,recipient_name,phone,line1,line2,city,state,postal_code,country,is_default").eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at", { ascending: false });
          if (!mounted) return;
          const list = (addresses || []) as SavedAddress[];
          setSavedAddresses(list);
          if (!draft) {
            setForm(current => ({ ...current, email: user.email || "" }));
            const a = list.find(x => x.is_default) || list[0];
            if (a) {
              setSelectedAddressId(a.id);
              setForm(current => ({ ...current, email: user.email || current.email, recipientName: a.recipient_name || "", phone: a.phone || "", line1: a.line1 || "", line2: a.line2 || "", city: a.city || "", state: a.state || "", postalCode: a.postal_code || "" }));
            }
          }
        }
      } catch {
        if (mounted) setItems([]);
      } finally {
        if (mounted) setHydrated(true);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(form)); } catch {}
  }, [form, hydrated]);

  const subtotal = useMemo(() => items.reduce((s, i) => s + Number(i.variant.price) * Number(i.quantity), 0), [items]);
  const discount = Math.min(couponDiscount, subtotal);
  const shipping = subtotal < freeShippingThreshold ? shippingCharge : 0;
  const total = Math.max(0, subtotal - discount + shipping);

  function validate(): Errors {
    const e: Errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Enter a valid email address";
    if (!/^[A-Za-z][A-Za-z .'-]{2,}$/.test(form.recipientName.trim())) e.recipientName = "Enter your full name";
    if (!/^\d{10}$/.test(form.phone.replace(/\D/g, ""))) e.phone = "Enter a valid 10 digit mobile number";
    if (form.line1.trim().length < 4) e.line1 = "Enter your address";
    if (form.city.trim().length < 2) e.city = "Enter your city";
    if (form.state.trim().length < 2) e.state = "Enter your state";
    if (!/^\d{6}$/.test(form.postalCode.trim())) e.postalCode = "Enter a valid 6 digit PIN code";
    return e;
  }

  function setField(key: keyof Form, value: string) {
    setForm(current => ({ ...current, [key]: value }));
    setErrors(current => current[key] ? { ...current, [key]: undefined } : current);
    setSelectedAddressId("");
  }

  function useSavedAddress(a: SavedAddress) {
    setSelectedAddressId(a.id);
    setForm(current => ({ ...current, recipientName: a.recipient_name || "", phone: a.phone || "", line1: a.line1 || "", line2: a.line2 || "", city: a.city || "", state: a.state || "", postalCode: a.postal_code || "" }));
    setErrors({});
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length) { setError("Please correct the highlighted fields before continuing."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod, items: items.map(i => ({ variantId: i.variantId, quantity: i.quantity })), couponCode, address: { ...form, phone: form.phone.replace(/\D/g, "") } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to start checkout");
      if (paymentMethod === "cod") {
        localStorage.removeItem(DRAFT_KEY);
        window.location.href = `/checkout/success?order=${encodeURIComponent(data.orderId)}&method=cod`;
        return;
      }
      if (!window.Razorpay) throw new Error("Payment gateway is still loading. Please try again.");
      const razor = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Guruji Collections",
        description: `GJC order ${data.orderNumber}`,
        order_id: data.razorpayOrderId,
        prefill: { name: form.recipientName, email: form.email, contact: form.phone },
        theme: { color: "#171717" },
        handler: (r: any) => { window.location.href = `/checkout/verify-shipping?order=${encodeURIComponent(data.orderId)}&payment=${encodeURIComponent(r.razorpay_payment_id)}&signature=${encodeURIComponent(r.razorpay_signature)}`; },
        modal: { ondismiss: () => setBusy(false) },
      });
      razor.on("payment.failed", (r: any) => { setError(r?.error?.description || "Payment failed"); setBusy(false); });
      razor.open();
    } catch (err: any) {
      setError(err.message || "Checkout failed");
      setBusy(false);
    }
  }

  if (!items.length) return <main className="mx-auto max-w-3xl px-5 py-16"><h1 className="text-3xl font-bold">Your cart is empty</h1><Link href="/shop" style={{ color: "#171717" }} className="mt-6 inline-block font-semibold underline">Continue shopping</Link></main>;

  const field = (key: keyof Form, label: string, required = true, wide = false) => <label className={wide ? "sm:col-span-2" : ""}><span className="text-xs font-semibold uppercase tracking-wide text-black/55">{label}{required && <span className="text-red-600"> *</span>}</span><input type={key === "email" ? "email" : "text"} inputMode={key === "phone" || key === "postalCode" ? "numeric" : "text"} autoComplete={key} required={required} value={form[key]} onChange={e => setField(key, e.target.value)} aria-invalid={!!errors[key]} className={`mt-1 w-full rounded-xl border px-4 py-3 outline-none transition ${errors[key] ? "border-red-500 bg-red-50 focus:ring-2 focus:ring-red-200" : "border-black/15 bg-white focus:ring-2 focus:ring-black/10"}`} />{errors[key] && <span className="mt-1 block text-xs font-medium text-red-600">{errors[key]}</span>}{key === "phone" && <span className="mt-1 block text-xs text-black/45">10 digit mobile number</span>}{key === "postalCode" && <span className="mt-1 block text-xs text-black/45">6 digit PIN code</span>}</label>;
  const paymentCard = (method: "razorpay" | "cod", title: string, description: string) => <button type="button" onClick={() => setPaymentMethod(method)} aria-pressed={paymentMethod === method} className={`rounded-2xl border p-4 text-left transition ${paymentMethod === method ? "border-black bg-black/[.04] ring-2 ring-black/10" : "border-black/10 hover:border-black/30"}`}><div className="flex items-center justify-between gap-3"><span className="font-bold">{title}</span><span className={`flex h-5 w-5 items-center justify-center rounded-full border ${paymentMethod === method ? "border-black bg-black text-white" : "border-black/25"}`}>{paymentMethod === method && <span className="text-xs">✓</span>}</span></div><p className="mt-1 text-xs leading-5 text-black/50">{description}</p></button>;

  return <main className="min-h-screen bg-[var(--background)]"><Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive"/><header className="border-b border-[var(--border)] bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-5 sm:py-5 lg:px-8"><GjcLogo /><Link href="/cart" style={{ color: "#171717" }} className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold">← Cart</Link></div></header><section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-5 sm:py-10 lg:grid-cols-[1fr_320px] lg:px-8"><form onSubmit={submit} noValidate className="rounded-3xl border border-black/10 bg-white p-5 sm:p-8"><div><p className="text-xs font-bold uppercase tracking-[.25em] text-[var(--accent)]">Information</p><h1 className="mt-2 text-3xl font-bold">Checkout</h1><p className="mt-2 text-sm text-black/50">Enter your contact and delivery details.</p></div>{loggedIn && savedAddresses.length > 0 && <div className="mt-7 rounded-2xl border border-black/10 bg-black/[0.02] p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-bold">Saved addresses</p><p className="mt-1 text-xs text-black/50">Choose an address to fill the checkout form.</p></div><Link href="/account/addresses" className="text-xs font-bold underline">Manage addresses</Link></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{savedAddresses.map(a => <button key={a.id} type="button" onClick={() => useSavedAddress(a)} aria-pressed={selectedAddressId === a.id} className={`text-left rounded-xl border p-4 transition ${selectedAddressId === a.id ? "border-black bg-black/[0.04] ring-2 ring-black/10" : "border-black/10 bg-white hover:border-black/30"}`}><div className="flex items-center justify-between gap-2"><span className="font-bold">{a.label || "Address"}</span>{a.is_default && <span className="rounded-full bg-[#171717] px-2 py-1 text-[9px] font-bold text-white">DEFAULT</span>}</div><p className="mt-2 text-sm font-semibold">{a.recipient_name} · {a.phone}</p><p className="mt-1 text-xs leading-5 text-black/55">{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.postal_code}</p><span className="mt-3 inline-block text-xs font-bold underline">{selectedAddressId === a.id ? "Selected" : "Use this address"}</span></button>)}</div></div>}<div className="mt-7 grid gap-4 sm:grid-cols-2">{field("email", "Email address", true, false)}{field("phone", "Phone number", true, false)}{field("recipientName", "Full name", true, false)}{field("line1", "Address line 1", true, false)}{field("line2", "Address line 2", false, true)}{field("city", "City", true, false)}{field("state", "State", true, false)}{field("postalCode", "PIN code", true, false)}</div><div className="mt-8"><p className="text-xs font-bold uppercase tracking-[.25em] text-[var(--accent)]">Payment method</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{paymentCard("razorpay", "Online payment", "Pay securely with Razorpay using UPI, cards or supported payment methods.")}{paymentCard("cod", "Cash on Delivery", "Pay in cash when your order is delivered to your address.")}</div></div>{error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}<button type="submit" disabled={busy} style={{ color: "#fff", backgroundColor: "#171717" }} className="mt-7 min-h-14 w-full rounded-xl px-5 py-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50">{busy ? (paymentMethod === "cod" ? "Placing COD order…" : "Opening secure payment…") : (paymentMethod === "cod" ? `Place order · ₹${total.toLocaleString("en-IN")}` : `Continue to payment · ₹${total.toLocaleString("en-IN")}`)}</button><p className="mt-3 text-center text-xs text-black/45">{couponCode ? `${couponCode} applied · ₹${discount.toLocaleString("en-IN")} saved · ` : ""}{shipping > 0 ? `₹${shipping.toLocaleString("en-IN")} shipping · ` : "Free shipping · "}{paymentMethod === "cod" ? "Cash is payable on delivery. No online payment is required." : "Razorpay Test Mode — no real charge during development."}</p></form><aside className="h-fit rounded-2xl border border-black/10 bg-white p-5 sm:p-6 lg:sticky lg:top-6"><p className="text-xs font-bold uppercase tracking-[.25em] text-[var(--accent)]">Order summary</p>{items.map(i => <div key={i.variantId} className="mt-4 flex justify-between gap-4 text-sm"><span>{i.product.name} × {i.quantity}</span><span className="shrink-0">₹{(Number(i.variant.price) * Number(i.quantity)).toLocaleString("en-IN")}</span></div>)}<div className="mt-5 flex justify-between border-t pt-5 text-sm"><span>Subtotal</span><span>₹{subtotal.toLocaleString("en-IN")}</span></div>{discount > 0 && <div className="mt-3 flex justify-between text-sm text-green-700"><span>Coupon discount</span><span className="font-bold">−₹{discount.toLocaleString("en-IN")}</span></div>}<div className="mt-3 flex justify-between text-sm"><span>Shipping</span><span className={shipping === 0 ? "font-semibold text-green-700" : ""}>{shipping === 0 ? "FREE" : `₹${shipping.toLocaleString("en-IN")}`}</span></div>{shipping > 0 && <p className="mt-1 text-right text-[11px] text-black/40">Free shipping on orders ₹{freeShippingThreshold.toLocaleString("en-IN")}+</p>}<div className="mt-4 flex justify-between border-t pt-4 font-bold"><span>Total</span><span>₹{total.toLocaleString("en-IN")}</span></div><p className="mt-3 text-xs leading-5 text-black/50">Coupons apply to merchandise only and never reduce shipping charges.</p><Link href="/cart" style={{ color: "#171717", backgroundColor: "#fff" }} className="mt-5 flex min-h-12 w-full items-center justify-center rounded-xl border border-black/15 px-4 py-3 text-sm font-semibold">Edit cart</Link></aside></section></main>;
}
