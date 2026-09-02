"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function VehicleGallery({
  images,
  alt,
}: {
  images: { url: string; alt: string | null }[];
  alt: string;
}) {
  const gallery = images.length
    ? images
    : [{ url: "/images/vehicle-placeholder.svg", alt: null }];
  const [active, setActive] = useState(0);
  const current = gallery[Math.min(active, gallery.length - 1)];

  return (
    <div>
      <div className="relative aspect-[16/10] overflow-hidden rounded-[var(--radius-card)] bg-navy-50">
        <Image
          src={current.url}
          alt={current.alt ?? alt}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="object-cover"
        />
      </div>

      {gallery.length > 1 ? (
        <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5">
          {gallery.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Photo ${index + 1}`}
              aria-current={index === active}
              className={cn(
                "relative aspect-[4/3] overflow-hidden rounded-lg bg-navy-50 ring-2 transition-all",
                index === active
                  ? "ring-teal-500"
                  : "ring-transparent hover:ring-navy-200",
              )}
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="120px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
