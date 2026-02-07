/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "www.bvwater.co.uk",
      },
      {
        protocol: "https",
        hostname: "plantbasedwithamy.com",
      },
      {
        protocol: "https",
        hostname: "cdn.the-scientist.com",
      },
    ],
  },
};

export default nextConfig;
