"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function WishlistButton({ productId }: { productId: string }) {
 const [saved,setSaved]=useState(false); const [busy,setBusy]=useState(false); const [signedIn,setSignedIn]=useState(false);
 useEffect(()=>{const s=createClient(); (async()=>{const {data:{user}}=await s.auth.getUser(); if(!user)return; setSignedIn(true); const {data}=await s.from("wishlists").select("id").eq("user_id",user.id).eq("product_id",productId).maybeSingle(); setSaved(Boolean(data));})();},[productId]);
 async function toggle(){if(!signedIn){window.location.href=`/account/login?next=${encodeURIComponent(window.location.pathname)}`;return;} setBusy(true); const s=createClient(); const {data:{user}}=await s.auth.getUser(); if(!user){setBusy(false);return;} if(saved){const {error}=await s.from("wishlists").delete().eq("user_id",user.id).eq("product_id",productId);if(!error)setSaved(false);}else{const {error}=await s.from("wishlists").insert({user_id:user.id,product_id:productId});if(!error)setSaved(true);}setBusy(false);}
 const savedStyle=saved?{color:"#fff",backgroundColor:"#171717",borderColor:"#171717"}:{color:"#171717",backgroundColor:"#fff",borderColor:"rgba(0,0,0,.15)"};
 return <button type="button" onClick={toggle} disabled={busy} aria-label={saved?"Remove from wishlist":"Add to wishlist"} aria-pressed={saved} style={savedStyle} className="inline-flex min-h-12 w-full shrink-0 items-center justify-center whitespace-nowrap rounded-xl border px-5 py-3 text-sm font-bold transition hover:opacity-90 disabled:cursor-wait disabled:opacity-50 sm:w-auto">{saved?"♥ Saved":"♡ Wishlist"}</button>;
}
