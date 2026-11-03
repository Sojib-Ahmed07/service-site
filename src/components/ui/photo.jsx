"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Service photography. Pass an Unsplash photo id (or any full URL from your CMS).
 * If the image fails to load, a neutral block keeps the layout intact.
 */
export function Photo({ src, alt = "", className, sizes = 800, priority = false }) {
  const [failed, setFailed] = useState(false);
  const url = !src
    ? null
    : src.startsWith("http")
      ? src
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
