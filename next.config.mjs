/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Add your image hosts here (Cloudinary, UploadThing, S3, Vercel Blob…) when you add real photos.
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
