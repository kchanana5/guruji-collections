"use client";

import { useState } from "react";

type GalleryImage = { id: string; url: string | null; alt: string };

export default function ProductGallery({ images, productName }: { images: GalleryImage[]; productName: string }) {
  const usable = images.filter(image => image.url);
  const [active, setActive] = useState(0);
  const current = usable[active] || usable[0];

  if (!current) return <div className="aspect-square w-full rounded-3xl bg-stone-100" />;

  return (
    <div className="grid gap-3 sm:grid-cols-[76px_minmax(0,1fr)] lg:grid-cols-[88px_minmax(0,1fr)]">
      <div className="order-2 flex gap-2 overflow-x-auto sm:order-1 sm:flex-col sm:overflow-visible">
        {usable.map((image, index) => (
          <button key={image.id} type="button" onClick={() => setActive(index)} aria-label={`View image ${index + 1}`} className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-stone-100 transition sm:h-[72px] sm:w-[72px] ${index === active ? "border-black ring-1 ring-black" : "border-black/10 hover:border-black/30"}`}>
            <img src={image.url || ""} alt={image.alt} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      <div className="order-1 overflow-hidden rounded-3xl bg-stone-100 sm:order-2">
        <div className="aspect-square w-full">
          <img src={current.url || ""} alt={current.alt || productName} className="h-full w-full object-contain" />
        </div>
      </div>
    </div>
  );
}
