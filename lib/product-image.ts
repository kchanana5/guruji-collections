export function productImageUrl(supabase: any, path?: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}
