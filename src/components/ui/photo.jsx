// src/components/ui/photo.jsx
"use client";

import { useState } from "react";
import { optimisedImage } from "@/lib/files";
import { cn } from "@/lib/utils";

/**
 * Service photography. Pass an Unsplash photo id, an uploaded (Cloudinary) image or any full https:// URL.
 * If the image fails to load, a neutral block keeps the layout intact.
 */
export function Photo({ src, alt = "", className, sizes = 800, priority = false }) {
  const [failed, setFailed] = useState(false);
  const url = !src
    ? null
    : src.startsWith("http")
      ? optimisedImage(src, sizes) // uploaded (Cloudinary) photos get the right size + format; others unchanged
      : `https://images.unsplash.com/${src}?auto=format&fit=crop&w=${sizes}&q=75`;
  return (
    <div className={cn("relative overflow-hidden bg-ink-100", className)}>
      {url && !failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover"
        />
      )}
    </div>
  );
}