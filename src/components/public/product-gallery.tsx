"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";

type ProductImage = { url: string; is_primary: boolean; position: number };

export function ProductGallery({ images, productName }: { images: ProductImage[]; productName: string }) {
  const { locale } = useLocale();
  const [selected, setSelected] = useState(0);
  const labels = locale === "en"
    ? { previous: "Previous image", next: "Next image", select: "Select image" }
    : { previous: "Image précédente", next: "Image suivante", select: "Sélectionner l’image" };
  if (!images.length) return <div className="product-detail-gallery"><div className="grid size-full place-items-center text-[var(--muted)]">Image indisponible</div></div>;
  const active = images[Math.min(selected, images.length - 1)];
  const move = (delta: number) => setSelected((index) => (index + delta + images.length) % images.length);
  return <div className="flex min-w-0 flex-col gap-3"><div className="product-detail-gallery relative"><img src={active.url} alt={`${productName} — ${selected + 1}`} className="product-detail-image" />{images.length > 1 ? <><button type="button" aria-label={labels.previous} className="absolute left-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow" onClick={() => move(-1)}><ChevronLeft size={18} /></button><button type="button" aria-label={labels.next} className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow" onClick={() => move(1)}><ChevronRight size={18} /></button></> : null}</div>{images.length > 1 ? <div className="flex max-w-full gap-3 overflow-x-auto pb-1" role="list">{images.map((image, index) => <button key={`${image.url}-${index}`} type="button" role="listitem" aria-label={`${labels.select} ${index + 1}`} aria-current={index === selected ? "true" : undefined} aria-pressed={index === selected} className={`size-[76px] shrink-0 overflow-hidden rounded-lg border-2 bg-white p-1 sm:size-[88px] lg:size-[100px] ${index === selected ? "border-[var(--accent)]" : "border-[var(--line)]"}`} onClick={() => setSelected(index)} onKeyDown={(event) => { if (event.key === "ArrowRight") { event.preventDefault(); move(1); } if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); } }}><img src={image.url} alt="" className="size-full object-contain" /></button>)}</div> : null}</div>;
}
