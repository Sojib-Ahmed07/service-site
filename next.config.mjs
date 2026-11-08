// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Photos are plain <img> tags (components/ui/photo.jsx), so this list only matters if next/image is used later.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default nextConfig;
